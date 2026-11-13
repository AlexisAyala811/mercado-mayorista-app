import { moneyInputToCents } from '@/domain/reception/reception';

// Amount still missing for the installments to add up to the net total, as
// the text of a money field («710.20»). Used to prefill a new installment
// (spec 011, CL-ST29). Money in cents with BigInt, never floating point.
export function remainingInstallmentAmount(totalCents: string, installments: readonly { amount: string }[]): string {
  const assigned = installments.reduce((sum, item) => sum + BigInt(moneyInputToCents(item.amount) ?? 0), 0n);
  const left = BigInt(totalCents) - assigned;
  if (left <= 0n) return '';
  return `${left / 100n}.${String(left % 100n).padStart(2, '0')}`;
}
