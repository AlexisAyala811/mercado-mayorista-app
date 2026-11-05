import { formatKilograms, kilogramsDraft, parseWholeKilograms, summarizeWholeKilograms, validateSackWeights } from '@/domain/reception/whole-kilograms';

describe('whole kilograms in the weighing (spec 011, T1121)', () => {
  it('accepts 52 and rejects 52,5, 52.5 and other text', () => {
    expect(parseWholeKilograms('52')).toBe(52n);
    expect(parseWholeKilograms(' 52 ')).toBe(52n);
    for (const value of ['52,5', '52.5', '52.0', '-1', '', '5e1', 'cincuenta', '12345678']) expect(parseWholeKilograms(value)).toBeNull();
  });

  it('sends whole kilograms with an empty tare as zero and requires gross above tare', () => {
    expect(validateSackWeights('52', '')).toEqual({ ok: true, value: { grossWeightKg: '52', tareKg: '0' } });
    expect(validateSackWeights('052', '1')).toEqual({ ok: true, value: { grossWeightKg: '52', tareKg: '1' } });
    expect(validateSackWeights('52,5', '1')).toEqual({ ok: false, message: 'Ingresa el bruto y la tara en kilos enteros, sin decimales.' });
    expect(validateSackWeights('52', '0.5')).toMatchObject({ ok: false });
    expect(validateSackWeights('2', '2')).toEqual({ ok: false, message: 'El peso bruto debe ser mayor que la tara.' });
  });

  it('rounds older sacks with decimals only on screen', () => {
    expect(formatKilograms('50.000')).toBe('50 kg');
    expect(formatKilograms('49.500')).toBe('50 kg');
    expect(formatKilograms('49.499')).toBe('49 kg');
    expect(kilogramsDraft('51.000')).toBe('51');
  });

  it('adds the exact grams before rounding the totals', () => {
    expect(summarizeWholeKilograms(['49.400', '49.400', '49.400'])).toEqual({ sackCountDisplay: '3', totalWeightDisplay: '148 kg', averageWeightDisplay: '49.4 kg' });
    expect(summarizeWholeKilograms([])).toEqual({ sackCountDisplay: '0', totalWeightDisplay: '0 kg', averageWeightDisplay: '0.0 kg' });
  });
});
