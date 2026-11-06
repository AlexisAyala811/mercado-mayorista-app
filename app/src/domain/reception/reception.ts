import { summarizeWholeKilograms } from './whole-kilograms';
import type {CommercialSnapshot} from '@/domain/catalog/commercial-characteristic';
export type Page<T> = { items: T[]; limit: number; offset: number; total: number };

export type Provider = { id: string; name: string; phone: string | null };
export type PotatoVariety = { id: string; name: string };
export type Vehicle = { id: string; plate: string; description: string | null };

export type ReceptionState = 'draft' | 'weighing' | 'weighed' | 'settled' | 'voided';

export type Reception = {
  id: string;
  providerId: string;
  providerName?: string | null;
  providerPhone: string | null;
  vehicleId: string | null;
  driverName: string;
  receivedOn: string;
  state: ReceptionState;
  version: number;
  expectedVarieties: PotatoVariety[];
};

export type ReceptionSack = Partial<CommercialSnapshot>&{
  id: string;
  sequence: number;
  varietyId: string;
  grossWeightKg: string;
  tareKg: string;
  netWeightKg: string;
  voidedAt?: string | null;
  correctionReason?: string | null;
};

export type SettlementLotView = {
  letter: string; name: string | null;
  varietyName: string | null; qualityName: string | null;
  sacks: number; netWeightKg: string;
  priceBasis: 'kilogram' | 'sack'; unitPriceCents: string; amountCents: string;
};

export type PurchaseSettlement = {
  id: string;
  grossAmountCents: string;
  freightAmountCents: string;
  advancesCents: string;
  discountsCents: string;
  liquidAmountCents: string;
  paymentMode: 'cash' | 'credit';
  // Spec 010: absent in responses from servers before lots.
  freightChargedTo?: 'provider' | 'wholesaler';
  lots?: SettlementLotView[];
  state: 'confirmed' | 'voided';
  version: number;
};

export function createOperationId() {
  const segment = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${segment()}${segment()}-${segment()}-4${segment().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${segment().slice(1)}-${segment()}${segment()}${segment()}`;
}

export function summarizeSacks(sacks: ReceptionSack[]) {
  // Whole kilograms on screen (spec 011); the exact total comes from grams.
  return summarizeWholeKilograms(sacks.map((sack) => sack.netWeightKg));
}

export function moneyInputToCents(value: string) {
  const normalized = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(cents) ? cents : null;
}

export function formatMoney(cents: string | number) {
  if ((typeof cents === 'number' && !Number.isSafeInteger(cents)) || (typeof cents === 'string' && !/^-?\d+$/.test(cents))) throw new Error('El importe debe expresarse en centavos enteros válidos.');
  const value = BigInt(cents);
  const absolute = value < 0n ? -value : value;
  return `S/ ${value < 0n ? '-' : ''}${absolute / 100n}.${(absolute % 100n).toString().padStart(2, '0')}`;
}
