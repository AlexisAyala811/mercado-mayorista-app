import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';

// Spec 011 (RQ-ST07): figures of Reportes as Stitch shows them, computed with
// integers (cents and grams), never floating point for money.

function grams(weightKg: string) {
  const [whole, fraction = ''] = weightKg.split('.');
  return BigInt(whole || '0') * 1000n + BigInt((fraction + '000').slice(0, 3));
}

// Average price per kilogram, rounded half up to the cent; null without weight.
export function averagePricePerKilogram(totalCents: string, weightKg: string) {
  const weight = grams(weightKg);
  if (weight <= 0n) return null;
  const cents = (BigInt(totalCents) * 1000n * 2n + weight) / (weight * 2n);
  return `${formatMoney(cents.toString())} / kg`;
}

export type DailyRow = { date: string; operations: string; sacks: string; weight: string; amount: string };
export type VarietyRow = { id: string; name: string; sacks: string; weight: string };

// Bars by day (amount) and by variety (kilograms). The bar length is a number
// only for drawing; the value shown is always the exact text.
export function dailyBars(rows: readonly DailyRow[]) {
  return rows.map((row) => ({
    display: formatMoney(row.amount),
    key: row.date,
    label: `${row.date.slice(8, 10)}/${row.date.slice(5, 7)}`,
    value: Number(BigInt(row.amount)),
  }));
}

export function varietyBars(rows: readonly VarietyRow[]) {
  return rows.map((row) => ({
    display: `${formatKilograms(row.weight)} · ${row.sacks} ${row.sacks === '1' ? 'saco' : 'sacos'}`,
    key: row.id,
    label: row.name,
    value: Number(grams(row.weight)),
  }));
}
