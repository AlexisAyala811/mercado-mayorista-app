import { createOperationId, formatMoney, moneyInputToCents, summarizeSacks } from '@/domain/reception/reception';

describe('reception presentation domain', () => {
  it('summarizes confirmed net weights without using gross weight', () => {
    const summary = summarizeSacks([
      { id: '1', sequence: 1, varietyId: 'v1', grossWeightKg: '50.000', tareKg: '1.000', netWeightKg: '49.000' },
      { id: '2', sequence: 2, varietyId: 'v1', grossWeightKg: '48.500', tareKg: '0.500', netWeightKg: '48.000' },
    ]);
    expect(summary).toEqual({ averageWeightDisplay: '48.5 kg', sackCountDisplay: '2', totalWeightDisplay: '97 kg' });
  });

  it('converts decimal money input to integer cents', () => {
    expect(moneyInputToCents('12.5')).toBe(1250);
    expect(moneyInputToCents('12,05')).toBe(1205);
    expect(moneyInputToCents('12.555')).toBeNull();
    expect(formatMoney('1205')).toBe('S/ 12.05');
  });

  it('creates UUID-shaped idempotency keys', () => {
    expect(createOperationId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('preserves every cent of large confirmed amounts and negative cash balances', () => {
    expect(formatMoney('9007199254740993')).toBe('S/ 90071992547409.93');
    expect(formatMoney('-9007199254740993')).toBe('S/ -90071992547409.93');
    expect(formatMoney(-1)).toBe('S/ -0.01');
    expect(() => formatMoney(Number.MAX_SAFE_INTEGER + 1)).toThrow();
  });
});
