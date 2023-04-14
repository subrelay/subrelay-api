import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  isArray,
  isEmpty,
} from 'class-validator';
import { FilterCondition, FilterVariableOperator } from '../type/filter.type';

@ValidatorConstraint({ async: false })
export class IsFilterConditionsConstraint
  implements ValidatorConstraintInterface
{
  message: string;
  defaultMessage(): string {
    return this.message;
  }
  validate(conditions: any) {
    if (isEmpty(conditions) || !isArray(conditions)) {
      this.message = '"conditions" should be an array';
      return false;
    }

    const errorMessages = [];
    (conditions as any[]).forEach((conditionList, i) => {
      if (isEmpty(conditionList) || !isArray(conditionList)) {
        errorMessages.push(`conditions.${i} should be an array`);
      }

      (conditionList as FilterCondition[]).forEach((condition, j) => {
        if (!condition.variable) {
          errorMessages.push(
            `conditions.${i}.${j}.variable should not be empty`,
          );
        }

        if (!condition.operator) {
          errorMessages.push(
            `conditions.${i}.${j}.operator should not be empty`,
          );
        }

        if (
          !Object.values(FilterVariableOperator).includes(condition.operator)
        ) {
          errorMessages.push(
            `conditions.${i}.${j}.operator is invalid. Possible values: ${Object.values(
              FilterVariableOperator,
            ).join(', ')}`,
          );
        }
      });
    });

    if (errorMessages.length > 0) {
      this.message = errorMessages.join('. ');
    }

    return errorMessages.length === 0;
  }
}

export function IsFilterConditions(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsFilterConditionsConstraint,
    });
  };
}
