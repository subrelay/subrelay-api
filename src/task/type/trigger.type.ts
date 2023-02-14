import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
} from 'class-validator';
import { AbsConfig } from './task.type';
import { IsTriggerConditions } from '../validator/trigger.validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventData } from '../../event/event.type';

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
  @ApiProperty({ example: 'data.amount' })
  @IsString()
  @IsNotEmpty()
  variable: string;

  @ApiProperty({ example: FilterOperator.GREATETHAN, enum: FilterOperator })
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
      o.operator !== FilterOperator.ISFALSE &&
      o.operator !== FilterOperator.ISTRUE,
  )
  @IsNotEmpty()
  value?: string | number | boolean;
}

export class TriggerTaskConfig extends AbsConfig {
  @ApiProperty({ example: 9 })
  @IsNumber()
  eventId: number;

  @ApiPropertyOptional({ isArray: true, type: TriggerCondition })
  @IsTriggerConditions()
  @IsOptional()
  conditions?: Array<TriggerCondition[]>;
}

export type TriggerTaskInput = EventData;
