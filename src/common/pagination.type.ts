import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class Pagination {
  @IsNumber()
  @IsOptional()
  @Min(1)
  limit: number = 10;

  @IsNumber()
  @IsOptional()
  @Min(0)
  offset: number = 0;

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
