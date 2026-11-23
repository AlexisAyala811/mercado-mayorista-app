import {
  assessPredictionHistory,
  predictionWindow,
} from './prediction-readiness.js';
import type { AnalyticsObservation } from './analytics-calculation.js';
const asOf = '2026-10-06';
function data(salesPerWeek = 5): AnalyticsObservation[] {
  const window = predictionWindow(asOf);
  return Array.from({ length: 26 }, (_, index) => {
    const date = new Date(`${window.from}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index * 7);
    return Array.from({ length: salesPerWeek }, (_, sale) => ({
      operationType: 'sale' as const,
      operationId: `sale-${index}-${sale}`,
      varietyId: 'v-1',
      varietyName: 'Canchán',
      weekStart: date.toISOString().slice(0, 10),
      sacks: 1,
      weightKg: '10.000',
      merchandiseCents: '2000',
      compensationIds: [],
    }));
  }).flat();
}
describe('prediction history availability', () => {
  it('uses the 26 complete preceding weeks, including calendar-year transitions', () => {
    expect(predictionWindow(asOf)).toMatchObject({
      from: '2026-04-06',
      to: '2026-10-04',
    });
    expect(predictionWindow('2027-01-04')).toMatchObject({
      from: '2026-07-06',
      to: '2027-01-03',
    });
    expect(predictionWindow('2026-10-04').to).toBe('2026-09-27');
  });
  it('requires five distinct sales in every week and leaves evaluation/review pending even with enough data', () => {
    const result = assessPredictionHistory(data(), asOf, 'v-1');
    expect(result.dataSufficient).toBe(true);
    expect(result.sufficientWeeks).toBe(26);
    expect(result.predictionAvailable).toBe(false);
    expect(result.stage).toBe('ready_for_evaluation');
    expect(
      result.criteria
        .filter((item) => item.status === 'pending')
        .map((item) => item.id),
    ).toEqual(['evaluation', 'coverage', 'review']);
  });
  it('does not turn duplicate lines, purchases, other varieties or the current week into qualifying sales', () => {
    const rows = data(4);
    const sample = rows[0]!;
    rows.push(
      { ...sample },
      { ...sample, operationType: 'purchase', operationId: 'purchase' },
      { ...sample, varietyId: 'other', operationId: 'foreign-variety' },
      { ...sample, weekStart: '2026-10-05', operationId: 'current-week' },
    );
    const result = assessPredictionHistory(rows, asOf, 'v-1');
    expect(result.dataSufficient).toBe(false);
    expect(result.sufficientWeeks).toBe(0);
    expect(result.weeks[0]?.validSaleCount).toBe(4);
  });
  it('keeps a missing week empty and excludes malformed or fully compensated quantities', () => {
    const rows = data();
    const missing = rows[0]!.weekStart;
    const filtered = rows.filter((row) => row.weekStart !== missing);
    filtered.push(
      { ...rows[0]!, weightKg: '-5' },
      { ...rows[1]!, weightKg: '0', sacks: 0 },
    );
    const result = assessPredictionHistory(filtered, asOf, 'v-1');
    expect(result.sufficientWeeks).toBe(25);
    expect(result.weeks[0]).toMatchObject({
      validSaleCount: 0,
      weightKg: null,
      priceSolesPerKg: null,
    });
    expect(result.excluded).toHaveLength(2);
    expect(result.predictionAvailable).toBe(false);
  });
});
