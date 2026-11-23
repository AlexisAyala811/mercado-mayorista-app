import { evaluateHistoricalSnapshots, forecastFromSnapshot, type PriceWeek } from './predictive-engine.js';

function weeks(prices: string[]): PriceWeek[] {
  return prices.map((priceSolesPerKg, index) => ({
    weekStart: new Date(Date.parse('2026-04-13T00:00:00Z') + index * 7 * 86400000).toISOString().slice(0, 10),
    priceSolesPerKg, validSaleCount: 5, weightKg: '100.000',
  }));
}
const foldsFor = (data: PriceWeek[]) => Array.from({ length: 8 }, (_, index) => ({ training: data.slice(0, 18 + index), actual: data[18 + index]! }));

it('evaluates eight temporal folds with exact MAE, baseline and inclusive coverage', () => {
  const data = weeks(Array.from({ length: 26 }, (_, index) => index % 2 ? '4.0000' : '2.0000'));
  const result = evaluateHistoricalSnapshots(foldsFor(data));
  expect(result.maeSolesPerKg).toBe('1.0000');
  expect(result.baselineMaeSolesPerKg).toBe('2.0000');
  expect(result.coveredWeeks).toBe(8);
  expect(result.improvementMet).toBe(true);
  expect(result.coverageMet).toBe(true);
  expect(result.publicationAvailable).toBe(false);
  expect(result.reviewRequired).toBe(true);
  expect(result.comparisons[0]).toMatchObject({ lowerSolesPerKg: '2.0000', upperSolesPerKg: '4.0000', calibrationCount: 14 });
  expect(result.comparisons[7]!.calibrationCount).toBe(21);
  expect(result.comparisons[0]!.forecastWeekStart).toBe(data[18]!.weekStart);
});

it('does not claim relative improvement over a perfect zero-error baseline', () => {
  const result = evaluateHistoricalSnapshots(foldsFor(weeks(Array(26).fill('2.0000'))));
  expect(result.maeSolesPerKg).toBe('0.0000');
  expect(result.baselineMaeSolesPerKg).toBe('0.0000');
  expect(result.improvementMet).toBe(false);
  expect(result.coveredWeeks).toBe(8);
});

it('does not use the target or later prices in a forecast or its calibration', () => {
  const data = weeks(Array.from({ length: 26 }, (_, index) => index % 2 ? '4.0000' : '2.0000'));
  const before = evaluateHistoricalSnapshots(foldsFor(data));
  data[25] = { ...data[25]!, priceSolesPerKg: '999.0000' };
  const after = evaluateHistoricalSnapshots(foldsFor(data));
  expect(after.comparisons.slice(0, 7)).toEqual(before.comparisons.slice(0, 7));
  expect(after.comparisons[7]!.priceSolesPerKg).toBe(before.comparisons[7]!.priceSolesPerKg);
  expect(after.comparisons[7]!.upperSolesPerKg).toBe(before.comparisons[7]!.upperSolesPerKg);
  expect(after.comparisons[7]!.covered).toBe(false);
});

it('rejects missing weeks, invalid dates, insufficient counts and zero weight without filling gaps', () => {
  const data = weeks(Array(18).fill('2.0000'));
  expect(() => forecastFromSnapshot(data.slice(1))).toThrow('18 semanas');
  expect(() => forecastFromSnapshot(weeks(Array(27).fill('2.0000')))).toThrow('26 semanas');
  for (const changed of [{ weekStart: '2026-02-30' }, { weekStart: '2026-08-17' }, { validSaleCount: 4 }, { weightKg: '0.000' }, { priceSolesPerKg: 'NaN' }]) {
    const invalid = [...data]; invalid[5] = { ...invalid[5]!, ...changed };
    expect(() => forecastFromSnapshot(invalid)).toThrow();
  }
});

it('rejects a training prefix containing the target or a nonconsecutive evaluation', () => {
  const data = weeks(Array(26).fill('2.0000'));
  const folds = foldsFor(data);
  folds[0]!.training.push(data[18]!);
  expect(() => evaluateHistoricalSnapshots(folds)).toThrow('prefijos');
  const skipped = foldsFor(data); skipped[4]!.actual = data[25]!;
  expect(() => evaluateHistoricalSnapshots(skipped)).toThrow('continuidad');
  expect(() => evaluateHistoricalSnapshots(foldsFor(data).slice(1))).toThrow('ocho');
});

it('uses exact large prices and half-up rounding without mutating inputs', () => {
  const data = weeks(Array(18).fill('9007199254740993.0000'));
  data[17]!.priceSolesPerKg = '9007199254740993.0002';
  const frozen = Object.freeze(data.map(week => Object.freeze(week)));
  expect(forecastFromSnapshot(frozen).priceSolesPerKg).toBe('9007199254740993.0001');
});

it('clips the empirical lower bound at zero and fails insufficient observed coverage', () => {
  const data = weeks(Array(26).fill('0.0000'));
  data[0]!.priceSolesPerKg = '100.0000';
  const forecast = forecastFromSnapshot(data.slice(0, 18));
  expect(forecast.lowerSolesPerKg).toBe('0.0000');
  const outliers = weeks(Array(26).fill('2.0000'));
  outliers[24]!.priceSolesPerKg = '9.0000'; outliers[25]!.priceSolesPerKg = '20.0000';
  expect(evaluateHistoricalSnapshots(foldsFor(outliers)).coverageMet).toBe(false);
});

it('accepts exactly seven covered weeks but rejects a model worse than the reference', () => {
  const alternating = weeks(Array.from({ length: 26 }, (_, index) => index % 2 ? '4.0000' : '2.0000'));
  alternating[25]!.priceSolesPerKg = '20.0000';
  const covered = evaluateHistoricalSnapshots(foldsFor(alternating));
  expect(covered.coveredWeeks).toBe(7);
  expect(covered.observedCoveragePercent).toBe(87.5);
  expect(covered.coverageMet).toBe(true);
  const increasing = weeks(Array.from({ length: 26 }, (_, index) => `${index + 1}.0000`));
  const worse = evaluateHistoricalSnapshots(foldsFor(increasing));
  expect(worse.maeSolesPerKg).toBe('2.5000');
  expect(worse.baselineMaeSolesPerKg).toBe('1.0000');
  expect(worse.improvementMet).toBe(false);
});
