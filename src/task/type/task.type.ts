import { validateSync } from 'class-validator';

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

export class TaskOutput {
  success: boolean;
  error?: {
    message: string;
  };
  output?: any;
}

export abstract class AbsConfig {
  constructor(obj: any) {
    Object.assign(this, obj);
  }

  validate(): TaskOutput {
    const errors = validateSync(this);
    if (errors.length > 0) {
      return {
        success: false,
        error: {
          message: errors
            .map((e) => Object.values(e.constraints).join('. '))
            .join('. '),
        },
      };
    }

    return {
      success: true,
    };
  }
}

export class TaskValidationError extends Error {}
