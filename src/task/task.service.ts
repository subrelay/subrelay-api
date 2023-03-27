import { Injectable, Logger } from '@nestjs/common';
import {
  camelCase,
  get,
  isEmpty,
  keyBy,
  mapKeys,
  mapValues,
  replace,
} from 'lodash';
import {
  BaseTask,
  ProcessStatus,
  TaskLog,
  TaskResult,
  TaskType,
} from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { FilterOperator, TriggerTaskConfig } from './type/trigger.type';
import { TaskEntity } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import {
  CustomMessageInput,
  ProcessTaskInput,
  TaskLogDetail,
} from './task.dto';
import { GeneralTypeEnum } from '../substrate/substrate.data';
import {
  EmailConfig,
  NotificationTaskConfig,
  NotificationEmailInput,
  TelegramConfig,
  WebhookConfig,
  NotificationTelegramInput,
  TelegramError,
} from './type/notification.type';
import { MailerService } from '@nestjs-modules/mailer';
import { compile } from 'pug';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,

    @InjectRepository(TaskLogEntity)
    private taskLogRepository: Repository<TaskLogEntity>,

    @InjectBot()
    private bot: Telegraf,

    private readonly httpService: HttpService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async createTask(input: Partial<TaskEntity>): Promise<number> {
    const result = await this.taskRepository.save(input);
    return result.id;
  }

  async createTaskLogs(input: Partial<TaskLog>[]) {
    return await this.taskLogRepository.save(input);
  }

  async updateTaskLogStatus(id: number, status: ProcessStatus) {
    return await this.taskLogRepository.update(
      { id },
      { status, startedAt: new Date() },
    );
  }

  async finishTaskLog(
    id: number,
    data: Pick<TaskLogEntity, 'status' | 'output'>,
  ) {
    await this.taskLogRepository.update(
      { id },
      { ...data, finishedAt: new Date() },
    );
  }

  async skipPendingTaskLogs(workflowLogId: number) {
    await this.taskLogRepository.update(
      { workflowLogId, status: ProcessStatus.PENDING },
      { status: ProcessStatus.SKIPPED, finishedAt: new Date() },
    );
  }

  getTasks(workflowVersionId: number) {
    return this.taskRepository.find({
      where: { workflowVersionId },
      order: { dependOn: { direction: 'ASC', nulls: 'FIRST' } },
    });
  }

  async processTask(task: BaseTask, input: ProcessTaskInput): Promise<TaskLog> {
    const startedAt = new Date();
    let result;

    try {
      if (task.isNotificationTask()) {
        result = await this.processNotificationTask(
          new NotificationTaskConfig(task.getNotificationTaskConfig()),
          input,
        );
      } else if (task.isTriggerTask()) {
        result = await this.processTriggerTask(
          new TriggerTaskConfig(task.getTriggerConfig()),
          input,
        );
      } else {
        result = {
          input,
          success: false,
          error: {
            message: `Unsupported type: ${task.type}`,
          },
        };
      }

      return {
        ...result,
        startedAt,
        finishedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Failed to process task: ${JSON.stringify(error)}`);
      return {
        input,
        success: false,
        error: {
          message: error.message,
        },
        startedAt,
        finishedAt: new Date(),
      };
    }
  }

  getTriggerTasks(workflowVersionIds: number[], eventIds: number[]) {
    return this.taskRepository
      .createQueryBuilder('t')
      .where({ type: TaskType.TRIGGER })
      .andWhereInIds(workflowVersionIds)
      .andWhere(`config ->> 'eventId' IN (:eventIds)`, eventIds)
      .getMany();
  }

  getOperatorMapping(): {
    [key: string]: FilterOperator[];
  } {
    return {
      [GeneralTypeEnum.BOOL]: [FilterOperator.IS_FALSE, FilterOperator.IS_TRUE],
      [GeneralTypeEnum.STRING]: [FilterOperator.EQUAL, FilterOperator.CONTAINS],
      [GeneralTypeEnum.NUMBER]: [
        FilterOperator.EQUAL,
        FilterOperator.GREATER_THAN,
        FilterOperator.GREATER_THAN_EQUAL,
        FilterOperator.LESS_THAN,
        FilterOperator.LESS_THAN_EQUAL,
      ],
    };
  }

  private processTriggerTask(
    config: TriggerTaskConfig,
    { eventData }: ProcessTaskInput,
  ): TaskResult {
    if (isEmpty(config.conditions)) {
      return {
        input: eventData,
        success: true,
        output: {
          match: true,
        },
      };
    }

    try {
      const match = config.conditions.some((conditionList) =>
        conditionList.every((condition) => {
          const actualValue = get(eventData, condition.variable);
          return this.isMatchCondition(
            condition.operator,
            actualValue,
            condition.value,
          );
        }),
      );

      return {
        input: eventData,
        success: true,
        output: {
          match,
        },
      };
    } catch (error) {
      return {
        input: eventData,
        success: false,
        error: {
          message: error.message,
        },
      };
    }
  }

  private async processNotificationTask(
    config: NotificationTaskConfig,
    input: ProcessTaskInput,
  ): Promise<TaskResult> {
    try {
      const customMessageInput = new CustomMessageInput(input);

      if (config.isWebhookChannel()) {
        await this.notifyWebhook(config.getWebhookConfig(), customMessageInput);
        return {
          input: customMessageInput,
          success: true,
        };
      }

      if (config.isEmailChannel()) {
        const input = this.buildNotificationEmailInput(
          config.getEmailConfig(),
          customMessageInput,
        );

        await this.notifyEmail(input);

        return {
          input: input,
          success: true,
        };
      }

      if (config.isTelegramChannel()) {
        const telegramConfig = config.getTelegramConfig();
        await this.telegramChatIdExists(telegramConfig.chatId);

        const input = this.buildNotificationTelegramInput(
          telegramConfig,
          customMessageInput,
        );

        console.log({ input });

        await this.notifyTelegram(input);

        return {
          input: input,
          success: true,
        };
      }
    } catch (error) {
      this.logger.error('Failed to process notification task', error);
      return {
        input,
        success: false,
        error: {
          message: error.message,
        },
      };
    }
  }

  async getTaskLogs(workflowLogId: number): Promise<TaskLogDetail[]> {
    const taskLogs = await this.taskLogRepository.find({
      where: { workflowLogId },
      relations: {
        task: true,
      },
    });

    return taskLogs;
  }

  private parseHeaders(headers: { key: string; value: string }[]): {
    [key: string]: string;
  } {
    return mapValues(keyBy(headers, 'key'), (header) => header.value);
  }

  private async notifyWebhook({ url, headers }: WebhookConfig, message: any) {
    await this.httpService.axiosRef.post(url, message, {
      headers: {
        Accept: 'application/json',
        ...this.parseHeaders(headers),
      },
    });
  }

  private buildCustomMessage(template: string, context: object) {
    const replacedTemplate = replace(
      `p ${template}`,
      /#{[a-zA-Z0-9]+\.[a-zA-Z0-9]+(\.[a-zA-Z0-9]+)*}/g,
      (val) => `#{${camelCase(val)}}`,
    );

    const renderContent = compile(replacedTemplate);
    const message = renderContent(context);
    return message.substring(
      message.indexOf('>') + 1,
      message.lastIndexOf('<'),
    );
  }

  private buildMessageContext(input: CustomMessageInput, variables: string[]) {
    const context = mapValues(keyBy(variables), (val) => get(input, val));
    return mapKeys(context, (_, key) => camelCase(key));
  }

  private buildNotificationEmailInput(
    { addresses, subjectTemplate, bodyTemplate, variables }: EmailConfig,
    input: CustomMessageInput,
  ): NotificationEmailInput {
    const context = this.buildMessageContext(input, variables);
    const subject = this.buildCustomMessage(subjectTemplate, context);
    const body = this.buildCustomMessage(bodyTemplate, context);

    return {
      addresses,
      subject,
      body,
    };
  }

  private async notifyEmail({
    addresses,
    body,
    subject,
  }: NotificationEmailInput) {
    await this.mailerService.sendMail({
      from: `SubRelay Notifications ${this.configService.get('EMAIL_SENDER')}`,
      to: addresses,
      subject,
      html: body,
    });

    return {
      addresses,
      subject,
      body,
    };
  }

  private buildNotificationTelegramInput(
    { chatId, messageTemplate, variables }: TelegramConfig,
    input: CustomMessageInput,
  ): NotificationTelegramInput {
    const context = this.buildMessageContext(input, variables);

    return {
      message: this.buildCustomMessage(messageTemplate, context),
      chatId,
    };
  }

  private async notifyTelegram({ chatId, message }: NotificationTelegramInput) {
    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
  }

  private async telegramChatIdExists(chatId: string) {
    try {
      await this.bot.telegram.getChat(chatId);
    } catch (error) {
      if (error.response.error_code === 400) {
        throw new TelegramError('Chat not found');
      }

      this.logger.debug(
        'Failed to check telegram chatId:',
        JSON.stringify(error),
      );
      throw new Error('Failed to check chat ID');
    }
  }

  private isMatchCondition(
    operator: FilterOperator,
    acctualValue: any,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case FilterOperator.IS_TRUE:
        return acctualValue === true;
      case FilterOperator.IS_FALSE:
        return acctualValue === false;
      case FilterOperator.CONTAINS:
        return (acctualValue as string)
          .toLowerCase()
          .includes((expectedValue as string).toLowerCase());
      case FilterOperator.GREATER_THAN:
        return (acctualValue as number) > (expectedValue as number);
      case FilterOperator.GREATER_THAN_EQUAL:
        return (acctualValue as number) >= (expectedValue as number);
      case FilterOperator.LESS_THAN:
        return (acctualValue as number) < (expectedValue as number);
      case FilterOperator.LESS_THAN_EQUAL:
        return (acctualValue as number) <= (expectedValue as number);
      case FilterOperator.EQUAL:
        return acctualValue == expectedValue;
      default:
        return false;
    }
  }
}
