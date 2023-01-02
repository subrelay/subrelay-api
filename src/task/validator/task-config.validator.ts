import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { NotificationTaskConfig } from '../type/notification.type';
import { AbsConfig, TaskType } from '../type/task.type';
import { TriggerTaskConfig } from '../type/trigger.type';

@ValidatorConstraint({ async: false })
export class IsTaskConfigConstraint implements ValidatorConstraintInterface {
  message: string;
  defaultMessage(): string {
    return this.message;
  }

  validate(obj: any, args: ValidationArguments) {
    const type = args.object['type'] as TaskType;
    let config: AbsConfig;

    switch (type) {
      case TaskType.TRIGGER:
        config = new TriggerTaskConfig(obj);
        break;
      case TaskType.NOTIFICATION:
        config = new NotificationTaskConfig(obj);
        break;
      default:
        this.message = `${type} does not supported yet`;
        return false;
    }

    const result = config.validate();
    if (!result.success) {
      this.message = result.error.message;
      return false;
    }

    return true;
  }
}

export function IsTaskConfig(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsTaskConfigConstraint,
    });
  };
}
