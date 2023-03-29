import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsString, validateSync } from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class EmailTaskConfig {
  @ApiProperty({
    type: 'string',
    isArray: true,
    example: ['example@gmail.com'],
  })
  @IsArray()
  @IsNotEmpty()
  addresses: string[];

  @ApiProperty({
    type: 'string',
    example: 'Your event has been triggered ${eventId}',
  })
  @IsString()
  @IsNotEmpty()
  subjectTemplate: string;

  @ApiProperty({
    type: 'string',
    example: '${data.from} sent ${data.to} ${data.from} DOT',
  })
  @IsString()
  @IsNotEmpty()
  bodyTemplate: string;

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

export class EmailTaskInput {
  subject: string;
  body: string;
}
