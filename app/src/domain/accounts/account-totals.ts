import type { AccountKind } from './account-kind';

// Spec 011 (RQ-ST06): the three totals Stitch shows on top of Deudas and
// Cobranzas, from the accounts and the cash movements the screen already reads.
type AccountLike = { kind: AccountKind; state: 'open' | 'paid' | 'voided'; balanceCents: string; nextDueOn?: string | null };
type MovementLike = { direction: 'in' | 'out'; category: string; amountCents: string; createdAt: string };

export type AccountTotals = { pendingCents: string; monthCents: string; overdueCents: string };

// `today` and the month start are civil dates in Lima (aaaa-mm-dd); movement
// times are converted to Lima before comparing.
export function accountTotals(kind: AccountKind, accounts: readonly AccountLike[], movements: readonly MovementLike[], today: string, limaDate: (iso: string) => string): AccountTotals {
  let pending = 0n;
  let overdue = 0n;
  for (const account of accounts) {
    if (account.kind !== kind || account.state !== 'open') continue;
    const balance = BigInt(account.balanceCents);
    pending += balance;
    if (account.nextDueOn && account.nextDueOn < today) overdue += balance;
  }
  // Payments to providers leave the cash box and collections from buyers enter
  // it; the reversal of each moves the other way and is subtracted. Movements
  // of the other kind (a collection, or the reversal of one) are left out.
  const paid = kind === 'payable' ? 'out' : 'in';
  const monthStart = `${today.slice(0, 8)}01`;
  let month = 0n;
  for (const movement of movements) {
    const payment = movement.category === 'account-payment' && movement.direction === paid;
    const reversal = movement.category === 'account-payment-reversal' && movement.direction !== paid;
    if (!payment && !reversal) continue;
    const day = limaDate(movement.createdAt);
    if (day < monthStart || day > today) continue;
    const amount = BigInt(movement.amountCents);
    month += payment ? amount : -amount;
  }
  return { monthCents: month.toString(), overdueCents: overdue.toString(), pendingCents: pending.toString() };
}
