import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class Pagination {
  @ApiPropertyOptional({ example: 10, type: 'number', minimum: 1 })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Type(() => Number)
  limit = 10;

  @ApiPropertyOptional({ example: 0, type: 'number', minimum: 0 })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Type(() => Number)
  offset = 0;

  @ApiPropertyOptional({ type: 'string' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ type: 'string' })
  @IsString()
  @IsOptional()
  order?: string;

  @ApiPropertyOptional({
    enum: ['ASC', 'DESC'],
    nullable: true,
    example: 'ASC',
  })
  @IsString()
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sort: 'ASC' | 'DESC';
}
