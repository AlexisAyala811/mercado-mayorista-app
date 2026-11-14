import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';

// Spec 011 (CL-ST33, Stitch «Reportes de ventas»): the figures of the sales
// report, from the overview and the detail rows, with integers (cents and
// grams) only.

// One decimal, rounded half up.
const tenths = (part: bigint, whole: bigint) => (whole > 0n ? Number((part * 2000n + whole) / (whole * 2n)) / 10 : 0);

export function grams(weightKg: string) {
  const [whole, fraction = ''] = weightKg.split('.');
  return BigInt(whole || '0') * 1000n + BigInt((fraction + '000').slice(0, 3));
}

// Collected = sold minus the balance still open. The balance is the current
// one for the period operations, not the one at the close of the period.
export function collectionFigures(totalCents: string, balanceCents: string) {
  const total = BigInt(totalCents);
  const balance = BigInt(balanceCents) > total ? total : BigInt(balanceCents);
  const collected = total - balance;
  const effective = Math.min(100, tenths(collected, total));
  return {
    collected: collected.toString(),
    effective: effective.toFixed(1),
    credit: (total > 0n ? 100 - effective : 0).toFixed(1),
    // 0..1 for the width of the bar.
    fraction: effective / 100,
  };
}

// Average kilos per sack, one decimal, e.g. «50.0».
export function kilosPerSack(weightKg: string, sacks: string) {
  const count = BigInt(sacks || '0');
  if (count <= 0n) return null;
  const tenthsOfKg = (grams(weightKg) * 10n + count * 500n) / (count * 1000n);
  return `${tenthsOfKg / 10n}.${tenthsOfKg % 10n}`;
}

export type SaleRow = { id: string; date: string; counterpartyId: string; counterparty: string; amount: string; advances: string; balance: string; sacks: string; weight: string };
export type SaleRowFilter = 'all' | 'collected' | 'credit';

export const saleRowState = (row: Pick<SaleRow, 'balance'>): 'collected' | 'credit' => (BigInt(row.balance || '0') > 0n ? 'credit' : 'collected');

// Rows of «Ventas por cliente»: filtered by state and by name, newest first.
export function saleClientRows(rows: readonly SaleRow[], filter: SaleRowFilter, search: string) {
  const query = search.trim().toLocaleLowerCase('es');
  const list = rows
    .filter((row) => (filter === 'all' || saleRowState(row) === filter) && (!query || row.counterparty.toLocaleLowerCase('es').includes(query)))
    .sort((a, b) => b.date.localeCompare(a.date) || a.counterparty.localeCompare(b.counterparty, 'es'));
  const sacks = list.reduce((sum, row) => sum + BigInt(row.sacks || '0'), 0n);
  const amount = list.reduce((sum, row) => sum + BigInt(row.amount || '0'), 0n);
  return {
    items: list.map((row) => ({
      id: row.id,
      client: row.counterparty,
      date: row.date.slice(0, 10),
      sacks: `${row.sacks} ${row.sacks === '1' ? 'saco' : 'sacos'}`,
      weight: formatKilograms(row.weight),
      total: formatMoney(row.amount),
      // What was collected so far, not only the advance given when the sale was made.
      collected: formatMoney((BigInt(row.amount || '0') - BigInt(row.balance || '0')).toString()),
      balance: formatMoney(row.balance),
      state: saleRowState(row),
      stateLabel: saleRowState(row) === 'collected' ? 'Cobrado' : 'Crédito',
    })),
    totalSacks: sacks.toString(),
    totalAmount: formatMoney(amount.toString()),
  };
}

export function saleRowCounts(rows: readonly SaleRow[]) {
  const collected = rows.filter((row) => saleRowState(row) === 'collected').length;
  return { all: rows.length, collected, credit: rows.length - collected };
}
