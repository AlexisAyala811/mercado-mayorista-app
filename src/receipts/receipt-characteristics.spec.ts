import { describe, expect, it } from 'vitest';
import {
  receiptCharacteristics,
  receiptCharacteristicsVersion,
  receiptSackGroups,
} from './receipt-characteristics.js';

describe('historical receipt characteristics', () => {
  it('labels legacy absence explicitly and never invents an origin', () => {
    expect(receiptCharacteristics({})).toBe('Calidad: No informada · Procedencia: No informada');
    expect(receiptCharacteristics({ qualityId: 'quality', qualityName: 'Primera original' }))
      .toBe('Calidad: Primera original · Procedencia: No informada');
    expect(receiptCharacteristics({ originId: 'missing' })).toContain('Procedencia: Referencia no disponible');
  });

  it('separates dimensions and historical names while summing exact weight', () => {
    const base = { varietyId: 'v', netWeightKg: '0.001' };
    const groups = receiptSackGroups([
      base, { ...base, qualityId: null, originId: null },
      { ...base, qualityId: 'q', qualityName: 'Primera', netWeightKg: '10.099' },
      { ...base, qualityId: 'q', qualityName: 'Primera', netWeightKg: '20.002' },
      { ...base, qualityId: 'q', qualityName: 'Renombrada' },
      { ...base, qualityId: 'q', qualityName: 'Primera', originId: 'o', originName: 'Junín' },
      { ...base, varietyId: 'other' },
    ]);
    expect(groups.map(({ sacks, weight }) => [sacks, weight])).toEqual([
      [2, 2n], [2, 30101n], [1, 1n], [1, 1n], [1, 1n],
    ]);
    expect(groups.reduce((total, group) => total + group.weight, 0n)).toBe(30106n);
  });

  it('versions the new projection independently of state and civil date', () => {
    expect(receiptCharacteristicsVersion('confirmed:v2:date-lima-v1'))
      .toBe('confirmed:v2:date-lima-v1:characteristics-v1');
    expect(receiptCharacteristicsVersion('closed:v1')).not.toBe('closed:v1');
  });
});
