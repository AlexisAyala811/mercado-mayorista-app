import { remainingInstallmentAmount } from '@/domain/shared/installments';

// Spec 011, CL-ST29: a new installment starts with the amount still missing.
it('prefills the amount still missing for the installments to reach the net total', () => {
  expect(remainingInstallmentAmount('71020', [])).toBe('710.20');
  expect(remainingInstallmentAmount('71020', [{ amount: '500' }])).toBe('210.20');
  expect(remainingInstallmentAmount('71020', [{ amount: '210.2' }, { amount: '500' }])).toBe('');
  expect(remainingInstallmentAmount('71020', [{ amount: '800' }])).toBe('');
  expect(remainingInstallmentAmount('105', [{ amount: 'abc' }])).toBe('1.05');
});
