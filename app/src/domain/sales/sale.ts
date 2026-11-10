import { moneyInputToCents, type PotatoVariety } from '@/domain/reception/reception';
import type {CommercialSnapshot} from '@/domain/catalog/commercial-characteristic';

export type Buyer = {
  id: string;
  name: string;
  phone: string | null;
  destinationDepartment: string | null;
  creditLimitCents: string | null;
};

export type InventoryLot = {
  id: string;
  varietyId: string;
  state: 'pending' | 'available' | 'depleted' | 'blocked' | 'voided';
  availableSacks: number;
  availableWeightKg: string;
  initialSacks: number;
  initialWeightKg: string;
  version: number;
  createdAt: string;
  // Spec 011 (RQ-ST05): history data from GET /sales (backend T1162).
  varieties?: string[];
  sacks?: number;
  weightKg?: string;
  paidCents?: string;
  balanceCents?: string;
  paymentState?: 'paid' | 'debt' | 'voided';
};

export type Sale = {
  id: string;
  buyerId: string;
  buyerName?: string | null;
  destinationDepartment: string;
  grossAmountCents: string;
  freightAmountCents: string;
  discountsCents: string;
  totalAmountCents: string;
  paymentMode: 'cash' | 'credit';
  state: 'confirmed' | 'voided';
  version: number;
  createdAt: string;
};

export type SaleLineDraft = Partial<CommercialSnapshot>&{
  id: string;
  varietyId: string;
  sacks: string;
  weightKg: string;
  priceBasis: 'kilogram' | 'sack';
  unitPrice: string;
  // Spec 011 (CL-ST19): sacks weighed one by one on the tablet sheet, in whole
  // kilograms. The line is sent with their count and the sum of their weights.
  weights?: string[];
};

export function saleLineGrams(line: Pick<SaleLineDraft, 'weights'>): bigint {
  return (line.weights ?? []).reduce((total, weight) => total + BigInt(weight) * 1000n, 0n);
}

// Keeps sacks and weightKg equal to the weighed sacks.
export function withWeights(line: SaleLineDraft, weights: string[]): SaleLineDraft {
  return { ...line, weights, sacks: String(weights.length), weightKg: (saleLineGrams({ weights }) / 1000n).toString() };
}

export function validateSaleLine(line: SaleLineDraft, variety?: PotatoVariety) {
  const sacks = Number(line.sacks);
  const weight = line.weightKg.trim().replace(',', '.');
  if (!variety || variety.id !== line.varietyId) return 'Selecciona una variedad del catálogo.';
  if (!/^\d+$/.test(line.sacks.trim()) || !Number.isSafeInteger(sacks) || sacks < 1 || sacks > 2147483647) return 'Ingresa una cantidad válida de sacos mayor que cero.';
  if (!/^(?:0|[1-9]\d{0,10})(?:\.\d{1,3})?$/.test(weight) || !/[1-9]/.test(weight)) return 'Ingresa un peso positivo con hasta tres decimales.';
  const cents = moneyInputToCents(line.unitPrice);
  if (cents === null || cents <= 0 || cents > 9000000000000) return 'Ingresa un precio válido mayor que cero.';
  return null;
}
