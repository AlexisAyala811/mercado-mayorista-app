import { SackWeightError } from '../../common/domain/sack-weights.js';
import { SackWeight } from './sack-weight.js';

describe('SackWeight', () => {
  it('normalises the weight so equal amounts compare as the same sack', () => {
    const weight = SackWeight.of('52.5', '0.5');
    expect(weight).toMatchObject({
      gross: '52.500',
      tare: '0.500',
      net: '52.000',
    });
    expect(weight.sameAs({ grossWeightKg: '52.500', tareKg: '0.500' })).toBe(
      true,
    );
    expect(weight.sameAs({ grossWeightKg: '52.500', tareKg: '0.000' })).toBe(
      false,
    );
  });

  it('cannot be built from an invalid weight', () => {
    expect(() => SackWeight.of('52.5', '52.5')).toThrow(SackWeightError);
  });
});
