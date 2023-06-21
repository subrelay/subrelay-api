import {
  IsEnum,
  IsNotEmptyObject,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { EmailTaskConfig } from './email.type';
import { TelegramTaskConfig } from './telegram.type';
import { FilterTaskConfig } from './filter.type';
import { WebhookTaskConfig } from './webhook.type';
import { TriggerTaskConfig } from './trigger.type';
import { DiscordTaskConfig } from './discord.type';
import { ProcessWorkflowInput } from '../../workflow/workflow.type';

export enum TaskType {
  TRIGGER = 'trigger',
  FILTER = 'filter',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  TELEGRAM = 'telegram',
  DISCORD = 'discord',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FAILED = 'failed',
  SUCCESS = 'success',
  SKIPPED = 'skipped',
}

export class TaskError {
  message: string;
}

export class TaskResult {
  status: TaskStatus;
  error?: TaskError;
  output?: any;
  input?: any;
}

export class TaskLog extends TaskResult {
  startedAt: Date;
  finishedAt: Date;
}

export class TaskValidationError extends Error {}

export class BaseTask {
  @IsString()
  id: string;

  @IsString()
  @IsOptional()
  dependOn: string;

  @IsEnum(TaskType)
  type: TaskType;

  @IsNotEmptyObject()
  private config: any;

  constructor(task: any) {
    Object.assign(this, task);
    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }

    switch (this.type) {
      case TaskType.FILTER:
        this.config = new FilterTaskConfig(this.config);
        break;
      case TaskType.WEBHOOK:
        this.config = new WebhookTaskConfig(this.config);
        break;
      case TaskType.EMAIL:
        this.config = new EmailTaskConfig(this.config);
        break;
      case TaskType.TELEGRAM:
        this.config = new TelegramTaskConfig(this.config);
        break;
      case TaskType.TRIGGER:
        this.config = new TriggerTaskConfig(this.config);
        break;
      case TaskType.DISCORD:
        this.config = new DiscordTaskConfig(this.config);
        break;
      default:
        throw new Error(`Unsupported type: ${this.type}`);
    }
  }

  getFilterTaskConfig(): FilterTaskConfig {
    return this.config;
  }

  getWebhookTaskConfig(): WebhookTaskConfig {
    return this.config;
  }

  getEmailTaskConfig(): EmailTaskConfig {
    return this.config;
  }

  getTelegramTaskConfig(): TelegramTaskConfig {
    return this.config;
  }

  getTriggerTaskConfig(): TriggerTaskConfig {
    return this.config;
  }

  getDiscordTaskConfig(): DiscordTaskConfig {
    return this.config;
  }
}

export function validateTaskConfig(type: TaskType, config: any) {
  switch (type) {
    case TaskType.FILTER:
      new FilterTaskConfig(config);
      break;
    case TaskType.WEBHOOK:
      new WebhookTaskConfig(config);
      break;
    case TaskType.EMAIL:
      new EmailTaskConfig(config);
      break;
    case TaskType.TELEGRAM:
      new TelegramTaskConfig(config);
      break;
    case TaskType.TRIGGER:
      new TriggerTaskConfig(config);
      break;
    case TaskType.DISCORD:
      new DiscordTaskConfig(config);
      break;
    default:
      throw new Error(`Unsupported type: ${type}`);
  }
}

export type ProcessTaskInput = ProcessWorkflowInput;
