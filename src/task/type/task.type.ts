import {
  IsEnum,
  isInstance,
  IsInstance,
  IsNotEmpty,
  IsString,
  validateSync,
  ValidationError,
} from 'class-validator';
import { NotificationTaskConfig, WebhookConfig } from './notification.type';
import { TriggerTaskConfig } from './trigger.type';

export enum TaskType {
  NOTIFICATION = 'notification',
  TRIGGER = 'trigger',
}

export class TaskOutput {
  success: boolean;
  error?: {
    message: string;
  };
  output?: any;
}

export type TaskConfig = NotificationTaskConfig | TriggerTaskConfig;

export function getConfigType(type: TaskType): Function {
  if (type === TaskType.NOTIFICATION) {
    return NotificationTaskConfig;
  }

  if (type === TaskType.TRIGGER) {
    return TriggerTaskConfig;
  }

  return null;
}
