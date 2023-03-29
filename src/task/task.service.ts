import { Injectable, Logger } from '@nestjs/common';
import {
  camelCase,
  filter,
  get,
  isEmpty,
  keyBy,
  mapKeys,
  mapValues,
  template,
} from 'lodash';
import {
  BaseTask,
  TaskLog,
  TaskResult,
  TaskStatus,
  TaskType,
} from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { FilterOperator, TriggerTaskConfig } from './type/trigger.type';
import { TaskEntity } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import { ProcessTaskInput, TaskLogDetail } from './task.dto';
import { GeneralTypeEnum } from '../substrate/substrate.data';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ulid } from 'ulid';
import { EventData } from '../event/event.type';
import { EmailTaskConfig, EmailTaskInput } from './type/email.type';
import {
  TelegramTaskConfig,
  TelegramTaskError,
  TelegramTaskInput,
} from './type/telegram.type';
import { WebhookTaskConfig } from './type/webhook.type';
import { EventEntity } from '../event/event.entity';
import { EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';

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
    private readonly eventService: EventService,
  ) {}

  async createTask(input: Partial<TaskEntity>): Promise<string> {
    const result = await this.taskRepository.save({ ...input, id: ulid() });
    return result.id;
  }

  async createTaskLogs(input: Partial<TaskLog>[]) {
    return await this.taskLogRepository.save(input);
  }

  async updateTaskLogStatus(id: string, status: TaskStatus) {
    return await this.taskLogRepository.update(
      { id },
      { status, startedAt: new Date() },
    );
  }

  async finishTaskLog(
    id: string,
    { status, output }: Pick<TaskLogEntity, 'status' | 'output'>,
  ) {
    await this.taskLogRepository.update(
      { id },
      { status, output, finishedAt: new Date() },
    );
  }

  async skipPendingTaskLogs(workflowLogId: string) {
    await this.taskLogRepository.update(
      { workflowLogId, status: TaskStatus.PENDING },
      { status: TaskStatus.SKIPPED, finishedAt: new Date() },
    );
  }

  getTasks(workflowId: string) {
    return this.taskRepository.find({
      where: { workflowId },
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
    eventRawData: EventRawData,
  ): TaskResult {
    if (isEmpty(config.conditions)) {
      return {
        input: eventRawData,
        success: true,
        output: {
          match: true,
        },
      };
    }

    try {
      const match = config.conditions.some((conditionList) =>
        conditionList.every((condition) => {
          const actualValue = get(eventRawData, condition.variable);
          return this.isMatchCondition(
            condition.operator,
            actualValue,
            condition.value,
          );
        }),
      );

      return {
        input: eventRawData,
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

  async getTaskLogs(workflowLogId: string): Promise<TaskLogDetail[]> {
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

  private async notifyWebhook(
    { url, headers }: WebhookTaskConfig,
    message: any,
  ) {
    await this.httpService.axiosRef.post(url, message, {
      headers: {
        Accept: 'application/json',
        ...this.parseHeaders(headers),
      },
    });
  }

  private buildCustomMessage(messageTemplate: string, eventData: EventData) {
    const compiled = template(messageTemplate);
    return compiled(eventData);
  }

  private buildMessageContext(eventData: EventData, variables: string[]) {
    const context = mapValues(keyBy(variables), (val) => get(eventData, val));
    return mapKeys(context, (_, key) => camelCase(key));
  }

  private buildNotificationEmailInput(
    { subjectTemplate, bodyTemplate }: EmailTaskConfig,
    eventData: EventData,
  ): EmailTaskInput {
    const subject = this.buildCustomMessage(subjectTemplate, eventData);
    const body = this.buildCustomMessage(bodyTemplate, eventData);

    return {
      subject,
      body,
    };
  }

  private async notifyEmail(
    { addresses }: EmailTaskConfig,
    { body, subject }: EmailTaskInput,
  ) {
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
    { messageTemplate }: TelegramTaskConfig,
    eventData: EventData,
  ): TelegramTaskInput {
    return {
      message: this.buildCustomMessage(messageTemplate, eventData),
    };
  }

  private async notifyTelegram(
    { chatId }: TelegramTaskConfig,
    { message }: TelegramTaskInput,
  ) {
    await this.bot.telegram.sendMessage(chatId, message, {
      parse_mode: 'HTML',
    });
  }

  private async telegramChatIdExists(chatId: string) {
    try {
      await this.bot.telegram.getChat(chatId);
    } catch (error) {
      if (error.response.error_code === 400) {
        throw new TelegramTaskError('Chat not found');
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
