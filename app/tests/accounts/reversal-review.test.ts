import { paymentWasReversed, reviewPaymentReversal } from '@/domain/accounts/reversal-review';
const account = { state: 'open' as const, balanceCents: '8000' };
const original = { id: 'p-1', amountCents: '2000', isReversal: false };
it('restores the original amount, trims the reason and can reopen a paid account', () => {
  expect(reviewPaymentReversal(account, [original], original.id, ' Error de registro ')).toEqual({ kind: 'ready', amountCents: '2000', beforeCents: '8000', afterCents: '10000', reason: 'Error de registro' });
  expect(reviewPaymentReversal({ state: 'paid', balanceCents: '0' }, [original], original.id, 'Corrección')).toMatchObject({ kind: 'ready', afterCents: '2000' });
});
it('uses exact addition beyond the safe integer limit', () => {
  expect(reviewPaymentReversal({ ...account, balanceCents: '9007199254740993' }, [original], original.id, 'Corrección')).toMatchObject({ beforeCents: '9007199254740993', afterCents: '9007199254742993' });
});
it('detects only compensations linked to this original and rejects a repeated reversal', () => {
  const reversal = { ...original, id: 'r-1', isReversal: true, reversedPaymentId: original.id };
  expect(paymentWasReversed(original.id, [original, { ...reversal, reversedPaymentId: 'other' }])).toBe(false);
  expect(paymentWasReversed(original.id, [original, reversal])).toBe(true);
  expect(reviewPaymentReversal(account, [original, reversal], original.id, 'Corrección').kind).toBe('invalid');
});
it.each(['', '   ', 'x'.repeat(241)])('rejects an empty or oversized reason', reason => {
  expect(reviewPaymentReversal(account, [original], original.id, reason).kind).toBe('invalid');
});
it('accepts the boundary of 240 characters after trimming', () => {
  expect(reviewPaymentReversal(account, [original], original.id, ` ${'x'.repeat(240)} `).kind).toBe('ready');
});
it('rejects a voided account, missing payment, reversal as original and malformed amounts', () => {
  expect(reviewPaymentReversal({ ...account, state: 'voided' }, [original], original.id, 'Corrección').kind).toBe('invalid');
  expect(reviewPaymentReversal(account, [original], 'absent', 'Corrección').kind).toBe('invalid');
  expect(reviewPaymentReversal(account, [{ ...original, isReversal: true }], original.id, 'Corrección').kind).toBe('invalid');
  for (const amountCents of ['0', '-1', '1.01', 'invalid']) {
    expect(reviewPaymentReversal(account, [{ ...original, amountCents }], original.id, 'Corrección').kind).toBe('invalid');
  }
  expect(reviewPaymentReversal({ ...account, balanceCents: '-1' }, [original], original.id, 'Corrección').kind).toBe('invalid');
});
