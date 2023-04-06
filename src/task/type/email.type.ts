import { IsArray, IsNotEmpty, IsString, validateSync } from 'class-validator';
import { isEmpty } from 'lodash';
import { TaskValidationError } from './task.type';

export class EmailTaskConfig {
  @IsArray()
  @IsNotEmpty()
  addresses: string[];

  @IsString()
  @IsNotEmpty()
  subjectTemplate: string;

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
