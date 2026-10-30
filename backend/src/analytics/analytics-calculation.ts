import { divideHalfUp } from '../common/domain/proportional-allocation.js';

export type AnalyticsObservation = {
  operationType: 'purchase' | 'sale';
  operationId: string;
  varietyId: string;
  varietyName: string;
  weekStart: string;
  sacks: number;
  weightKg: string;
  merchandiseCents: string;
  compensationIds: string[];
};
export type AnalyticsPoint = {
  operationType: 'purchase' | 'sale';
  varietyId: string;
  varietyName: string;
  weekStart: string;
  weekEnd: string;
  complete: boolean;
  operationCount: number;
  sacks: number;
  weightKg: string;
  merchandiseCents: string;
  priceSolesPerKg: string;
  operationIds: string[];
  compensationIds: string[];
};

export function aggregateAnalytics(
  rows: AnalyticsObservation[],
  from: string,
  to: string,
  today: string,
) {
  const grouped = new Map<
    string,
    {
      row: AnalyticsObservation;
      grams: bigint;
      cents: bigint;
      sacks: number;
      operations: Set<string>;
      compensations: Set<string>;
    }
  >();
  const excluded: {
    operationId: string;
    operationType: 'purchase' | 'sale';
    varietyId: string;
    varietyName: string;
    weekStart: string;
    reason: string;
  }[] = [];
  const exclude = (row: AnalyticsObservation, reason: string) =>
    excluded.push({
      operationId: row.operationId,
      operationType: row.operationType,
      varietyId: row.varietyId,
      varietyName: row.varietyName,
      weekStart: row.weekStart,
      reason,
    });
  for (const row of rows) {
    const week = new Date(`${row.weekStart}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(row.weekStart) ||
      !Number.isFinite(week.getTime()) ||
      week.toISOString().slice(0, 10) !== row.weekStart ||
      week.getUTCDay() !== 1
    ) {
      exclude(row, 'invalid_week');
      continue;
    }
    if (
      !/^\d+(\.\d{1,3})?$/.test(row.weightKg) ||
      !/^\d+$/.test(row.merchandiseCents) ||
      !Number.isSafeInteger(row.sacks) ||
      row.sacks < 0
    ) {
      exclude(row, 'invalid_quantity_or_amount');
      continue;
    }
    const [whole, fraction = ''] = row.weightKg.split('.');
    const grams = BigInt(whole!) * 1000n + BigInt(fraction.padEnd(3, '0'));
    if (grams === 0n || row.sacks === 0) {
      exclude(row, 'no_remaining_quantity');
      continue;
    }
    const key = `${row.operationType}:${row.varietyId}:${row.weekStart}`;
    const group = grouped.get(key) ?? {
      row,
      grams: 0n,
      cents: 0n,
      sacks: 0,
      operations: new Set<string>(),
      compensations: new Set<string>(),
    };
    group.grams += grams;
    group.cents += BigInt(row.merchandiseCents);
    group.sacks += row.sacks;
    group.operations.add(row.operationId);
    row.compensationIds.forEach((id) => group.compensations.add(id));
    grouped.set(key, group);
  }
  const points: AnalyticsPoint[] = [...grouped.values()]
    .map((group) => {
      const end = new Date(`${group.row.weekStart}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + 6);
      const weekEnd = end.toISOString().slice(0, 10);
      const price = divideHalfUp(group.cents * 100000n, group.grams);
      return {
        operationType: group.row.operationType,
        varietyId: group.row.varietyId,
        varietyName: group.row.varietyName,
        weekStart: group.row.weekStart,
        weekEnd,
        complete:
          group.row.weekStart >= from && weekEnd <= to && weekEnd < today,
        operationCount: group.operations.size,
        sacks: group.sacks,
        weightKg: `${group.grams / 1000n}.${String(group.grams % 1000n).padStart(3, '0')}`,
        merchandiseCents: group.cents.toString(),
        priceSolesPerKg: `${price / 10000n}.${String(price % 10000n).padStart(4, '0')}`,
        operationIds: [...group.operations].sort(),
        compensationIds: [...group.compensations].sort(),
      };
    })
    .sort(
      (a, b) =>
        a.weekStart.localeCompare(b.weekStart) ||
        a.varietyName.localeCompare(b.varietyName) ||
        a.operationType.localeCompare(b.operationType),
    );
  return { points, excluded };
}
