import { describe, expect, it } from 'vitest';

import { calculateAmountByBasis } from './commercial-calculation.js';

describe('commercial calculations', () => {
  it('calculates a sack-based amount exactly in cents', () => {
    expect(calculateAmountByBasis('sack', 12_345n, 7, 0n)).toBe(86_415n);
  });

  it('calculates a kilogram-based amount and rounds half upward', () => {
    expect(calculateAmountByBasis('kilogram', 1n, 0, 500n)).toBe(1n);
    expect(calculateAmountByBasis('kilogram', 250n, 0, 123_456n)).toBe(30_864n);
  });
});
