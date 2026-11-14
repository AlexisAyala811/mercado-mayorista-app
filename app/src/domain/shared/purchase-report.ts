import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';
import { grams } from '@/domain/shared/sales-report';

// Spec 011 (CL-ST34, Stitch «Reportes de compras»): the figures of the
// purchases board that depend on the variety chosen, with integers only.

export type PurchaseVarietyRow = { id: string; name: string; operations: string; sacks: string; weight: string; subtotal: string | null };

const kgText = (total: bigint) => formatKilograms(`${total / 1000n}.${(total % 1000n).toString().padStart(3, '0')}`);
const averageOf = (subtotal: bigint, weight: bigint) => (weight > 0n ? formatMoney(((subtotal * 1000n * 2n + weight) / (weight * 2n)).toString()) : '—');

// Rows of the consolidated table for the variety chosen (or all of them) and
// the footer: «TOTAL GENERAL» or «SUBTOTAL». Only settled rows add to the total
// and to the average, which is weighted by kilograms.
export function purchaseVarietyView(rows: readonly PurchaseVarietyRow[], selectedId: string) {
  const visible = selectedId === 'all' ? [...rows] : rows.filter((row) => row.id === selectedId);
  const settled = visible.filter((row) => row.subtotal !== null);
  const sacks = visible.reduce((sum, row) => sum + BigInt(row.sacks || '0'), 0n);
  const weight = visible.reduce((sum, row) => sum + grams(row.weight), 0n);
  const total = settled.reduce((sum, row) => sum + BigInt(row.subtotal ?? '0'), 0n);
  const settledWeight = settled.reduce((sum, row) => sum + grams(row.weight), 0n);
  return {
    visible,
    footer: {
      title: selectedId === 'all' ? 'TOTAL GENERAL' : 'SUBTOTAL',
      sacks: sacks.toString(),
      weight: kgText(weight),
      average: averageOf(total, settledWeight),
      total: formatMoney(total.toString()),
      pending: visible.length > settled.length,
    },
  };
}

// Variety paid at the highest average price per kilogram, among the settled ones.
export function highestPriceVariety(rows: readonly PurchaseVarietyRow[]) {
  let best: { name: string; average: string; cents: bigint } | null = null;
  for (const row of rows) {
    const weight = grams(row.weight);
    if (row.subtotal === null || weight <= 0n) continue;
    const cents = (BigInt(row.subtotal) * 1000n * 2n + weight) / (weight * 2n);
    if (!best || cents > best.cents) best = { average: formatMoney(cents.toString()), cents, name: row.name };
  }
  return best ? { average: best.average, name: best.name } : null;
}

// Text of the badge when a bar of the evolution chart is touched.
export function dayBadge(row: { date: string; sacks: string; weight: string; amount: string; operations: string }) {
  const label = `${row.date.slice(8, 10)}/${row.date.slice(5, 7)}`;
  const operations = Number(row.operations);
  return `${label}: ${formatKilograms(row.weight)} · ${formatMoney(row.amount)} · ${row.sacks} ${row.sacks === '1' ? 'saco' : 'sacos'} · ${operations} ${operations === 1 ? 'operación' : 'operaciones'}`;
}
