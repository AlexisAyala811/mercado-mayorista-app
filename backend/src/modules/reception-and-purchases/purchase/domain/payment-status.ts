// Payment state of a settled purchase for «Ver compras» (spec 011, CL-MD05).
// Derived from the settlement and its payable account; never stored.
export type PurchasePaymentState = 'paid' | 'debt' | 'voided';

export type PaymentStatusSource = {
  settlementState: 'confirmed' | 'voided';
  paymentMode: 'cash' | 'credit';
  // Balance of the payable account; null when the purchase was paid in cash.
  accountBalanceCents: string | null;
};

export function purchasePaymentStatus(source: PaymentStatusSource): {
  state: PurchasePaymentState;
  balanceCents: string;
} {
  if (source.settlementState === 'voided')
    return { balanceCents: '0', state: 'voided' };
  if (source.paymentMode === 'cash' || source.accountBalanceCents === null)
    return { balanceCents: '0', state: 'paid' };
  const balance = BigInt(source.accountBalanceCents);
  return balance > 0n
    ? { balanceCents: balance.toString(), state: 'debt' }
    : { balanceCents: '0', state: 'paid' };
}
