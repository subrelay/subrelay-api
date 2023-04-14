import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum SortType {
  ASC = 'ASC',
  DESC = 'DESC',
}
export class Pagination {
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit = 10;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset = 0;

  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  order?: string;

  @IsString()
  @IsOptional()
  @IsEnum(SortType)
  sort: SortType;
}
