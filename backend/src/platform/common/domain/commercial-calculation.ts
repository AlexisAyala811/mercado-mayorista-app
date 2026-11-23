import { multiplyAndRoundHalfUp } from './fixed-decimal.js';

export type CommercialCalculationBasis = 'kilogram' | 'sack';

export function calculateAmountByBasis(
  basis: CommercialCalculationBasis,
  rateCents: bigint,
  sacks: number,
  weightThousandthsKg: bigint,
) {
  return basis === 'kilogram'
    ? multiplyAndRoundHalfUp(weightThousandthsKg, rateCents, 3)
    : BigInt(sacks) * rateCents;
}
