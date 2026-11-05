import { analyticsExclusionReason, analyticsPointKey, weeklyComparisons, type AnalyticsPoint } from '@/domain/analytics/analytics';

function point(weekStart: string, overrides: Partial<AnalyticsPoint> = {}): AnalyticsPoint {
  return {
    operationType: 'sale', varietyId: 'v-1', varietyName: 'Canchán', weekStart,
    weekEnd: '', complete: true, operationCount: 5, sacks: 5,
    weightKg: '50.000', merchandiseCents: '10000', priceSolesPerKg: '2.0000',
    operationIds: [], compensationIds: [], ...overrides,
  };
}

it('compares consecutive complete weeks exactly, sorting without changing the response', () => {
  const earlier = point('2026-09-21');
  const later = point('2026-09-28', { priceSolesPerKg: '2.5000' });
  const input = Object.freeze([later, earlier]);
  const result = weeklyComparisons(input);
  expect(result.get(analyticsPointKey(later))).toBe('+25,0 % respecto a la semana 2026-09-21');
  expect(input[0]).toBe(later);
});

it('does not bridge an empty week or compare different varieties and operation types', () => {
  const gap = point('2026-10-05');
  const purchase = point('2026-09-28', { operationType: 'purchase' });
  const otherVariety = point('2026-09-28', { varietyId: 'v-2' });
  const result = weeklyComparisons([point('2026-09-21'), purchase, otherVariety, gap]);
  expect(result.get(analyticsPointKey(gap))).toContain('falta la semana anterior');
  expect(result.get(analyticsPointKey(purchase))).toContain('Primera semana disponible');
  expect(result.get(analyticsPointKey(otherVariety))).toContain('Primera semana disponible');
  expect([...result.values()].some(value => value.includes('%'))).toBe(false);
});

it('keeps observations but suppresses percentages when either week is partial', () => {
  const earlier = point('2026-09-21', { complete: false });
  const later = point('2026-09-28');
  const current = point('2026-10-05', { complete: false });
  const result = weeklyComparisons([earlier, later, current]);
  expect(result.get(analyticsPointKey(later))).toContain('semana anterior es parcial');
  expect(result.get(analyticsPointKey(current))).toContain('semana actual es parcial');
  expect([...result.values()].some(value => value.includes('%'))).toBe(false);
});

it('explains zero references and central exclusion reasons without inventing a price', () => {
  const later = point('2026-09-28');
  const result = weeklyComparisons([point('2026-09-21', { priceSolesPerKg: '0.0000' }), later]);
  expect(result.get(analyticsPointKey(later))).toContain('precio anterior cero');
  expect(analyticsExclusionReason('invalid_week')).toContain('fecha');
  expect(analyticsExclusionReason('no_remaining_quantity')).toContain('no conserva cantidad');
  expect(analyticsExclusionReason('invalid_quantity_or_amount')).toContain('importe');
  expect(analyticsExclusionReason('new-server-reason')).toContain('validación central');
});
