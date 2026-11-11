import { calculatePurchasePreview, formatPreviewMoney, groupPurchaseLots, lotKey, previewLotAmount, settlementLotsPayload, validateCreditSchedule, type LotDraft, type PurchasePreviewInput } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';

const names: Record<string, string> = { v1: 'Canchán', v2: 'Amarilla', v3: 'Canchán' };
const varietyName = (id: string) => names[id] ?? 'Variedad';
const sack = (weight: string, extra: Partial<ReceptionSack> = {}): ReceptionSack => ({ id: `${weight}-${extra.varietyId ?? 'v1'}-${extra.qualityId ?? ''}`, sequence: 1, varietyId: 'v1', grossWeightKg: weight, tareKg: '0', netWeightKg: weight, ...extra });
const lot = (unitPrice: string, priceBasis: LotDraft['priceBasis'] = 'kilogram', name = ''): LotDraft => ({ unitPrice, priceBasis, name });
const base: Omit<PurchasePreviewInput, 'lots'> = { freightRate: '0', freightBasis: 'none', freightChargedTo: 'provider', advances: '0', discounts: '0' };
const single = (price: string, priceBasis: LotDraft['priceBasis'] = 'kilogram') => ({ ...base, lots: { [lotKey('v1', null)]: lot(price, priceBasis) } });
const preview = (sacks: ReceptionSack[], input: PurchasePreviewInput) => calculatePurchasePreview(groupPurchaseLots(sacks, varietyName), input);

describe('lots of the settlement', () => {
  it('groups by variety and quality with the server letters: variety name, quality name, no quality last', () => {
    const lots = groupPurchaseLots([
      sack('50', { varietyId: 'v1', qualityId: null }),
      sack('40', { varietyId: 'v1', qualityId: 'q2', qualityName: 'Segunda' }),
      sack('45', { varietyId: 'v2', qualityId: null }),
      sack('30', { varietyId: 'v1', qualityId: 'q1', qualityName: 'Primera' }),
      sack('20', { varietyId: 'v1', qualityId: 'q1', qualityName: 'Primera' }),
      sack('99', { varietyId: 'v2', voidedAt: '2026-11-04' }),
    ], varietyName)!;
    expect(lots.map((item) => [item.letter, item.varietyName, item.qualityName, item.sacks, item.netWeightKg])).toEqual([
      ['A', 'Amarilla', null, 1, '45.000'],
      ['B', 'Canchán', 'Primera', 2, '50.000'],
      ['C', 'Canchán', 'Segunda', 1, '40.000'],
      ['D', 'Canchán', null, 1, '50.000'],
    ]);
  });

  it('keeps two varieties with the same name apart by id', () => {
    const lots = groupPurchaseLots([sack('10', { varietyId: 'v3' }), sack('10', { varietyId: 'v1' })], varietyName)!;
    expect(lots.map((item) => [item.letter, item.varietyId])).toEqual([['A', 'v1'], ['B', 'v3']]);
  });

  it('rounds each lot on its own and then adds them up, as the server does', () => {
    const sacks = [sack('0.005', { varietyId: 'v1' }), sack('0.005', { varietyId: 'v2' })];
    const result = preview(sacks, { ...base, lots: { [lotKey('v1', null)]: lot('1'), [lotKey('v2', null)]: lot('1') } });
    expect(result).toMatchObject({ kind: 'ready', weightKg: '0.010', grossCents: '2', lots: [{ letter: 'A', amountCents: '1' }, { letter: 'B', amountCents: '1' }] });
  });

  it('lets each lot choose its basis', () => {
    const sacks = [sack('50', { varietyId: 'v1' }), sack('50', { varietyId: 'v1', id: 'second' }), sack('45', { varietyId: 'v2' })];
    const result = preview(sacks, { ...base, lots: { [lotKey('v2', null)]: lot('2.50'), [lotKey('v1', null)]: lot('100', 'sack') } });
    expect(result).toMatchObject({ kind: 'ready', sackCount: 3, lots: [{ letter: 'A', amountCents: '11250' }, { letter: 'B', amountCents: '20000' }], grossCents: '31250' });
  });

  it('asks for the price of every lot before calculating', () => {
    const sacks = [sack('50', { varietyId: 'v1' }), sack('45', { varietyId: 'v2' })];
    expect(preview(sacks, { ...base, lots: { [lotKey('v1', null)]: lot('2') } })).toEqual({ kind: 'pending', message: 'Ingresa el precio de lote A para calcular los importes provisionales.' });
  });

  it('builds the order with one lot per group and only the names typed', () => {
    const sacks = [sack('50', { varietyId: 'v1', qualityId: 'q1', qualityName: 'Primera' }), sack('45', { varietyId: 'v2' })];
    const lots = groupPurchaseLots(sacks, varietyName)!;
    expect(settlementLotsPayload(lots, { [lotKey('v1', 'q1')]: lot('2.40', 'kilogram', '  Selecta '), [lotKey('v2', null)]: lot('90', 'sack') })).toEqual([
      { varietyId: 'v2', qualityId: null, priceBasis: 'sack', unitPriceCents: 9000 },
      { varietyId: 'v1', qualityId: 'q1', priceBasis: 'kilogram', unitPriceCents: 240, name: 'Selecta' },
    ]);
  });
});

