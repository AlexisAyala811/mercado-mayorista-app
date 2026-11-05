import { validateAnalyticsPeriod } from '@/domain/analytics/period';

it('accepts an inclusive leap-year interval of 366 days but rejects 367', () => {
  expect(validateAnalyticsPeriod('2024-01-01', '2024-12-31')).toBeNull();
  expect(validateAnalyticsPeriod('2024-01-01', '2025-01-01')).toContain('366');
  expect(validateAnalyticsPeriod('2026-10-28', '2026-10-28')).toBeNull();
});

it.each([
  ['2026-02-30', '2026-03-01'],
  ['2026-10-01', '2026-02-29'],
  ['0000-01-01', '0000-01-02'],
  ['', '2026-10-28'],
  ['2026-10-28', '2026-10-01'],
])('rejects invalid or reversed dates %s – %s', (from, to) => {
  expect(validateAnalyticsPeriod(from, to)).not.toBeNull();
});
