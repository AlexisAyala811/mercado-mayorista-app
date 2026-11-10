import { formatMoney, type PurchaseSettlement } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { formatLimaDateInput } from '@/domain/shared/date';

// Spec 011 (RQ-ST04, CL-ST18): the facts of the Stitch «Guardado
// exitosamente» card: variety, sacks and weight, unit price and the total,
// and under them the line with freight, deductions, payment and issue date.
export type ConfirmationFact = { label: string; value: string };
export type ConfirmationSummary = { facts: ConfirmationFact[]; totalLabel: string; total: string; notes?: ConfirmationFact[] };

function kilograms(values: string[]) {
  let grams = 0n;
  for (const value of values) {
    const [whole, fraction = ''] = value.split('.');
    grams += BigInt(whole || '0') * 1000n + BigInt((fraction + '000').slice(0, 3));
  }
  return `${grams / 1000n}.${(grams % 1000n).toString().padStart(3, '0')}`;
}

function unique(names: (string | null | undefined)[]) {
  const list = [...new Set(names.filter((name): name is string => Boolean(name)))];
  return list.length ? list.join(', ') : 'Sin variedad';
}

const sacksText = (sacks: number) => `${sacks} ${sacks === 1 ? 'saco' : 'sacos'}`;
const payment = (mode: 'cash' | 'credit') => (mode === 'cash' ? 'Contado' : 'Crédito');

// One lot shows its price; several show how many lots there are.
function unitPrice(items: { priceBasis: 'kilogram' | 'sack'; unitPriceCents: string }[]) {
  if (items.length !== 1) return items.length ? `${items.length} lotes con su precio` : null;
  const [item] = items;
  return `${formatMoney(item!.unitPriceCents)} / ${item!.priceBasis === 'kilogram' ? 'kg' : 'saco'}`;
}

export function purchaseConfirmationSummary(settlement: PurchaseSettlement): ConfirmationSummary {
  const lots = settlement.lots ?? [];
  const facts: ConfirmationFact[] = [{ label: 'Variedades', value: unique(lots.map((lot) => lot.varietyName)) }];
  if (lots.length) {
    const sacks = lots.reduce((sum, lot) => sum + lot.sacks, 0);
    facts.push({ label: 'Total sacos / peso', value: `${sacksText(sacks)} · ${formatKilograms(kilograms(lots.map((lot) => lot.netWeightKg)))}` });
  }
  const price = unitPrice(lots);
  if (price) facts.push({ label: 'Precio de compra', value: price });
  const notes: ConfirmationFact[] = [
    { label: settlement.freightChargedTo === 'wholesaler' ? 'Flete a cargo del Mayorista (no se descontó)' : 'Flete descontado', value: formatMoney(settlement.freightAmountCents) },
    { label: 'Adelanto', value: formatMoney(settlement.advancesCents) },
    { label: 'Descuentos', value: formatMoney(settlement.discountsCents) },
    { label: 'Pago', value: payment(settlement.paymentMode) },
  ];
  return { facts, notes, total: formatMoney(settlement.liquidAmountCents), totalLabel: 'Total neto a pagar' };
}

type SaleLike = { totalAmountCents: string; paymentMode: 'cash' | 'credit'; freightAmountCents?: string; discountsCents?: string; createdAt?: string };
type LineLike = { varietyId: string; sacks: number | string; weightKg: string; priceBasis?: 'kilogram' | 'sack'; unitPriceCents?: string };

export function saleConfirmationSummary(sale: SaleLike, lines: readonly LineLike[], varietyName: (id: string) => string | undefined): ConfirmationSummary {
  const sacks = lines.reduce((sum, line) => sum + Number(line.sacks), 0);
  const facts: ConfirmationFact[] = [{ label: 'Variedades', value: unique(lines.map((line) => varietyName(line.varietyId))) }];
  if (lines.length) facts.push({ label: 'Total sacos / peso', value: `${sacksText(sacks)} · ${formatKilograms(kilograms(lines.map((line) => line.weightKg)))}` });
  const priced = lines.filter((line): line is LineLike & { priceBasis: 'kilogram' | 'sack'; unitPriceCents: string } => Boolean(line.priceBasis && line.unitPriceCents));
  const price = priced.length === lines.length ? unitPrice(priced) : null;
  if (price) facts.push({ label: 'Precio de venta', value: price });
  const notes: ConfirmationFact[] = [];
  if (sale.freightAmountCents !== undefined) notes.push({ label: 'Flete / estiba', value: formatMoney(sale.freightAmountCents) });
  if (sale.discountsCents !== undefined) notes.push({ label: 'Descuentos', value: formatMoney(sale.discountsCents) });
  notes.push({ label: 'Pago', value: payment(sale.paymentMode) });
  if (sale.createdAt) notes.push({ label: 'Emisión', value: formatLimaDateInput(new Date(sale.createdAt)) });
  return { facts, notes, total: formatMoney(sale.totalAmountCents), totalLabel: 'Total neto a cobrar' };
}
