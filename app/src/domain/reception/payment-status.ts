import { formatMoney } from './reception';

// How «Ver compras» shows the server payment state (spec 011, CL-MD05): text
// first, with the paid and debt colours of the MAÑAY tokens.
export type PaymentStatusView = { label: string; detail?: string; tone: 'success' | 'danger' | 'neutral' };

export function paymentStatusView(status: { state: 'paid' | 'debt' | 'voided'; balanceCents: string }): PaymentStatusView {
  if (status.state === 'debt') return { label: 'Con deuda', detail: `Saldo ${formatMoney(status.balanceCents)}`, tone: 'danger' };
  if (status.state === 'paid') return { label: 'Pagada', tone: 'success' };
  return { label: 'Anulada', tone: 'neutral' };
}

// Only settled or voided receptions can have a settlement to ask about.
export function receptionsWithPayment<T extends { id: string; state: string }>(receptions: readonly T[]) {
  return receptions.filter((reception) => reception.state === 'settled' || reception.state === 'voided').map((reception) => reception.id);
}
