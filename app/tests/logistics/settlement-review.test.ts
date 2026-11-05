import { reviewCostSettlement } from '@/domain/logistics/settlement-review';
const entries = [{ id: 'a', state: 'pending', amountCents: '9007199254740993' }, { id: 'b', state: 'pending', amountCents: '1' }];
it('reviews exact totals without modifying selections or converting to Number', () => {
  const ids = Object.freeze(['a', 'b']);
  const result = reviewCostSettlement(entries, ids, '2026-10-11');
  expect(result).toEqual({ kind: 'ready', settledOn: '2026-10-11', entryIds: ['a', 'b'], entryCount: 2, totalAmountCents: '9007199254740994' });
  if (result.kind === 'ready') expect(result.entryIds).not.toBe(ids);
});
it.each(['0000-01-01', '2026-02-29', '2026-13-01', '11/10/2026', '2026-10-11T00:00:00Z', ''])('rejects non-civil or invalid dates %s', date => {
  expect(reviewCostSettlement(entries, ['a'], date).kind).toBe('invalid');
});
it('accepts leap days and a zero tariff already present in central data', () => {
  expect(reviewCostSettlement([{ id: 'zero', state: 'pending', amountCents: '0' }], ['zero'], '2028-02-29')).toMatchObject({ kind: 'ready', totalAmountCents: '0' });
});
it('rejects empty, duplicate, missing, settled and malformed selections', () => {
  for (const ids of [[], ['a', 'a'], ['missing']]) expect(reviewCostSettlement(entries, ids, '2026-10-11').kind).toBe('invalid');
  expect(reviewCostSettlement([{ ...entries[0]!, state: 'settled' }], ['a'], '2026-10-11').kind).toBe('invalid');
  for (const amountCents of ['-1', '1.01', 'invalid']) expect(reviewCostSettlement([{ ...entries[0]!, amountCents }], ['a'], '2026-10-11').kind).toBe('invalid');
});
