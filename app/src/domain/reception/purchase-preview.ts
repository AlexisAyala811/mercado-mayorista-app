import { formatMoney, moneyInputToCents, type ReceptionSack } from './reception';

export type PurchasePreviewInput = {
  unitPrice: string; priceBasis: 'kilogram' | 'sack';
  freightRate: string; freightBasis: 'none' | 'kilogram' | 'sack';
  advances: string; discounts: string;
};
export type PurchasePreview =
  | { kind: 'pending' | 'invalid'; message: string }
  | { kind: 'ready'; sackCount: number; weightKg: string; grossCents: string; freightCents: string; advancesCents: string; discountsCents: string; liquidCents: string };

const maximumCents = 9_000_000_000_000;
function cents(input: string): bigint | null {
  const value = moneyInputToCents(input);
  return value !== null && value <= maximumCents ? BigInt(value) : null;
}
function amount(basis: 'kilogram' | 'sack', rate: bigint, count: number, grams: bigint): bigint {
  return basis === 'sack' ? BigInt(count) * rate : (grams * rate + 500n) / 1000n;
}
function decimal(value: bigint, scale: number): string {
  const absolute = value < 0n ? -value : value;
  const divisor = 10n ** BigInt(scale);
  return `${value < 0n ? '-' : ''}${absolute / divisor}.${(absolute % divisor).toString().padStart(scale, '0')}`;
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

// Provisional display only. Mirror the central aggregate-then-half-up policy;
// never sum amounts rounded independently per sack or variety.
export function calculatePurchasePreview(sacks: readonly ReceptionSack[], input: PurchasePreviewInput): PurchasePreview {
  const active = sacks.filter((sack) => !sack.voidedAt);
  if (!active.length) return { kind: 'invalid', message: 'La recepción no contiene sacos vigentes.' };
  let grams = 0n;
  for (const sack of active) {
    if (!/^\d{1,11}(?:\.\d{1,3})?$/.test(sack.netWeightKg)) return { kind: 'invalid', message: 'No se pudo verificar el peso conservado.' };
    const [whole, fraction = ''] = sack.netWeightKg.split('.');
    const weight = BigInt(whole!) * 1000n + BigInt(fraction.padEnd(3, '0'));
    if (weight <= 0n) return { kind: 'invalid', message: 'El peso neto debe ser mayor que cero.' };
    grams += weight;
  }
  if (!input.unitPrice.trim()) return { kind: 'pending', message: 'Ingresa el precio acordado para calcular los importes provisionales.' };
  const rate = cents(input.unitPrice);
  const freightRate = input.freightBasis === 'none' ? 0n : cents(input.freightRate);
  const advances = cents(input.advances);
  const discounts = cents(input.discounts);
  if (rate === null || rate <= 0n || freightRate === null || advances === null || discounts === null) return { kind: 'invalid', message: 'Revisa los importes: admite hasta dos decimales y los límites comerciales establecidos.' };
  const gross = amount(input.priceBasis, rate, active.length, grams);
  const freight = input.freightBasis === 'none' ? 0n : amount(input.freightBasis, freightRate!, active.length, grams);
  const liquid = gross - freight - advances - discounts;
  if (liquid < 0n) return { kind: 'invalid', message: 'El flete, los adelantos y los descuentos superan el importe bruto.' };
  return { kind: 'ready', sackCount: active.length, weightKg: decimal(grams, 3), grossCents: gross.toString(), freightCents: freight.toString(), advancesCents: advances.toString(), discountsCents: discounts.toString(), liquidCents: liquid.toString() };
}
