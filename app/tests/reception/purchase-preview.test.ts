import { calculatePurchasePreview, formatPreviewMoney, validateCreditSchedule, type PurchasePreviewInput } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';

const agreement: PurchasePreviewInput = { unitPrice: '2.50', priceBasis: 'kilogram', freightRate: '0', freightBasis: 'none', advances: '0', discounts: '0' };
const sack = (weight: string, extra: Partial<ReceptionSack> = {}): ReceptionSack => ({ id: weight, sequence: 1, varietyId: 'v1', grossWeightKg: weight, tareKg: '0', netWeightKg: weight, ...extra });

it('rounds half-up once after aggregating weights, matching the central policy', () => {
  expect(calculatePurchasePreview([sack('0.005')], { ...agreement, unitPrice: '1' })).toMatchObject({ kind: 'ready', grossCents: '1' });
  expect(calculatePurchasePreview([sack('0.005'), sack('0.005', { id: 'second', varietyId: 'v2' })], { ...agreement, unitPrice: '1' })).toMatchObject({ kind: 'ready', weightKg: '0.010', grossCents: '1' });
});

it('uses separate price/freight bases and deducts each amount once', () => {
  expect(calculatePurchasePreview([sack('49'), sack('48', { id: 'second' })], { ...agreement, unitPrice: '100', priceBasis: 'sack', freightBasis: 'kilogram', freightRate: '0.20', advances: '10', discounts: '5' })).toEqual({ kind: 'ready', sackCount: 2, weightKg: '97.000', grossCents: '20000', freightCents: '1940', advancesCents: '1000', discountsCents: '500', liquidCents: '16560' });
});

it('excludes voided sacks and does not silently accept invalid conserved weights', () => {
  expect(calculatePurchasePreview([sack('50'), sack('100', { voidedAt: '2026-10-07' })], agreement)).toMatchObject({ kind: 'ready', sackCount: 1, weightKg: '50.000', grossCents: '12500' });
  expect(calculatePurchasePreview([sack('1.0001')], agreement).kind).toBe('invalid');
  expect(calculatePurchasePreview([sack('0')], agreement).kind).toBe('invalid');
});

it('preserves exact amounts beyond floating point precision', () => {
  const result = calculatePurchasePreview([sack('99999999999.999')], { ...agreement, unitPrice: '90000000000' });
  expect(result).toMatchObject({ kind: 'ready', grossCents: '899999999999991000000000' });
  if (result.kind !== 'ready') throw new Error('Expected valid preview');
  expect(formatPreviewMoney(result.grossCents)).toBe('S/ 8999999999999910000000.00');
});

it('keeps missing prices pending and rejects over-limit or excessive deductions', () => {
  expect(calculatePurchasePreview([sack('10')], { ...agreement, unitPrice: '' }).kind).toBe('pending');
  expect(calculatePurchasePreview([sack('10')], { ...agreement, unitPrice: '90000000000.01' }).kind).toBe('invalid');
  expect(calculatePurchasePreview([sack('10')], { ...agreement, discounts: '26' }).kind).toBe('invalid');
});

it('requires a calendar-valid credit schedule that equals the exact liquid amount', () => {
  expect(validateCreditSchedule([], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2030-02-30', amount: '250' }], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2030-03-01', amount: '249.99' }], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2028-02-29', amount: '100.01' }, { dueOn: '2028-03-01', amount: '149.99' }], '25000')).toBeNull();
});
