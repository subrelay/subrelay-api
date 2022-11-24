import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { AbsConfig } from './task.type';
import { IsTriggerConditions } from '../validator/trigger.validator';

export enum FilterOperator {
  GREATETHANEQUAL = 'greaterThanEqual',
  GREATETHAN = 'greaterThan',
  LESSTHAN = 'lessThan',
  LESSTHANEQUAL = 'lessThanEqual',
  CONTAINS = 'contains',
  EQUAL = 'equal',
  ISTRUE = 'isTrue',
  ISFALSE = 'isFalse',
}

export class TriggerCondition {
  @IsString()
  @IsNotEmpty()
  variable: string;

  @IsString()
  @IsEnum(FilterOperator, {
    message: `operator should be one of values: ${Object.values(
      FilterOperator,
    ).join(', ')}`,
  })
  operator: FilterOperator;

  @ValidateIf(
    (o) =>
      o.operator !== FilterOperator.ISFALSE &&
      o.operator !== FilterOperator.ISTRUE,
  )
  @IsNotEmpty()
  value?: string | number | boolean;
}

export class TriggerTaskConfig extends AbsConfig {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsTriggerConditions()
  @IsOptional()
  conditions?: Array<TriggerCondition[]>;
}
