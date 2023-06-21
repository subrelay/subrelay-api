import { Injectable, Logger } from '@nestjs/common';
import { findIndex, get, map, omit, template, upperFirst } from 'lodash';
import {
  BaseTask,
  ProcessTaskInput,
  TaskLog,
  TaskResult,
  TaskStatus,
  TaskType,
  TaskValidationError,
} from './type/task.type';
import { TaskEntity } from './entity/task.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskLogEntity } from './entity/task-log.entity';
import { GeneralTypeEnum } from '../substrate/substrate.type';
import { ulid } from 'ulid';
import { EmailTaskConfig, EmailTaskInput } from './type/email.type';
import { TelegramTaskConfig, TelegramTaskInput } from './type/telegram.type';
import { WebhookTaskConfig } from './type/webhook.type';
import { EventService } from '../event/event.service';
import { FilterTaskConfig, FilterVariableOperator } from './type/filter.type';
import { DiscordTaskConfig, DiscordTaskInput } from './type/discord.type';
import { DataField } from '../event/event.dto';
import { DiscordService } from '../discord/discord.service';
import { TelegramService } from '../telegram/telegram.service';
import { EmailService } from '../email/email.service';
import { WebhookService } from '../webhook/webhook.service';
import { Event } from '../event/event.type';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,

    @InjectRepository(TaskLogEntity)
    private taskLogRepository: Repository<TaskLogEntity>,

    private readonly discordService: DiscordService,
    private readonly telegramService: TelegramService,

    private readonly webhookService: WebhookService,
    private readonly emailService: EmailService,
    private readonly eventService: EventService,
  ) {}

  async createTaskLogs(input: Partial<TaskLog>[]) {
    await this.taskLogRepository.save(input);
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

  async getTasks(workflowId: string, protect = true) {
    const tasks = await this.taskRepository.find({
      where: { workflowId },
      order: { dependOn: { direction: 'ASC', nulls: 'FIRST' } },
    });

    if (protect) {
      const webhookTaskIndex = findIndex(tasks, { type: TaskType.WEBHOOK });
      if (webhookTaskIndex >= 0) {
        const config = new WebhookTaskConfig(tasks[webhookTaskIndex].config);
        config.secret = null;
        tasks[webhookTaskIndex].config = config;
      }
    }

    return tasks;
  }

  async processTask(task: BaseTask, input: ProcessTaskInput): Promise<TaskLog> {
    const startedAt = new Date();
    let result;

    try {
      switch (task.type) {
        case TaskType.TRIGGER:
          result = {
            status: TaskStatus.SUCCESS,
          };
          break;
        case TaskType.FILTER:
          result = await this.processFilterTask(
            new FilterTaskConfig(task.getFilterTaskConfig()),
            input,
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
        case TaskType.DISCORD:
          result = await this.processDiscordTask(
            new DiscordTaskConfig(task.getDiscordTaskConfig()),
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
        status: TaskStatus.FAILED,
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

  getFilterFields(event: Event): DataField[] {
    const eventDataFields = this.eventService.getEventDataFields(event);
    const eventStatusFields = this.eventService.getEventStatusFields();
    return [
      ...map([...eventDataFields, ...eventStatusFields], (field) => ({
        ...field,
        name: `event.${field.name}`,
        description: upperFirst(field.description),
      })),
    ];
  }

  getCustomMessageFields(event: Event): DataField[] {
    const eventDataFields = this.eventService.getEventDataFields(event);
    const eventStatusFields = this.eventService.getEventStatusFields();
    const eventInfoFields = this.eventService.getEventInfoFields(event);
    const eventExtraFields = this.eventService.getEventExtraFields();

    return [
      {
        name: 'workflow.id',
        description: 'The workflow ID',
        type: GeneralTypeEnum.STRING,
        data: ulid(),
        display: 'Workflow ID',
      },
      {
        name: 'workflow.name',
        description: 'The workflow name',
        type: GeneralTypeEnum.STRING,
        data: `Workflow for event ${event.name}`,
        display: 'Workflow Name',
      },
      {
        name: 'chain.name',
        description: 'The chain name',
        type: GeneralTypeEnum.STRING,
        data: event.chain.name,
        display: 'Chain Name',
      },
      ...map(
        [
          ...eventDataFields,
          ...eventStatusFields,
          ...eventInfoFields,
          ...eventExtraFields,
        ],
        (field) => ({
          ...field,
          name: `event.${field.name}`,
        }),
      ),
    ];
  }

  processFilterTask(
    config: FilterTaskConfig,
    input: { event: ProcessTaskInput['event'] },
  ): TaskResult {
    try {
      if (config.conditions.length === 0) {
        return {
          input,
          status: TaskStatus.SUCCESS,
          output: {
            match: true,
          },
        };
      }

      const match = config.conditions.some((conditionList) =>
        conditionList.every((condition) => {
          const actualValue = get(input, condition.variable);
          return this.isMatchCondition(
            condition.operator,
            actualValue,
            condition.value,
          );
        }),
      );

      return {
        input: input,
        status: TaskStatus.SUCCESS,
        output: {
          match,
        },
      };
    } catch (error) {
      return {
        input: input,
        status: TaskStatus.FAILED,
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

  async processWebhookTask(
    { url, secret, encrypted }: WebhookTaskConfig,
    input: ProcessTaskInput,
  ) {
    let signatureHeader;
    const errorMessage = 'Failed to process webhook task.';
    const message = omit(input, 'user');
    const failedResult = {
      input: message,
      status: TaskStatus.FAILED,
      error: {
        message: errorMessage,
      },
    };

    try {
      signatureHeader = this.webhookService.generateSignatureHeader(
        secret,
        encrypted,
        message,
      );
    } catch (error) {
      this.logger.error(
        '[Webhook] Failed to generate webhook signature',
        error,
      );

      return failedResult;
    }

    try {
      await this.webhookService.sendMessage(url, message, signatureHeader);

      return {
        input: message,
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      this.logger.error('[Webhook] Failed to send data to webhook', error);
      if (error?.response?.status === 404) {
        failedResult.error.message = 'Webhook URL does not exist.';
      } else if (error?.response?.status) {
        failedResult.error.message = `Sending request to webhook URL failed with status code ${error.response.status}.`;
      } else {
        failedResult.error.message = error?.message;
      }

      return failedResult;
    }
  }

  buildCustomMessage(messageTemplate: string, data: ProcessTaskInput) {
    const compiled = template(messageTemplate);
    return compiled(data);
  }

  private getEmailTaskInput(
    { subjectTemplate, bodyTemplate }: EmailTaskConfig,
    input: ProcessTaskInput,
  ): EmailTaskInput {
    const subject = this.buildCustomMessage(subjectTemplate, input);
    const body = this.buildCustomMessage(bodyTemplate, input);

    return {
      subject,
      body,
    };
  }

  private async processEmailTask(
    config: EmailTaskConfig,
    input: ProcessTaskInput,
  ) {
    const { subject, body } = this.getEmailTaskInput(config, input);
    const taskInput = { subject, body };

    try {
      const now = Date.now();
      await this.emailService.sendEmails(config.addresses, subject, body);

      this.logger.debug(`[Email] Took ${Date.now() - now} ms to send email`);

      return {
        input: taskInput,
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      this.logger.error('[Email] Failed to process email task', error);
      return {
        input: taskInput,
        status: TaskStatus.FAILED,
        error: {
          message: error.message || 'Failed to process email task.',
        },
      };
    }
  }

  private getTelegramTaskInput(
    { messageTemplate }: TelegramTaskConfig,
    input: ProcessTaskInput,
  ): TelegramTaskInput {
    return {
      message: this.buildCustomMessage(messageTemplate, input),
    };
  }

  private getDiscordTaskInput(
    { messageTemplate }: DiscordTaskConfig,
    input: ProcessTaskInput,
  ): DiscordTaskInput {
    return {
      message: this.buildCustomMessage(messageTemplate, input),
    };
  }

  private async processTelegramTask(
    config: TelegramTaskConfig,
    input: ProcessTaskInput,
  ) {
    const { message } = this.getTelegramTaskInput(config, input);
    const chatId = input.user?.integration?.telegram?.id;

    if (!chatId) {
      return {
        input: { message },
        status: TaskStatus.FAILED,
        error: {
          message: "Telegram integration does't set up yet.",
        },
      };
    }

    try {
      await this.telegramService.sendDirectMessage(chatId, message);

      return {
        input: { message },
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      this.logger.error('[Telegram] Failed to process telegram task', error);
      return {
        input: { message },
        status: TaskStatus.FAILED,
        error: {
          message: error.message || 'Failed to process telegram task.',
        },
      };
    }
  }

  private async processDiscordTask(
    config: DiscordTaskConfig,
    input: ProcessTaskInput,
  ) {
    const { message } = this.getDiscordTaskInput(config, input);
    const chatId = input.user?.integration?.discord?.id;
    if (!chatId) {
      return {
        input: { message },
        status: TaskStatus.FAILED,
        error: {
          message: "Discord integration does't set up yet.",
        },
      };
    }
    try {
      await this.discordService.sendDirectMessage(chatId, message);

      return {
        input: { message },
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      let errorMessage = error.message || 'Failed to process discord task.';
      if (error.message === 'Invalid Recipient(s)') {
        errorMessage = 'User not found';
      }

      this.logger.error('[Discord] Failed to process discord task', error);

      return {
        input: { message },
        status: TaskStatus.FAILED,
        error: {
          message: errorMessage,
        },
      };
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
