import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from '../common/pagination.type';
import { GeneralTypeEnum } from '../substrate/substrate.data';

export class GetEventsQueryParams extends Pagination {
  @ApiPropertyOptional({
    example: 'system',
  })
  @IsString()
  @IsOptional()
  pallet?: string;
}

export class SupportedFilterField {
  @ApiProperty({ example: 'data.from' })
  name: string;
  @ApiProperty({ example: 'Amount sent' })
  description?: string;
  @ApiProperty({ example: 1 })
  example?: any;
  @ApiProperty({
    enum: Object.values(GeneralTypeEnum),
    example: GeneralTypeEnum.NUMBER,
  })
  type: GeneralTypeEnum;
}

export class EventSummary {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Transfer' })
  name: string;

  @ApiProperty({ example: 'balances' })
  pallet: string;

  @ApiProperty({ example: 'Transfer succeeded.' })
  description?: string;

  @ApiProperty({ example: 2 })
  index: number;

  @ApiProperty({ example: '3342b0eb-ab4f-40c0-870c-6587de6b009a' })
  chainUuid: string;
}

export class EventDetail extends EventSummary {
  @ApiProperty({ type: SupportedFilterField, isArray: true })
  fields: SupportedFilterField[];
}
