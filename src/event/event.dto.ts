import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/common/pagination.type';

export class GetEventsQueryParams extends Pagination {
  @ApiPropertyOptional({
    example: 'system',
  })
  @IsString()
  @IsOptional()
  pallet?: string;
}
