import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class PageQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset = 0;
}

export type Page<T> = {
  items: T[];
  limit: number;
  offset: number;
  total: number;
};

export function toPage<T>(
  items: T[],
  total: number,
  query: PageQueryDto,
): Page<T> {
  return { items, limit: query.limit, offset: query.offset, total };
}
