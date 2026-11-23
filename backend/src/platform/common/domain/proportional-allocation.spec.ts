import {
  allocateProportionally,
  divideHalfUp,
} from './proportional-allocation.js';

describe('proportional allocation', () => {
  it('rounds halves upward', () => {
    expect(divideHalfUp(1n, 2n)).toBe(1n);
    expect(divideHalfUp(4n, 3n)).toBe(1n);
  });

  it('preserves the exact total by assigning the residue to the last item', () => {
    const result = allocateProportionally(10n, [1n, 1n, 1n]);
    expect(result).toEqual([3n, 3n, 4n]);
    expect(result.reduce((sum, value) => sum + value, 0n)).toBe(10n);
  });
});
