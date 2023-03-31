import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { TaskValidationError } from './task.type';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isEmpty } from 'lodash';
import { IsFilterConditions } from '../validator/filter.validator';

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
  @ApiProperty({ example: 'data.amount' })
  @IsString()
  @IsNotEmpty()
  variable: string;

  @ApiProperty({
    example: FilterVariableOperator.GREATER_THAN,
    enum: FilterVariableOperator,
  })
  @IsString()
  @IsEnum(FilterVariableOperator, {
    message: `operator should be one of values: ${Object.values(
      FilterVariableOperator,
    ).join(', ')}`,
  })
  operator: FilterVariableOperator;

  @ApiProperty({ example: 1 })
  @ValidateIf(
    (o) =>
      o.operator !== FilterVariableOperator.IS_FALSE &&
      o.operator !== FilterVariableOperator.IS_TRUE,
  )
  @IsNotEmpty()
  value?: string | number | boolean;
}

export class FilterTaskConfig {
  @ApiPropertyOptional({ isArray: true, type: FilterCondition })
  @IsFilterConditions()
  @IsOptional()
  conditions?: Array<FilterCondition[]>;

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
