import { Injectable, Logger } from '@nestjs/common';
import { get, isEmpty, keyBy, mapValues, pick, template } from 'lodash';
import {
  BaseTask,
  TaskLog,
  TaskResult,
  TaskStatus,
  TaskType,
  TaskValidationError,
} from './type/task.type';
import { HttpService } from '@nestjs/axios';
import { TaskEntity } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import { ProcessTaskInput } from './task.dto';
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
import { EventRawData } from '../common/queue.type';
import { EventService } from '../event/event.service';
import { WorkflowSummary } from '../workflow/workflow.type';
import { FilterTaskConfig, FilterVariableOperator } from './type/filter.type';

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
      switch (task.type) {
        case TaskType.FILTER:
          result = await this.processFilterTask(
            new FilterTaskConfig(task.getFilterTaskConfig()),
            input.eventRawData,
          );
          break;
        case TaskType.EMAIL:
          result = await this.processEmailTask(
            new EmailTaskConfig(task.getEmailTaskConfig()),
            input,
          );
          break;
        case TaskType.TELEGRAM:
          result = await this.processTelegramTask(
            new TelegramTaskConfig(task.getTelegramTaskConfig()),
            input,
          );
          break;
        case TaskType.WEBHOOK:
          result = await this.processWebhookTask(
            new WebhookTaskConfig(task.getWebhookTaskConfig()),
            input,
          );
          break;

        default:
          throw new TaskValidationError(`Unsupported type: ${task.type}`);
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

  getFilterTasks(workflowVersionIds: number[], eventIds: number[]) {
    return this.taskRepository
      .createQueryBuilder('t')
      .where({ type: TaskType.FILTER })
      .andWhereInIds(workflowVersionIds)
      .andWhere(`config ->> 'eventId' IN (:eventIds)`, eventIds)
      .getMany();
  }

  getOperatorMapping(): {
    [key: string]: FilterVariableOperator[];
  } {
    return {
      [GeneralTypeEnum.BOOL]: [
        FilterVariableOperator.IS_FALSE,
        FilterVariableOperator.IS_TRUE,
      ],
      [GeneralTypeEnum.STRING]: [
        FilterVariableOperator.EQUAL,
        FilterVariableOperator.CONTAINS,
      ],
      [GeneralTypeEnum.NUMBER]: [
        FilterVariableOperator.EQUAL,
        FilterVariableOperator.GREATER_THAN,
        FilterVariableOperator.GREATER_THAN_EQUAL,
        FilterVariableOperator.LESS_THAN,
        FilterVariableOperator.LESS_THAN_EQUAL,
      ],
    };
  }

  private processFilterTask(
    config: FilterTaskConfig,
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
        input: eventRawData,
        success: false,
        error: {
          message: error.message,
        },
      };
    }
  }

  async getTaskLogs(workflowLogId: string): Promise<TaskLogEntity[]> {
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

  private async processWebhookTask(
    { url, headers }: WebhookTaskConfig,
    input: {
      eventRawData: EventRawData;
      workflow: WorkflowSummary;
    },
  ) {
    const data = this.getWebhookTaskInput(input);

    await this.httpService.axiosRef.post(url, data, {
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

  private getEmailTaskInput(
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

  private getWebhookTaskInput({
    eventRawData,
    workflow,
  }: {
    eventRawData: EventRawData;
    workflow: WorkflowSummary;
  }) {
    const eventData = this.eventService.getEventData(
      workflow.event,
      eventRawData,
    );

    return {
      ...eventData,
      workflow: pick(workflow, ['id', 'name']),
      chain: workflow.chain,
    };
  }

  private async processEmailTask(
    config: EmailTaskConfig,
    {
      eventRawData,
      workflow,
    }: { eventRawData: EventRawData; workflow: WorkflowSummary },
  ) {
    const eventData = this.eventService.getEventData(
      workflow.event,
      eventRawData,
    );
    const { subject, body } = this.getEmailTaskInput(config, eventData);

    const now = Date.now();
    await this.mailerService.sendMail({
      from: `SubRelay Notifications ${this.configService.get('EMAIL_SENDER')}`,
      to: config.addresses,
      subject,
      html: body,
    });

    this.logger.debug(`[Email Task] Took ${Date.now() - now} ms to send email`);

    return {
      subject,
      body,
    };
  }

  private getTelegramTaskInput(
    { messageTemplate }: TelegramTaskConfig,
    eventData: EventData,
  ): TelegramTaskInput {
    return {
      message: this.buildCustomMessage(messageTemplate, eventData),
    };
  }

  private async processTelegramTask(
    config: TelegramTaskConfig,
    {
      eventRawData,
      workflow,
    }: { eventRawData: EventRawData; workflow: WorkflowSummary },
  ) {
    const eventData = this.eventService.getEventData(
      workflow.event,
      eventRawData,
    );
    const { message } = this.getTelegramTaskInput(config, eventData);

    await this.bot.telegram.sendMessage(config.chatId, message, {
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
    operator: FilterVariableOperator,
    acctualValue: any,
    expectedValue: any,
  ): boolean {
    switch (operator) {
      case FilterVariableOperator.IS_TRUE:
        return acctualValue === true;
      case FilterVariableOperator.IS_FALSE:
        return acctualValue === false;
      case FilterVariableOperator.CONTAINS:
        return (acctualValue as string)
          .toLowerCase()
          .includes((expectedValue as string).toLowerCase());
      case FilterVariableOperator.GREATER_THAN:
        return (acctualValue as number) > (expectedValue as number);
      case FilterVariableOperator.GREATER_THAN_EQUAL:
        return (acctualValue as number) >= (expectedValue as number);
      case FilterVariableOperator.LESS_THAN:
        return (acctualValue as number) < (expectedValue as number);
      case FilterVariableOperator.LESS_THAN_EQUAL:
        return (acctualValue as number) <= (expectedValue as number);
      case FilterVariableOperator.EQUAL:
        return acctualValue == expectedValue;
      default:
        return false;
    }
  }
}
