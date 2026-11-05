import { formatMoney, moneyInputToCents, type ReceptionSack } from './reception';

// Spec 010 / 011 (T1040, T1123): the settlement has one lot per variety and
// quality of the active sacks, each with its own basis and price. The app
// groups with the same rule as GET settlement-groups so it also works offline.
export type PriceBasis = 'kilogram' | 'sack';
export type FreightChargedTo = 'provider' | 'wholesaler';
export type LotDraft = { priceBasis: PriceBasis; unitPrice: string; name: string };

export type PurchaseLot = {
  key: string; letter: string;
  varietyId: string; varietyName: string;
  qualityId: string | null; qualityName: string | null;
  sacks: number; netWeightKg: string; grams: bigint;
};

export type PurchasePreviewInput = {
  lots: Readonly<Record<string, LotDraft>>;
  freightRate: string; freightBasis: 'none' | PriceBasis; freightChargedTo: FreightChargedTo;
  advances: string; discounts: string;
};
export type LotAmount = { key: string; letter: string; amountCents: string };
export type PurchasePreview =
  | { kind: 'pending' | 'invalid'; message: string }
  | { kind: 'ready'; sackCount: number; weightKg: string; lots: LotAmount[]; grossCents: string; freightCents: string; freightDeducted: boolean; advancesCents: string; discountsCents: string; liquidCents: string };

export const emptyLotDraft: LotDraft = { priceBasis: 'kilogram', unitPrice: '', name: '' };
export const maxPurchaseLots = 20;
const maximumCents = 9_000_000_000_000;

function cents(input: string): bigint | null {
  const value = moneyInputToCents(input);
  return value !== null && value <= maximumCents ? BigInt(value) : null;
}
function amount(basis: PriceBasis, rate: bigint, count: number, grams: bigint): bigint {
  return basis === 'sack' ? BigInt(count) * rate : (grams * rate + 500n) / 1000n;
}
function decimal(value: bigint, scale: number): string {
  const absolute = value < 0n ? -value : value;
  const divisor = 10n ** BigInt(scale);
  return `${value < 0n ? '-' : ''}${absolute / divisor}.${(absolute % divisor).toString().padStart(scale, '0')}`;
}
function sackGrams(netWeightKg: string): bigint | null {
  if (!/^\d{1,11}(?:\.\d{1,3})?$/.test(netWeightKg)) return null;
  const [whole, fraction = ''] = netWeightKg.split('.');
  return BigInt(whole!) * 1000n + BigInt(fraction.padEnd(3, '0'));
}
function compareQuality(a: string | null, b: string | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'es');
}

export const lotKey = (varietyId: string, qualityId: string | null | undefined) => `${varietyId}|${qualityId ?? ''}`;

// Letters follow variety name, then quality name (no quality last), then ids,
// exactly as the server labels the groups.
export function groupPurchaseLots(sacks: readonly ReceptionSack[], varietyName: (varietyId: string) => string): PurchaseLot[] | null {
  const groups = new Map<string, Omit<PurchaseLot, 'letter' | 'netWeightKg'>>();
  for (const sack of sacks) {
    if (sack.voidedAt) continue;
    const grams = sackGrams(sack.netWeightKg);
    if (grams === null || grams <= 0n) return null;
    const qualityId = sack.qualityId ?? null;
    const key = lotKey(sack.varietyId, qualityId);
    const group = groups.get(key) ?? { key, varietyId: sack.varietyId, varietyName: varietyName(sack.varietyId), qualityId, qualityName: sack.qualityName ?? null, sacks: 0, grams: 0n };
    group.sacks += 1;
    group.grams += grams;
    groups.set(key, group);
  }
  return [...groups.values()]
    .sort((a, b) => a.varietyName.localeCompare(b.varietyName, 'es') || compareQuality(a.qualityName, b.qualityName) || a.varietyId.localeCompare(b.varietyId) || (a.qualityId ?? '').localeCompare(b.qualityId ?? ''))
    .map((group, index) => ({ ...group, letter: String.fromCharCode(65 + index), netWeightKg: decimal(group.grams, 3) }));
}

export function lotTitle(lot: PurchaseLot) {
  return `Lote ${lot.letter} · ${lot.varietyName} · ${lot.qualityName ?? 'Calidad no informada'}`;
}

