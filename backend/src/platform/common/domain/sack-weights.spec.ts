import { calculateSackWeights, SackWeightError } from './sack-weights.js';

describe('sack weights', () => {
  it('subtracts the tare from the gross weight with three decimals', () => {
    expect(calculateSackWeights('52.5', '0.5')).toEqual({
      gross: '52.500',
      tare: '0.500',
      net: '52.000',
    });
  });

  it('treats an omitted or zero tare as no tare', () => {
    const expected = { gross: '50.125', tare: '0.000', net: '50.125' };
    expect(calculateSackWeights('50.125')).toEqual(expected);
    expect(calculateSackWeights('50.125', '0')).toEqual(expected);
  });

  it('rejects a tare equal to or greater than the gross weight', () => {
    for (const tare of ['52.5', '53'])
      expect(() => calculateSackWeights('52.5', tare)).toThrow(
        new SackWeightError('El peso neto debe ser mayor que cero.'),
      );
  });

  it('rejects a zero gross weight', () => {
    expect(() => calculateSackWeights('0')).toThrow(SackWeightError);
  });

  it('rejects more than three decimals, signs and text', () => {
    for (const gross of ['52.5001', '-52.5', 'cincuenta', ''])
      expect(() => calculateSackWeights(gross)).toThrow(
        new SackWeightError('El peso debe tener hasta tres decimales.'),
      );
  });
});
