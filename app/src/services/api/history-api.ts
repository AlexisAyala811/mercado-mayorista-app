import { apiRequest } from './api-client';

// Spec 011 (RQ-ST05, CL-ST04): «Ver compras» and «Ver ventas» as Stitch shows
// them, from GET /purchases/history, /purchases/history/summary and
// /sales/summary (backend T1161–T1162).

export type PurchasePaymentState = 'paid' | 'debt' | 'voided' | 'unsettled';
export type SalePaymentState = 'paid' | 'debt' | 'voided';

export type HistoryFilters = { from?: string; to?: string; search?: string };

export type PurchaseHistoryItem = {
  receptionId: string;
  receivedOn: string;
  receptionState: string;
  providerId: string;
  providerName: string | null;
  settlementId: string | null;
  varieties: string[];
  sacks: number;
  netWeightKg: string;
  totalCents: string | null;
  paidCents: string;
  balanceCents: string;
  paymentState: PurchasePaymentState;
};

export type HistorySummary<State extends string> = {
  counts: Record<State | 'all', number>;
  totalCents: string;
  paidCents: string;
  balanceCents: string;
};

export type Page<T> = { items: T[]; limit: number; offset: number; total: number };

function query(filters: HistoryFilters & Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined && value !== '') params.set(key, String(value));
  const text = params.toString();
  return text ? `?${text}` : '';
}

export const listPurchaseHistory = (token: string, filters: HistoryFilters & { paymentState?: PurchasePaymentState; limit?: number; offset?: number }) =>
  apiRequest<Page<PurchaseHistoryItem>>(`/purchases/history${query(filters)}`, { token });

export const purchaseHistorySummary = (token: string, filters: HistoryFilters = {}) =>
  apiRequest<HistorySummary<PurchasePaymentState>>(`/purchases/history/summary${query(filters)}`, { token });

export const salesHistorySummary = (token: string, filters: HistoryFilters = {}) =>
  apiRequest<HistorySummary<SalePaymentState>>(`/sales/summary${query(filters)}`, { token });
