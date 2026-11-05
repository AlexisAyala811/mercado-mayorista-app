import { accountDueLabel, accountMovementLabel } from '@/domain/accounts/account-dates';

it('keeps a civil due date unchanged across the Lima UTC boundary', () => {
  expect(accountDueLabel('2026-10-20')).toBe('Vence: 20/10/2026');
  expect(accountDueLabel('2026-02-30')).toBe('Vencimiento no disponible');
});
it('distinguishes confirmed absence from an unavailable projection', () => {
  expect(accountDueLabel(null)).toBe('Sin vencimiento pendiente');
  expect(accountDueLabel(undefined)).toBe('Vencimiento no disponible');
  expect(accountMovementLabel(null)).toBe('Sin cambios posteriores al origen');
  expect(accountMovementLabel(undefined)).toBe('Último cambio no disponible');
});
it('shows a confirmed later financial change in Lima without inventing its kind', () => {
  const text = accountMovementLabel('2026-10-16T02:30:00Z');
  expect(text).toContain('15/10/2026');
  expect(text).toContain('21:30');
  expect(accountMovementLabel('not-a-date')).toBe('Último cambio no disponible');
  expect(accountMovementLabel('2026-10-16')).toBe('Último cambio no disponible');
});
