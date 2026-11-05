import { reportPeriod } from '@/domain/shared/report-period';

it('selects the previous calendar month across year and leap-year boundaries', () => {
  expect(reportPeriod('previous-month', new Date(2026, 0, 15))).toEqual({ from: '2025-12-01', to: '2025-12-31' });
  expect(reportPeriod('previous-month', new Date(2024, 2, 31))).toEqual({ from: '2024-02-01', to: '2024-02-29' });
  expect(reportPeriod('previous-month', new Date(2026, 2, 31))).toEqual({ from: '2026-02-01', to: '2026-02-28' });
});

it('limits the current month to today rather than inventing a future cutoff', () => {
  expect(reportPeriod('current-month', new Date(2026, 9, 17))).toEqual({ from: '2026-10-01', to: '2026-10-17' });
});
