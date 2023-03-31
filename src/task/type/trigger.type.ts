import { IsString, validateSync } from 'class-validator';
import { TaskValidationError } from './task.type';
import { isEmpty } from 'lodash';

export class TriggerTaskConfig {
  @IsString()
  eventId: string;

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
