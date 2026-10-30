import {
  formatFixedDecimal,
  multiplyAndRoundHalfUp,
  parseFixedDecimal,
  parseSignedFixedDecimal,
} from './fixed-decimal.js';

describe('fixed decimal domain', () => {
  it('parses and formats kilograms without binary floating point', () => {
    expect(parseFixedDecimal('123.456', 3, 9)).toBe(123456n);
    expect(formatFixedDecimal(123456n, 3)).toBe('123.456');
    expect(formatFixedDecimal(-123456n, 3)).toBe('-123.456');
  });

  it('rejects excess precision and rounds monetary products half up', () => {
    expect(() => parseFixedDecimal('1.2345', 3, 9)).toThrow('invalid-decimal');
    expect(multiplyAndRoundHalfUp(1500n, 101n, 3)).toBe(152n);
  });

  it('parses signed deltas without allowing signs in unsigned quantities', () => {
    expect(parseSignedFixedDecimal('-0.500', 3, 11)).toBe(-500n);
    expect(parseSignedFixedDecimal('12.345', 3, 11)).toBe(12345n);
    expect(() => parseFixedDecimal('-0.500', 3, 11)).toThrow('invalid-decimal');
    expect(() => parseSignedFixedDecimal('+0.500', 3, 11)).toThrow(
      'invalid-decimal',
    );
  });
});
