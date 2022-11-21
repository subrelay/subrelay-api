import {
  IsArray,
  IsEnum,
  IsInstance,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
  validateSync,
} from 'class-validator';

export enum FilterOperator {
  GREATETHAN = 'greaterThan',
  LESSTHAN = 'lessThan',
  CONTAIN = 'contain',
  EQUAL = 'equal',
  ISTRUE = 'isTrue',
  ISFALSE = 'isFalse',
}

export class TriggerCondition {
  @IsString()
  @IsNotEmpty()
  variable: string;

  @IsString()
  @IsEnum(FilterOperator)
  operator: FilterOperator;

  @ValidateIf(
    (o) =>
      ![FilterOperator.ISFALSE, FilterOperator.ISTRUE].includes(o.operator),
  )
  value?: string | number | boolean;
}

export class TriggerTaskConfig {
  @IsInstance(Event)
  event: Event;

  @IsOptional()
  @IsArray()
  @ValidateNested()
  conditions?: TriggerCondition[];
}
