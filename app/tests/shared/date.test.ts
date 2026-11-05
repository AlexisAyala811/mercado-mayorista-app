import { formatLocalDateInput, formatLimaDateInput, formatLimaDateTime, formatLimaDate, isValidCivilDate } from '../../src/domain/shared/date';

it('validates real civil dates including leap years without rolling into another month', () => {
  expect(isValidCivilDate('2024-02-29')).toBe(true);
  expect(isValidCivilDate('0001-01-01')).toBe(true);
  expect(isValidCivilDate('0000-01-01')).toBe(false);
  for (const date of ['2026-02-29', '2026-02-30', '2026-04-31', '2026-13-01', '2026-00-01', '2026-10-00', '2026-1-01']) expect(isValidCivilDate(date)).toBe(false);
});

describe('local operation dates', () => {
  it('uses calendar fields from the device instead of the UTC date', () => {
    expect(formatLocalDateInput(new Date(2026, 8, 30, 23, 45))).toBe('2026-09-30');
  });
});

it('uses Lima across UTC midnight and fails clearly for invalid saved timestamps', () => {
  const instant = '2026-10-27T00:16:40.371Z';
  expect(formatLimaDateInput(new Date(instant))).toBe('2026-10-26');
  expect(formatLimaDateTime(instant)).toBe('26/10/2026, 19:16 (Lima)');
  expect(formatLimaDate(instant)).toBe('26/10/2026 (Lima)');
  expect(formatLimaDateTime('invalid')).toBe('Fecha no disponible');
  expect(formatLimaDate('invalid')).toBe('Fecha no disponible');
});
