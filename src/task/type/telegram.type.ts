import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, validateSync } from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class TelegramTaskConfig {
  @ApiProperty({ type: 'string', example: '123sdfs21423' })
  @IsString()
  @IsNotEmpty()
  chatId: string;

  @ApiProperty({
    type: 'string',
    example: '${data.from} sent ${data.to} ${data.from} DOT',
  })
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
  chatId: TelegramTaskConfig['chatId'];
}

export class TelegramTaskError extends Error {}
