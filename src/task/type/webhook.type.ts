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
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class WebhookTaskConfig {
  @IsArray()
  @IsOptional()
  @ValidateNested()
  headers: WebhookHeader[];

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
