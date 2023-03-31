import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class WebhookHeader {
  @ApiProperty({ example: 'Header 1' })
  @IsString()
  @IsNotEmpty()
  key: string;

  @ApiProperty({ example: 'Value 1' })
  @IsString()
  @IsNotEmpty()
  value: string;
}

export class WebhookTaskConfig {
  @ApiPropertyOptional({ type: WebhookHeader, isArray: true })
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

  @ApiProperty({ example: 'https://example.com' })
  @IsNotEmpty()
  @IsUrl()
  url: string;

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
