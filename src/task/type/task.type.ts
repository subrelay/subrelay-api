import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmptyObject,
  IsNumber,
  IsOptional,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { NotificationTaskConfig } from './notification.type';
import { TriggerTaskConfig } from './trigger.type';

export enum TaskType {
  NOTIFICATION = 'notification',
  TRIGGER = 'trigger',
}

export enum ProcessStatus {
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
  @IsNumber()
  id: number;

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
      case TaskType.TRIGGER:
        this.config = new TriggerTaskConfig(this.config);
        break;
      case TaskType.NOTIFICATION:
        this.config = new NotificationTaskConfig(this.config);
        break;
      default:
        throw new Error(`Unsupported type: ${this.type}`);
    }
  }

  isTriggerTask(): boolean {
    return this.type === TaskType.TRIGGER;
  }

  getTriggerConfig(): TriggerTaskConfig {
    return this.config;
  }

  getNotificationTaskConfig(): NotificationTaskConfig {
    return this.config;
  }

  isNotificationTask(): boolean {
    return this.type === TaskType.NOTIFICATION;
  }
}
