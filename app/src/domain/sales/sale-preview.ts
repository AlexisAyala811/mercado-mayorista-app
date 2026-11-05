import { moneyInputToCents } from '@/domain/reception/reception';
import type { SaleLineDraft } from './sale';

type Input = { freightBasis: 'none' | 'kilogram' | 'sack'; freightRate: string; freightIncluded: boolean; discounts: string };
export type SalePreview = { kind: 'invalid'; message: string } | { kind: 'ready'; grossCents: string; freightCents: string; discountsCents: string; totalCents: string };
const cents = (value: string) => { const parsed = moneyInputToCents(value); return parsed !== null && parsed <= 9000000000000 ? BigInt(parsed) : null; };
export function calculateSalePreview(lines: readonly SaleLineDraft[], input: Input): SalePreview {
  if (!lines.length) return { kind: 'invalid', message: 'Agrega las variedades de la venta.' };
  let gross = 0n; let grams = 0n; let sacks = 0n;
  for (const line of lines) {
    const weight = line.weightKg.trim().replace(',', '.'); const rate = cents(line.unitPrice);
    if (!/^\d+(?:\.\d{1,3})?$/.test(weight) || !/^\d+$/.test(line.sacks.trim()) || rate === null || rate <= 0n)
      return { kind: 'invalid', message: 'Revisa las cantidades y precios de las líneas.' };
    const [whole, fraction = ''] = weight.split('.'); const lineGrams = BigInt(whole!) * 1000n + BigInt(fraction.padEnd(3, '0'));
    const lineSacks = BigInt(line.sacks);
    if (lineGrams <= 0n || lineSacks <= 0n) return { kind: 'invalid', message: 'Los sacos y el peso deben ser positivos.' };
    // Central sales policy rounds each negotiated line, then sums subtotals.
    gross += line.priceBasis === 'sack' ? lineSacks * rate : (lineGrams * rate + 500n) / 1000n;
    grams += lineGrams; sacks += lineSacks;
  }
  const discount = cents(input.discounts); const rate = input.freightBasis === 'none' ? 0n : cents(input.freightRate);
  if (discount === null || rate === null) return { kind: 'invalid', message: 'Revisa descuentos y tarifa de flete.' };
  const freight = input.freightBasis === 'none' ? 0n : input.freightBasis === 'sack' ? sacks * rate : (grams * rate + 500n) / 1000n;
  const total = gross - discount + (input.freightIncluded ? freight : 0n);
  if (total < 0n) return { kind: 'invalid', message: 'Los descuentos superan el importe de venta.' };
  return { kind: 'ready', grossCents: gross.toString(), freightCents: freight.toString(), discountsCents: discount.toString(), totalCents: total.toString() };
}
