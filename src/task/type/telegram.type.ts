import { IsNotEmpty, IsString, validateSync } from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class TelegramTaskConfig {
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @IsString()
  @IsNotEmpty()
  messageTemplate: string;

  constructor(config: any) {
    Object.assign(this, config);

    const errors = validateSync(this);
    if (!isEmpty(errors)) {
      const message = errors
        .map((e) => Object.values(e.constraints).join('. '))
        .join('. ');
      throw new TaskValidationError(message);
    }
  }
}

export class TelegramTaskInput {
  message: string;
}

export class TelegramTaskError extends Error {}
