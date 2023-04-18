import { Injectable, Logger } from '@nestjs/common';
import { findIndex, get, map, template } from 'lodash';
import {
  BaseTask,
  ProcessTaskInput,
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
import { GeneralTypeEnum } from '../substrate/substrate.data';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';
import { ulid } from 'ulid';
import { EmailTaskConfig, EmailTaskInput } from './type/email.type';
import {
  TelegramTaskConfig,
  TelegramTaskError,
  TelegramTaskInput,
} from './type/telegram.type';
import { WebhookTaskConfig } from './type/webhook.type';
import { EventService } from '../event/event.service';
import { FilterTaskConfig, FilterVariableOperator } from './type/filter.type';
import { InjectDiscordClient } from '@discord-nestjs/core';
import { Client, TextChannel } from 'discord.js';
import {
  DiscordTaskConfig,
  DiscordTaskError,
  DiscordTaskInput,
} from './type/discord.type';
import { decryptText, generateWebhookSignature } from '../common/crypto.util';
import { EventEntity } from '../event/event.entity';
import { DataField } from '../event/event.dto';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,

    @InjectRepository(TaskLogEntity)
    private taskLogRepository: Repository<TaskLogEntity>,

    @InjectBot()
    private telegramBot: Telegraf,

    @InjectDiscordClient()
    private readonly discordClient: Client,

    private readonly httpService: HttpService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly eventService: EventService,
  ) {}

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

  getFilterFields(event: EventEntity): DataField[] {
    const eventDataFields = this.eventService.getEventDataFields(event);
    const eventStatusFields = this.eventService.getEventStatusFields();
    return [
      ...map([...eventDataFields, ...eventStatusFields], (field) => ({
        ...field,
        name: `event.${field.name}`,
      })),
    ];
  }

  getCustomMessageFields(event: EventEntity): DataField[] {
    const eventDataFields = this.eventService.getEventDataFields(event);
    const eventStatusFields = this.eventService.getEventStatusFields();
    const eventInfoFields = this.eventService.getEventInfoFields(event);
    const eventExtraFields = this.eventService.getEventExtraFields();

    return [
      {
        name: 'workflow.id',
        description: ' The workflow ID',
        type: GeneralTypeEnum.STRING,
        data: ulid(),
      },
      {
        name: 'workflow.name',
        description: ' The workflow name',
        type: GeneralTypeEnum.STRING,
        data: `Workflow for event ${event.name}`,
      },
      {
        name: 'chain.uuid',
        description: ' The chain UUID',
        type: GeneralTypeEnum.STRING,
        data: event.chain.uuid,
      },
      {
        name: 'chain.name',
        description: ' The chain name',
        type: GeneralTypeEnum.STRING,
        data: event.chain.name,
      },
      ...map(
        [
          ...eventInfoFields,
          ...eventStatusFields,
          ...eventDataFields,
          ...eventExtraFields,
        ],
        (field) => ({
          ...field,
          name: `event.${field.name}`,
        }),
      ),
    ];
  }

  private processFilterTask(
    config: FilterTaskConfig,
    input: ProcessTaskInput,
  ): TaskResult {
    if (config.conditions.length === 0) {
      return {
        input: input,
        status: TaskStatus.SUCCESS,
        output: {
          match: true,
        },
      };
    }

    try {
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

  private async processWebhookTask(
    { url, secret, encrypted }: WebhookTaskConfig,
    input: ProcessTaskInput,
  ) {
    let decryptedSecret;
    const headers = { Accept: 'application/json' };
    let errorMessage = 'Failed to process webhook task.';
    const failedResult = {
      input,
      status: TaskStatus.FAILED,
      error: {
        message: errorMessage,
      },
    };

    try {
      const webhookSecretKey = this.configService.get('WEBHOOK_SECRET_KEY');
      if (secret) {
        if (encrypted) {
          decryptedSecret = decryptText(secret, webhookSecretKey);
        } else {
          decryptedSecret = secret;
        }
      }
    } catch (error) {
      this.logger.error('[Webhook] Failed to decrypt secret', error);

      return failedResult;
    }

    try {
      if (decryptedSecret) {
        headers['X-Hub-Signature-256'] = generateWebhookSignature(
          decryptedSecret,
          input,
        );
      }
    } catch (error) {
      this.logger.error(
        '[Webhook] Failed to generate webhook signature',
        error,
      );

      return failedResult;
    }

    try {
      await this.httpService.axiosRef.post(url, input, {
        headers,
      });

      return {
        input,
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      this.logger.error('[Webhook] Failed to send data to webhook', error);
      if (error.response.status === 404) {
        failedResult.error.message = 'Webhook URL does not exist.';
      } else if (error.response.status) {
        failedResult.error.message = `Sending request to webhook URL failed with status code ${error.response.status}.`;
      } else {
        failedResult.error.message = error.message;
      }

      return failedResult;
    }
  }

  private buildCustomMessage(messageTemplate: string, data: ProcessTaskInput) {
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
      await this.mailerService.sendMail({
        from: `SubRelay Notifications ${this.configService.get(
          'EMAIL_SENDER',
        )}`,
        to: config.addresses,
        subject,
        html: body,
      });

      this.logger.debug(
        `[Email Task] Took ${Date.now() - now} ms to send email`,
      );

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

    const rs: TaskResult = {
      input: { message },
      status: TaskStatus.RUNNING,
    };

    try {
      await this.validateTelegramChatId(config.chatId);

      await this.telegramBot.telegram.sendMessage(config.chatId, message, {
        parse_mode: 'HTML',
      });

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

    const rs: TaskResult = {
      input: { message },
      status: TaskStatus.RUNNING,
    };

    try {
      if (config.channelId) {
        const channel = (await this.discordClient.channels.cache.get(
          config.channelId,
        )) as unknown as TextChannel;

        if (!channel) {
          throw new DiscordTaskError('Channel not found');
        }

        channel.send({
          embeds: [
            {
              color: 0,
              description: message,
            },
          ],
        });
      }

      if (config.userId) {
        await this.discordClient.users.send(config.userId, {
          embeds: [
            {
              color: 0,
              description: message,
            },
          ],
        });
      }

      return {
        input: { message },
        status: TaskStatus.SUCCESS,
      };
    } catch (error) {
      let errorMessage = 'Failed to process discord task.';
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

    return rs;
  }

  private async validateTelegramChatId(chatId: string) {
    try {
      await this.telegramBot.telegram.getChat(chatId);
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
