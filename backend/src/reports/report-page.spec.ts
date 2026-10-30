import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type { DataSource } from 'typeorm';
import { ReportRowsQueryDto } from './http/report-query.dto.js';
import { readReportRows } from './report-page.js';

it.each([{ limit: 0, offset: 0 }, { limit: 101, offset: 0 }, { limit: 20, offset: -1 }, { limit: 20, offset: 1.5 }])('rejects invalid report pagination %j', async page => {
  const dto = plainToInstance(ReportRowsQueryDto, { operation: 'sale', from: '2026-10-01', to: '2026-10-19', report: 'detail', ...page });
  expect((await validate(dto)).length).toBeGreaterThan(0);
  const query = vi.fn();
  await expect(readReportRows({ query } as unknown as DataSource, 'SELECT 1', [], 'date, id', page)).rejects.toThrow('Página');
  expect(query).not.toHaveBeenCalled();
});
it('preserves total when an offset has no rows and limits rows in SQL', async () => {
  const query = vi.fn().mockResolvedValue([{ total: '135', items: [] }]);
  const result = await readReportRows({ query } as unknown as DataSource, 'SELECT id,date FROM selected', ['business', 'from', 'to'], 'date, id', { limit: 20, offset: 140 });
  expect(result).toEqual({ total: '135', items: [] });
  expect(query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $4 OFFSET $5'), ['business', 'from', 'to', 20, 140]);
});
it('leaves exports unpaginated', async () => {
  const items = Array.from({ length: 135 }, (_, id) => ({ id }));
  const query = vi.fn().mockResolvedValue(items);
  expect(await readReportRows({ query } as unknown as DataSource, 'SELECT id FROM selected', [], 'date, id')).toEqual({ total: '135', items });
  expect(query).toHaveBeenCalledWith('SELECT id FROM selected', []);
});
it('uses safe defaults and rejects unsupported reports', async () => {
  const base = { operation: 'purchase', from: '2026-10-01', to: '2026-10-19' };
  const dto = plainToInstance(ReportRowsQueryDto, { ...base, report: 'variety' });
  expect(await validate(dto)).toHaveLength(0); expect(dto.limit).toBe(20); expect(dto.offset).toBe(0);
  expect((await validate(plainToInstance(ReportRowsQueryDto, { ...base, report: 'summary' }))).map(error => error.property)).toContain('report');
});