export function formatPreviewMoney(value: string): string { return formatMoney(value); }

export function validateCreditSchedule(installments: readonly { dueOn: string; amount: string }[], liquidCents: string): string | null {
  if (!installments.length) return 'Registra las cuotas del pago a crédito.';
  let total = 0n;
  for (const installment of installments) {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(installment.dueOn) ? new Date(`${installment.dueOn}T00:00:00Z`) : null;
    const value = cents(installment.amount);
    if (!date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== installment.dueOn || value === null || value <= 0n) return 'Cada cuota necesita una fecha existente y un importe mayor que cero.';
    total += value;
  }
  return total === BigInt(liquidCents) ? null : 'Las cuotas deben sumar exactamente el monto líquido.';
}

// Provisional display only. Each lot is rounded on its own and then added up,
// as the server does; freight is computed on the whole reception and is only
// deducted from the provider when the provider assumes it.
export function calculatePurchasePreview(lots: readonly PurchaseLot[] | null, input: PurchasePreviewInput): PurchasePreview {
  if (lots === null) return { kind: 'invalid', message: 'No se pudo verificar el peso conservado.' };
  if (!lots.length) return { kind: 'invalid', message: 'La recepción no contiene sacos vigentes.' };
  if (lots.length > maxPurchaseLots) return { kind: 'invalid', message: `La compra tiene más de ${maxPurchaseLots} combinaciones de variedad y calidad.` };
  const pending = lots.filter((lot) => !(input.lots[lot.key]?.unitPrice ?? '').trim());
  if (pending.length) return { kind: 'pending', message: `Ingresa el precio de ${pending.map((lot) => `lote ${lot.letter}`).join(', ')} para calcular los importes provisionales.` };
  const amounts: LotAmount[] = [];
  let gross = 0n;
  for (const lot of lots) {
    const draft = input.lots[lot.key]!;
    const rate = cents(draft.unitPrice);
    if (rate === null || rate <= 0n) return { kind: 'invalid', message: `Revisa el precio del lote ${lot.letter}: debe ser mayor que cero y con hasta dos decimales.` };
    if (draft.name.trim().length > 60) return { kind: 'invalid', message: `El nombre del lote ${lot.letter} admite hasta 60 caracteres.` };
    const value = amount(draft.priceBasis, rate, lot.sacks, lot.grams);
    amounts.push({ key: lot.key, letter: lot.letter, amountCents: value.toString() });
    gross += value;
  }
  const sackCount = lots.reduce((sum, lot) => sum + lot.sacks, 0);
  const grams = lots.reduce((sum, lot) => sum + lot.grams, 0n);
  const freightRate = input.freightBasis === 'none' ? 0n : cents(input.freightRate);
  const advances = cents(input.advances);
  const discounts = cents(input.discounts);
  if (freightRate === null || advances === null || discounts === null) return { kind: 'invalid', message: 'Revisa los importes: admite hasta dos decimales y los límites comerciales establecidos.' };
  const freight = input.freightBasis === 'none' ? 0n : amount(input.freightBasis, freightRate, sackCount, grams);
  const freightDeducted = input.freightBasis !== 'none' && input.freightChargedTo === 'provider';
  const liquid = gross - (freightDeducted ? freight : 0n) - advances - discounts;
  if (liquid < 0n) return { kind: 'invalid', message: freightDeducted ? 'El flete, los adelantos y los descuentos superan el importe bruto.' : 'Los adelantos y los descuentos superan el importe bruto.' };
  return { kind: 'ready', sackCount, weightKg: decimal(grams, 3), lots: amounts, grossCents: gross.toString(), freightCents: freight.toString(), freightDeducted, advancesCents: advances.toString(), discountsCents: discounts.toString(), liquidCents: liquid.toString() };
}

export function settlementLotsPayload(lots: readonly PurchaseLot[], drafts: Readonly<Record<string, LotDraft>>) {
  return lots.map((lot) => {
    const draft = drafts[lot.key]!;
    const name = draft.name.trim();
    return { varietyId: lot.varietyId, qualityId: lot.qualityId, priceBasis: draft.priceBasis, unitPriceCents: moneyInputToCents(draft.unitPrice)!, ...(name ? { name } : {}) };
  });
}