describe('freight and deductions', () => {
  it('deducts the freight from the provider by default and each deduction once', () => {
    expect(preview([sack('49'), sack('48', { id: 'second' })], { ...single('100', 'sack'), freightBasis: 'kilogram', freightRate: '0.20', advances: '10', discounts: '5' })).toEqual({ kind: 'ready', sackCount: 2, weightKg: '97.000', lots: [{ key: lotKey('v1', null), letter: 'A', amountCents: '20000' }], grossCents: '20000', freightCents: '1940', freightDeducted: true, advancesCents: '1000', discountsCents: '500', liquidCents: '16560' });
  });

  it('shows the freight paid by the wholesaler without deducting it', () => {
    expect(preview([sack('49'), sack('48', { id: 'second' })], { ...single('100', 'sack'), freightBasis: 'kilogram', freightRate: '0.20', freightChargedTo: 'wholesaler' })).toMatchObject({ kind: 'ready', freightCents: '1940', freightDeducted: false, liquidCents: '20000' });
  });
});

it('excludes voided sacks and does not silently accept invalid conserved weights', () => {
  expect(preview([sack('50'), sack('100', { id: 'voided', voidedAt: '2026-10-07' })], single('2.50'))).toMatchObject({ kind: 'ready', sackCount: 1, weightKg: '50.000', grossCents: '12500' });
  expect(preview([sack('1.0001')], single('2.50')).kind).toBe('invalid');
  expect(preview([sack('0')], single('2.50')).kind).toBe('invalid');
  expect(preview([], single('2.50')).kind).toBe('invalid');
});

it('preserves exact amounts beyond floating point precision', () => {
  const result = preview([sack('99999999999.999')], single('90000000000'));
  expect(result).toMatchObject({ kind: 'ready', grossCents: '899999999999991000000000' });
  if (result.kind !== 'ready') throw new Error('Expected valid preview');
  expect(formatPreviewMoney(result.grossCents)).toBe('S/ 8999999999999910000000.00');
});

it('keeps missing prices pending and rejects over-limit or excessive deductions', () => {
  expect(preview([sack('10')], single('')).kind).toBe('pending');
  expect(preview([sack('10')], single('90000000000.01')).kind).toBe('invalid');
  expect(preview([sack('10')], { ...single('2.50'), discounts: '26' }).kind).toBe('invalid');
});

it('requires a calendar-valid credit schedule that equals the exact liquid amount', () => {
  expect(validateCreditSchedule([], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2030-02-30', amount: '250' }], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2030-03-01', amount: '249.99' }], '25000')).not.toBeNull();
  expect(validateCreditSchedule([{ dueOn: '2028-02-29', amount: '100.01' }, { dueOn: '2028-03-01', amount: '149.99' }], '25000')).toBeNull();
});

it('waits for the freight rate after choosing a freight basis', () => {
  expect(preview([sack('50')], { ...single('2.50'), freightBasis: 'sack', freightRate: '' })).toEqual({ kind: 'pending', message: 'Ingresa la tarifa de flete o elige «Sin flete».' });
  expect(preview([sack('50')], { ...single('2.50'), freightBasis: 'none', freightRate: '' }).kind).toBe('ready');
});

it('gives each lot its own subtotal while another lot still has no price (CL-ST20)', () => {
  const lots = groupPurchaseLots([sack('349'), sack('121', { id: 'b', varietyId: 'v2' })], (id) => (id === 'v1' ? 'Canchán' : 'Peruanita'))!;
  const [canchan, peruanita] = lots;
  expect(previewLotAmount(canchan!, { priceBasis: 'kilogram', unitPrice: '1.45', name: '' })).toBe('50605');
  expect(previewLotAmount(canchan!, { priceBasis: 'sack', unitPrice: '80', name: '' })).toBe('8000');
  expect(previewLotAmount(peruanita!, undefined)).toBeNull();
  expect(previewLotAmount(peruanita!, { priceBasis: 'kilogram', unitPrice: '0', name: '' })).toBeNull();
  expect(previewLotAmount(peruanita!, { priceBasis: 'kilogram', unitPrice: '1.234', name: '' })).toBeNull();
});
