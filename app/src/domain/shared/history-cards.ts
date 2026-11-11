import { formatKilograms } from '@/domain/reception/whole-kilograms';

// Spec 011 (RQ-ST05): one card of «Ver compras» or «Ver ventas» and the
// filter chips with their counts, from the server history (CL-ST04).
export type HistoryKind = 'purchase' | 'sale';
export type HistoryState = 'paid' | 'debt' | 'voided' | 'unsettled';
export type HistoryChip = 'all' | HistoryState;

export type HistoryCard = {
  id: string;
  party: string;
  date: string;
  state: HistoryState;
  varieties: string[];
  sacks: number;
  weightKg: string;
  totalCents: string | null;
  paidCents: string;
  balanceCents: string;
  // The settlement or sale whose account «Abonar» / «Cobrar» opens.
  sourceId: string | null;
};

const labels: Record<HistoryKind, Record<HistoryState, string>> = {
  // Words of the Stitch mockups (CL-ST21).
  purchase: { debt: 'Falta pagar', paid: 'Pagado', unsettled: 'Sin liquidar', voided: 'Anulado' },
  sale: { debt: 'Por cobrar', paid: 'Cobrado', unsettled: 'Sin liquidar', voided: 'Anulado' },
};

export function historyStateLabel(kind: HistoryKind, state: HistoryState) {
  return labels[kind][state];
}

// Chips in Stitch order; a purchase also has «Sin liquidar» (receptions not settled yet).
export function historyChips(kind: HistoryKind, counts: Partial<Record<HistoryChip, number>> | null) {
  const states: HistoryState[] = kind === 'purchase' ? ['paid', 'debt', 'unsettled', 'voided'] : ['paid', 'debt', 'voided'];
  const chips: { id: HistoryChip; label: string; count: number | null }[] = [{ count: counts?.all ?? null, id: 'all', label: 'Todos' }];
  for (const state of states) chips.push({ count: counts?.[state] ?? null, id: state, label: historyChipLabel(kind, state) });
  return chips;
}

function historyChipLabel(kind: HistoryKind, state: HistoryState) {
  if (state === 'paid') return kind === 'purchase' ? 'Pagados' : 'Cobradas';
  if (state === 'voided') return kind === 'purchase' ? 'Anulados' : 'Anuladas';
  if (state === 'unsettled') return 'Sin liquidar';
  return kind === 'purchase' ? 'Falta pagar' : 'Por cobrar / Deuda';
}

// «60 sacos (3,050 kg)» as in the mockups; the card draws the weight in grey.
export function historyVolumeParts(card: Pick<HistoryCard, 'sacks' | 'weightKg'>) {
  return { sacks: `${card.sacks} ${card.sacks === 1 ? 'saco' : 'sacos'}`, weight: `(${formatKilograms(card.weightKg)})` };
}

export function historyVolume(card: Pick<HistoryCard, 'sacks' | 'weightKg'>) {
  const parts = historyVolumeParts(card);
  return `${parts.sacks} ${parts.weight}`;
}

export function historyVarieties(card: Pick<HistoryCard, 'varieties'>) {
  return card.varieties.length ? card.varieties.join(', ') : 'Sin sacos registrados';
}

type PurchaseItem = {
  receptionId: string; receivedOn: string; providerName: string | null; settlementId: string | null;
  varieties: string[]; sacks: number; netWeightKg: string; totalCents: string | null; paidCents: string;
  balanceCents: string; paymentState: HistoryState;
};

export function purchaseCard(item: PurchaseItem): HistoryCard {
  return {
    balanceCents: item.balanceCents,
    date: item.receivedOn,
    id: item.receptionId,
    paidCents: item.paidCents,
    party: item.providerName ?? 'Proveedor registrado',
    sacks: item.sacks,
    sourceId: item.settlementId,
    state: item.paymentState,
    totalCents: item.totalCents,
    varieties: item.varieties,
    weightKg: item.netWeightKg,
  };
}

type SaleItem = {
  id: string; createdAt: string; buyerName?: string | null; totalAmountCents: string; state: 'confirmed' | 'voided';
  varieties?: string[]; sacks?: number; weightKg?: string; paidCents?: string; balanceCents?: string;
  paymentState?: 'paid' | 'debt' | 'voided';
};

export function saleCard(item: SaleItem, date: string): HistoryCard {
  const voided = item.state === 'voided';
  return {
    balanceCents: voided ? '0' : (item.balanceCents ?? '0'),
    date,
    id: item.id,
    paidCents: voided ? '0' : (item.paidCents ?? item.totalAmountCents),
    party: item.buyerName ?? 'Comprador registrado',
    sacks: item.sacks ?? 0,
    sourceId: item.id,
    state: item.paymentState ?? (voided ? 'voided' : 'paid'),
    totalCents: item.totalAmountCents,
    varieties: item.varieties ?? [],
    weightKg: item.weightKg ?? '0',
  };
}
