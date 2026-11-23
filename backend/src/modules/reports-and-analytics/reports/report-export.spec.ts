import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReportExportQueryDto } from './http/report-query.dto.js';
import { counterpartySections } from './report-export.js';
import type { OperationReportRow } from './report-export-data.js';

const row: OperationReportRow = { id: 'one', date: '2026-10-19', counterpartyId: 'a', counterparty: 'Igual nombre', gross: '0', freight: '0', discounts: '0', advances: '0', amount: '9007199254740993', balance: '1234', sacks: '1', weight: '10.125' };
it('groups by identity, preserves references and adds monetary amounts exactly', () => {
  const groups = counterpartySections([row, { ...row, id: 'two', amount: '2' }, { ...row, id: 'three', counterpartyId: 'b', amount: '100' }]);
  expect(groups).toHaveLength(2);
  expect(groups[0].lines.join('\n')).toContain('S/ 90071992547409.95');
  expect(groups[0].lines.join('\n')).toContain('S/ 24.68');
  expect(groups[0].lines).toContain('Referencia: one');
  expect(groups[0].lines).toContain('Referencia: two');
  expect(groups[1].lines.join('\n')).toContain('S/ 1.00');
});
it.each(['summary', 'detail', 'counterparty', 'variety'])('accepts approved report %s', async (report) => {
  expect(await validate(plainToInstance(ReportExportQueryDto, { operation: 'purchase', from: '2026-10-01', to: '2026-10-19', report }))).toHaveLength(0);
});
it('rejects unknown report types and impossible dates before querying', async () => {
  const errors = await validate(plainToInstance(ReportExportQueryDto, { operation: 'all', from: '2026-02-30', to: '2026-10-19', report: '../../file' }));
  expect(errors.map((error) => error.property)).toEqual(expect.arrayContaining(['report', 'operation', 'from']));
});
