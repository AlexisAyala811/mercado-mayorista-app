import { formatMoney } from '@/domain/reception/reception';
import { formatKilograms } from '@/domain/reception/whole-kilograms';

// Spec 011 (RQ-ST07, CL-ST18): the figures of the Stitch reports board, from
// the rows of /reports/rows, with integers (cents and grams) only.

function grams(weightKg: string) {
  const [whole, fraction = ''] = weightKg.split('.');
  return BigInt(whole || '0') * 1000n + BigInt((fraction + '000').slice(0, 3));
}

const percent = (part: bigint, whole: bigint) => (whole > 0n ? `${(Number((part * 1000n) / whole) / 10).toFixed(1)}%` : '0.0%');

export type BoardVariety = { id: string; name: string; sacks: string; weight: string; subtotal: string | null };
export type BoardParty = { counterpartyId: string; counterparty: string; sacks: string; weight: string; amount: string; balance: string };

// Share of each variety by kilograms, for the distribution legend.
export function varietyShares(rows: readonly BoardVariety[]) {
  const total = rows.reduce((sum, row) => sum + grams(row.weight), 0n);
  return {
    total: formatKilograms(`${total / 1000n}.${(total % 1000n).toString().padStart(3, '0')}`),
    items: rows.map((row) => ({ id: row.id, name: row.name, weight: formatKilograms(row.weight), share: percent(grams(row.weight), total), fraction: total > 0n ? Number((grams(row.weight) * 1000n) / total) / 1000 : 0 })),
  };
}

// One line of the consolidated table: average price per kilogram rounded half
// up to the cent, from the subtotal; null subtotal means not settled yet.
export function varietyTableRow(row: BoardVariety) {
  const weight = grams(row.weight);
  const average = row.subtotal !== null && weight > 0n ? formatMoney(((BigInt(row.subtotal) * 1000n * 2n + weight) / (weight * 2n)).toString()) : '—';
  return { id: row.id, name: row.name, sacks: row.sacks, weight: formatKilograms(row.weight), average, total: row.subtotal === null ? 'Sin liquidar' : formatMoney(row.subtotal) };
}

// Main providers or buyers of the period by kilograms, from the detail rows.
export function topParties(rows: readonly BoardParty[], limit = 4) {
  const groups = new Map<string, { id: string; name: string; sacks: bigint; grams: bigint; balance: bigint; operations: number }>();
  for (const row of rows) {
    const group = groups.get(row.counterpartyId) ?? { id: row.counterpartyId, name: row.counterparty, sacks: 0n, grams: 0n, balance: 0n, operations: 0 };
    group.sacks += BigInt(row.sacks || '0');
    group.grams += grams(row.weight);
    group.balance += BigInt(row.balance || '0');
    group.operations += 1;
    groups.set(row.counterpartyId, group);
  }
  return [...groups.values()]
    .sort((a, b) => (b.grams > a.grams ? 1 : b.grams < a.grams ? -1 : a.name.localeCompare(b.name, 'es')))
    .slice(0, limit)
    .map((group, index) => ({
      position: index + 1,
      id: group.id,
      name: group.name,
      detail: `${group.operations} ${group.operations === 1 ? 'operación' : 'operaciones'} · ${group.sacks} ${group.sacks === 1n ? 'saco' : 'sacos'}`,
      weight: formatKilograms(`${group.grams / 1000n}.${(group.grams % 1000n).toString().padStart(3, '0')}`),
      state: group.balance > 0n ? `Pendiente ${formatMoney(group.balance.toString())}` : 'Liquidado',
      pending: group.balance > 0n,
    }));
}
