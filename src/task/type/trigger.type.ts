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
import { IsTriggerConditions } from '../validator/trigger.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { isEmpty } from 'lodash';
import { EventEntity } from '../../event/event.entity';

export enum FilterOperator {
  GREATER_THAN_EQUAL = 'greaterThanEqual',
  GREATER_THAN = 'greaterThan',
  LESS_THAN = 'lessThan',
  LESS_THAN_EQUAL = 'lessThanEqual',
  CONTAINS = 'contains',
  EQUAL = 'equal',
  IS_TRUE = 'isTrue',
  IS_FALSE = 'isFalse',
}

export class TriggerCondition {
  @ApiProperty({ example: 'data.amount' })
  @IsString()
  @IsNotEmpty()
  variable: string;

  @ApiProperty({ example: FilterOperator.GREATER_THAN, enum: FilterOperator })
  @IsString()
  @IsEnum(FilterOperator, {
    message: `operator should be one of values: ${Object.values(
      FilterOperator,
    ).join(', ')}`,
  })
  operator: FilterOperator;

  @ApiProperty({ example: 1 })
  @ValidateIf(
    (o) =>
      o.operator !== FilterOperator.IS_FALSE &&
      o.operator !== FilterOperator.IS_TRUE,
  )
  @IsNotEmpty()
  value?: string | number | boolean;
}

export class TriggerTaskConfig {
  @ApiProperty({ example: 9 })
  @IsNumber()
  eventId: number;

  @ApiPropertyOptional({ isArray: true, type: TriggerCondition })
  @IsTriggerConditions()
  @IsOptional()
  conditions?: Array<TriggerCondition[]>;

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
