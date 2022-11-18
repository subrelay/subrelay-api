import { IsOptional, IsString } from 'class-validator';
import { Pagination } from 'src/common/pagination.type';

export class GetEventsQueryParams extends Pagination {
  @IsString()
  @IsOptional()
  pallet?: string;
}
