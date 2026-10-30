import { validate } from 'class-validator';
import { AnalyticsSeriesQueryDto } from './analytics-query.dto.js';

it('rejects malformed participant identifiers at the query boundary', async () => {
  const query = Object.assign(new AnalyticsSeriesQueryDto(), {
    from: '2026-10-01', to: '2026-10-12', providerId: 'not-a-uuid', buyerId: 'also-invalid',
  });
  const errors = await validate(query);
  expect(errors.map(error => error.property).sort()).toEqual(['buyerId', 'providerId']);
});

it('accepts omitted participant filters and valid UUIDs without changing period validation', async () => {
  const query = Object.assign(new AnalyticsSeriesQueryDto(), { from: '2026-10-01', to: '2026-10-12' });
  expect(await validate(query)).toEqual([]);
  query.providerId = '11111111-1111-4111-8111-111111111111';
  query.buyerId = '22222222-2222-4222-8222-222222222222';
  expect(await validate(query)).toEqual([]);
});

it('distinguishes unreported from any known characteristic and rejects other sentinels', async () => {
  const query = Object.assign(new AnalyticsSeriesQueryDto(), {
    from: '2026-10-01', to: '2026-10-14', qualityId: 'unreported',
    originId: '33333333-3333-4333-8333-333333333333',
  });
  expect(await validate(query)).toEqual([]);
  query.qualityId = 'all';
  query.originId = 'no-informada';
  expect((await validate(query)).map(error => error.property).sort()).toEqual(['originId', 'qualityId']);
});

it('rejects repeated or non-string characteristic values', async () => {
  for (const value of [['unreported'], 12, {}]) {
    const query = Object.assign(new AnalyticsSeriesQueryDto(), { from: '2026-10-01', to: '2026-10-14', qualityId: value });
    expect((await validate(query)).some(error => error.property === 'qualityId')).toBe(true);
  }
});
