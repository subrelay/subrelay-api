import {
  IsNotEmpty,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class DiscordTaskConfig {
  @IsString()
  @IsOptional()
  channelId: string;

  @IsString()
  @IsOptional()
  userId: string;

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

    if (!this.channelId && !this.userId) {
      throw new TaskValidationError('Channel id or user id is required.');
    }
  }
}

export class DiscordTaskInput {
  message: string;
}

export class DiscordTaskError extends Error {}
