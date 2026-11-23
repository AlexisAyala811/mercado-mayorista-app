import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

export interface ReportPageRequest { limit: number; offset: number }
export async function readReportRows<T>(source: Pick<DataSource, 'query'>, sql: string, parameters: string[], order: 'date, id' | 'name, id', page?: ReportPageRequest) {
  if (!page) {
    const items = await source.query<T[]>(sql, parameters);
    return { items, total: String(items.length) };
  }
  if (!Number.isSafeInteger(page.offset) || page.offset < 0 || !Number.isInteger(page.limit) || page.limit < 1 || page.limit > 100) {
    throw new UnprocessableEntityException('Página de reporte no válida.');
  }
  const rows = await source.query<{ items: T[]; total: string }[]>(`
    WITH report_rows AS (${sql})
    SELECT (SELECT COUNT(*)::text FROM report_rows) AS total,
      COALESCE((SELECT jsonb_agg(paged ORDER BY ${order})
        FROM (SELECT * FROM report_rows ORDER BY ${order} LIMIT $4 OFFSET $5) paged), '[]'::jsonb) AS items
  `, [...parameters, page.limit, page.offset]);
  if (!rows[0]) throw new Error('No se pudo consultar la página del reporte.');
  return rows[0];
}
