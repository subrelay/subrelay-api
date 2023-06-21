import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  validateSync,
} from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class WebhookTaskConfig {
  @IsString()
  @IsOptional()
  secret?: string;

  encrypted?: boolean = true;

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
