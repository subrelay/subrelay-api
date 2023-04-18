import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsString,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { TaskValidationError } from './task.type';
import { isEmpty } from 'lodash';

export enum FilterVariableOperator {
  GREATER_THAN_EQUAL = 'greaterThanEqual',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL = 'lessThanEqual',
  CONTAINS = 'contains',
  EQUAL = 'equal',
  IS_TRUE = 'isTrue',
  IS_FALSE = 'isFalse',
}

export class FilterCondition {
  @IsString()
  @IsNotEmpty()
  variable: string;

  @IsString()
  @IsEnum(FilterVariableOperator, {
    message: `operator should be one of values: ${Object.values(
      FilterVariableOperator,
    ).join(', ')}`,
  })
  operator: FilterVariableOperator;

  @ValidateIf(
    (o) =>
      o.operator !== FilterVariableOperator.IS_FALSE &&
      o.operator !== FilterVariableOperator.IS_TRUE,
  )
  @IsNotEmpty()
  value?: string | number | boolean;
}

export class FilterTaskConfig {
  @ValidateNested()
  @IsNotEmpty()
  @IsArray()
  conditions: Array<FilterCondition[]>;

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
