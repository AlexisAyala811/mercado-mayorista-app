import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

import {
  ReportAlertsQueryDto,
  ReportAsOfDto,
  ReportPeriodDto,
  PriceHistoryQueryDto,
  OperationOverviewQueryDto,
} from './report-query.dto.js';

describe('Report date contracts', () => {
  it('limits operation summaries to one supported operation and real calendar dates', async () => {
    const valid = { operation: 'purchase', from: '2026-10-01', to: '2026-10-17' };
    expect(await validate(plainToInstance(OperationOverviewQueryDto, valid))).toEqual([]);
    for (const operation of ['all', 'inventory', ['purchase', 'sale'], undefined]) {
      expect((await validate(plainToInstance(OperationOverviewQueryDto, { ...valid, operation }))).map(error => error.property)).toContain('operation');
    }
    expect((await validate(plainToInstance(OperationOverviewQueryDto, { ...valid, from: '2026-02-30' }))).map(error => error.property)).toContain('from');
  });
  it('accepts known and unreported dimensions without allowing arbitrary or repeated selectors', async () => {
    const query = Object.assign(new PriceHistoryQueryDto(), { from: '2026-10-01', to: '2026-10-14', qualityId: 'unreported', originId: '11111111-1111-4111-8111-111111111111' });
    expect(await validate(query)).toEqual([]);
    for (const value of ['all', 'No informada', ['unreported'], 3]) {
      expect((await validate(Object.assign(new PriceHistoryQueryDto(), query, { qualityId: value }))).map(error => error.property)).toContain('qualityId');
    }
  });
  it('accepts a financial alert window without requiring stock parameters', async () => {
    const input = plainToInstance(ReportAlertsQueryDto, {
      asOf: '2026-10-01',
      through: '2026-10-08',
    });

    expect(await validate(input)).toEqual([]);
  });

  it('rejects the retired stock threshold with the HTTP whitelist policy', async () => {
    const input = plainToInstance(ReportAlertsQueryDto, {
      asOf: '2026-10-01',
      through: '2026-10-08',
      maxAvailableSacks: '10',
    });
    expect(
      (
        await validate(input, { whitelist: true, forbidNonWhitelisted: true })
      ).map((error) => error.property),
    ).toContain('maxAvailableSacks');
  });

  it('accepts a real leap day as a calendar date', async () => {
    const input = Object.assign(new ReportPeriodDto(), {
      from: '2024-02-29',
      to: '2024-03-01',
    });
    expect(await validate(input)).toEqual([]);
  });

  it.each(['2026-02-29', '2026-09-25T00:00:00Z', '2026-9-5', ''])(
    'rejects invalid or non-calendar date %s in all report date fields',
    async (value) => {
      const period = Object.assign(new ReportPeriodDto(), {
        from: value,
        to: value,
      });
      const alerts = Object.assign(new ReportAlertsQueryDto(), {
        asOf: value,
        through: value,
      });
      const cutoff = Object.assign(new ReportAsOfDto(), { asOf: value });
      expect(
        (await validate(period)).map((error) => error.property).sort(),
      ).toEqual(['from', 'to']);
      expect(
        (await validate(alerts)).map((error) => error.property).sort(),
      ).toEqual(['asOf', 'through']);
      expect((await validate(cutoff)).map((error) => error.property)).toEqual([
        'asOf',
      ]);
    },
  );
});
