import {
  calculateAmountByBasis,
  type CommercialCalculationBasis,
} from '../../common/domain/commercial-calculation.js';
import { parseFixedDecimal } from '../../common/domain/fixed-decimal.js';

// Lots of a purchase settlement (spec 010): one per variety and quality of the
// active sacks, each with its own basis and price. A lot is a line of the
// settlement, never an inventory lot.

export const MAX_PURCHASE_LOTS = 20;

export class PurchaseLotsError extends Error {
  constructor(
    message: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export type SackForLots = {
  varietyId: string;
  varietyName: string;
  qualityId: string | null;
  qualityName: string | null;
  netWeightKg: string;
};

export type LotGroup = {
  letter: string;
  varietyId: string;
  varietyName: string;
  qualityId: string | null;
  qualityName: string | null;
  sacks: number;
  // Net weight in thousandths of a kilogram.
  netWeight: bigint;
};

export type LotOrder = {
  varietyId: string;
  qualityId: string | null;
  priceBasis: CommercialCalculationBasis;
  unitPriceCents: number;
  name?: string | null;
};

export type PlannedLot = LotGroup & {
  name: string | null;
  priceBasis: CommercialCalculationBasis;
  unitPriceCents: bigint;
  amountCents: bigint;
};

export type FreightChargeParty = 'provider' | 'wholesaler';

const groupKey = (varietyId: string, qualityId: string | null) =>
  `${varietyId}|${qualityId ?? ''}`;

// Letters follow variety name, then quality name (no quality last), then ids,
// so the tablet and the server label the same groups the same way.
export function groupSacks(sacks: readonly SackForLots[]): LotGroup[] {
  const groups = new Map<string, Omit<LotGroup, 'letter'>>();
  for (const sack of sacks) {
    const key = groupKey(sack.varietyId, sack.qualityId);
    const group = groups.get(key) ?? {
      netWeight: 0n,
      qualityId: sack.qualityId,
      qualityName: sack.qualityName,
      sacks: 0,
      varietyId: sack.varietyId,
      varietyName: sack.varietyName,
    };
    group.sacks += 1;
    group.netWeight += parseFixedDecimal(sack.netWeightKg, 3, 11);
    groups.set(key, group);
  }
  if (groups.size > MAX_PURCHASE_LOTS)
    throw new PurchaseLotsError(
      `La compra tiene más de ${MAX_PURCHASE_LOTS} combinaciones de variedad y calidad.`,
    );
  return [...groups.values()]
    .sort(
      (a, b) =>
        a.varietyName.localeCompare(b.varietyName, 'es') ||
        compareQuality(a.qualityName, b.qualityName) ||
        a.varietyId.localeCompare(b.varietyId) ||
        (a.qualityId ?? '').localeCompare(b.qualityId ?? ''),
    )
    .map((group, index) => ({
      ...group,
      letter: String.fromCharCode(65 + index),
    }));
}

function compareQuality(a: string | null, b: string | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b, 'es');
}

// The order must declare exactly one lot per group: none missing, none extra,
// none repeated. Each lot is rounded on its own before adding up the gross.
export function planPurchaseLots(
  groups: readonly LotGroup[],
  orders: readonly LotOrder[],
): { lots: PlannedLot[]; grossCents: bigint } {
  const expected = new Map(
    groups.map((group) => [groupKey(group.varietyId, group.qualityId), group]),
  );
  const declared = new Map<string, LotOrder>();
  const repeated: string[] = [];
  const unexpected: string[] = [];
  for (const order of orders) {
    const key = groupKey(order.varietyId, order.qualityId);
    if (declared.has(key)) repeated.push(key);
    else if (!expected.has(key)) unexpected.push(key);
    declared.set(key, order);
  }
  const missing = [...expected.keys()].filter((key) => !declared.has(key));
  if (repeated.length || unexpected.length || missing.length)
    throw new PurchaseLotsError(
      'Los lotes deben cubrir cada variedad y calidad de los sacos una sola vez.',
      {
        expected: groups.map((group) => ({
          letter: group.letter,
          qualityId: group.qualityId,
          varietyId: group.varietyId,
        })),
        missing,
        repeated,
        unexpected,
      },
    );

  const lots = groups.map((group) => {
    const order = declared.get(groupKey(group.varietyId, group.qualityId))!;
    const unitPriceCents = BigInt(order.unitPriceCents);
    return {
      ...group,
      amountCents: calculateAmountByBasis(
        order.priceBasis,
        unitPriceCents,
        group.sacks,
        group.netWeight,
      ),
      name: order.name?.trim() || null,
      priceBasis: order.priceBasis,
      unitPriceCents,
    };
  });
  return {
    grossCents: lots.reduce((sum, lot) => sum + lot.amountCents, 0n),
    lots,
  };
}

// Freight paid by the wholesaler is not deducted from the provider; it stays
// as the pending freight owed to the carrier in both cases.
export function purchaseLiquidCents(input: {
  grossCents: bigint;
  freightCents: bigint;
  advancesCents: bigint;
  discountsCents: bigint;
  freightChargedTo: FreightChargeParty;
}) {
  const freight =
    input.freightChargedTo === 'provider' ? input.freightCents : 0n;
  return (
    input.grossCents - freight - input.advancesCents - input.discountsCents
  );
}
