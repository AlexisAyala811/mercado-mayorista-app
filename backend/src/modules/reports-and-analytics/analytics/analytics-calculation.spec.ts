import {
  aggregateAnalytics,
  type AnalyticsObservation,
} from './analytics-calculation.js';
const row = (
  patch: Partial<AnalyticsObservation> = {},
): AnalyticsObservation => ({
  operationType: 'sale',
  operationId: 'sale-1',
  varietyId: 'v-1',
  varietyName: 'Canchán',
  weekStart: '2026-09-28',
  sacks: 1,
  weightKg: '10.000',
  merchandiseCents: '2000',
  compensationIds: [],
  ...patch,
});
describe('weighted commercial analytics', () => {
  it('weights by retained kilograms, counts distinct sales and keeps compensation references', () => {
    const result = aggregateAnalytics(
      [
        row(),
        row({
          weightKg: '30.000',
          merchandiseCents: '12000',
          compensationIds: ['return-1'],
        }),
        row({ operationId: 'sale-2' }),
      ],
      '2026-09-28',
      '2026-10-04',
      '2026-10-05',
    );
    expect(result.points[0]).toMatchObject({
      operationCount: 2,
      sacks: 3,
      weightKg: '50.000',
      merchandiseCents: '16000',
      priceSolesPerKg: '3.2000',
      complete: true,
      operationIds: ['sale-1', 'sale-2'],
      compensationIds: ['return-1'],
    });
  });
  it('does not mix varieties or purchases with sales and marks clipped/current weeks incomplete', () => {
    const result = aggregateAnalytics(
      [row(), row({ operationType: 'purchase' }), row({ varietyId: 'v-2' })],
      '2026-09-29',
      '2026-10-04',
      '2026-10-03',
    );
    expect(result.points).toHaveLength(3);
    expect(result.points.every((point) => !point.complete)).toBe(true);
  });
  it('lists invalid dates and quantities rather than inventing prices or normalizing invalid calendar dates', () => {
    const result = aggregateAnalytics(
      [
        row({ weightKg: '-1' }),
        row({ weightKg: '0.000', sacks: 0 }),
        row({ merchandiseCents: '-1' }),
        row({ weekStart: '2026-09-29' }),
        row({ weekStart: '2026-09-31' }),
      ],
      '2026-09-28',
      '2026-10-04',
      '2026-10-05',
    );
    expect(result.points).toHaveLength(0);
    expect(result.excluded.map((item) => item.reason)).toEqual([
      'invalid_quantity_or_amount',
      'no_remaining_quantity',
      'invalid_quantity_or_amount',
      'invalid_week',
      'invalid_week',
    ]);
  });
  it('preserves integer accuracy beyond Number precision and rounds only the displayed ratio', () => {
    const result = aggregateAnalytics(
      [row({ merchandiseCents: '9007199254740993', weightKg: '1.000' })],
      '2026-09-28',
      '2026-10-04',
      '2026-10-05',
    );
    expect(result.points[0]?.merchandiseCents).toBe('9007199254740993');
    expect(result.points[0]?.priceSolesPerKg).toBe('90071992547409.9300');
  });
});
