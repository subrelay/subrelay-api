import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { EmailTaskConfig } from './email.type';
import { TelegramTaskConfig } from './telegram.type';
import { FilterTaskConfig } from './filter.type';
import { WebhookTaskConfig } from './webhook.type';

export enum TaskType {
  FILTER = 'filter',
  EMAIL = 'email',
  WEBHOOK = 'webhook',
  TELEGRAM = 'telegram',
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  FAILED = 'failed',
  SUCCESS = 'success',
  SKIPPED = 'skipped',
}

export class TaskError {
  @ApiPropertyOptional({
    example: null,
  })
  message: string;
}

export class TaskResult {
  @ApiProperty({
    example: true,
  })
  success: boolean;
  @ApiPropertyOptional({
    example: null,
  })
  error?: TaskError;
  @ApiPropertyOptional({
    example: {
      match: true,
    },
  })
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

  @IsOptional()
  @IsNumber()
  dependOn?: number;

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
}
