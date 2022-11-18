import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

const PAGINATION_LIMIT_DEFAULT = 10;
const PAGINATION_OFFSET_DEFAULT = 0;

export class Pagination {
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit: number = PAGINATION_LIMIT_DEFAULT;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset: number = PAGINATION_OFFSET_DEFAULT;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  order?: string;

  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort: 'ASC' | 'DESC';
}
