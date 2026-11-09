import { formatMoney, type PurchaseSettlement } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';

// Spec 011 (RQ-ST04): the facts of the card shown when a purchase or a sale
// is confirmed (Stitch «Guardado exitosamente»).
export type ConfirmationFact = { label: string; value: string };
export type ConfirmationSummary = { facts: ConfirmationFact[]; totalLabel: string; total: string };

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

export function purchaseConfirmationSummary(settlement: PurchaseSettlement): ConfirmationSummary {
  const lots = settlement.lots ?? [];
  const facts: ConfirmationFact[] = [{ label: 'Variedades', value: unique(lots.map((lot) => lot.varietyName)) }];
  if (lots.length) {
    const sacks = lots.reduce((sum, lot) => sum + lot.sacks, 0);
    facts.push({ label: 'Sacos y peso', value: `${sacksText(sacks)} · ${formatKilograms(kilograms(lots.map((lot) => lot.netWeightKg)))}` });
  }
  facts.push({ label: 'Forma de pago', value: settlement.paymentMode === 'cash' ? 'Contado' : 'Crédito' });
  return { facts, total: formatMoney(settlement.liquidAmountCents), totalLabel: 'Total neto a pagar' };
}

type SaleLike = { totalAmountCents: string; paymentMode: 'cash' | 'credit' };
type LineLike = { varietyId: string; sacks: number | string; weightKg: string };

export function saleConfirmationSummary(sale: SaleLike, lines: readonly LineLike[], varietyName: (id: string) => string | undefined): ConfirmationSummary {
  const sacks = lines.reduce((sum, line) => sum + Number(line.sacks), 0);
  const facts: ConfirmationFact[] = [{ label: 'Variedades', value: unique(lines.map((line) => varietyName(line.varietyId))) }];
  if (lines.length) facts.push({ label: 'Sacos y peso', value: `${sacksText(sacks)} · ${formatKilograms(kilograms(lines.map((line) => line.weightKg)))}` });
  facts.push({ label: 'Forma de pago', value: sale.paymentMode === 'cash' ? 'Contado' : 'Crédito' });
  return { facts, total: formatMoney(sale.totalAmountCents), totalLabel: 'Total a cobrar' };
}
