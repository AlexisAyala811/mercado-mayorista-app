import { formatFixedDecimal, parseFixedDecimal } from './fixed-decimal.js';

export class SackWeightError extends Error {}

export type SackWeights = { gross: string; tare: string; net: string };

// Net = gross − tare with three decimals; an omitted tare counts as zero.
export function calculateSackWeights(
  grossInput: string,
  tareInput = '0',
): SackWeights {
  let gross: bigint;
  let tare: bigint;
  try {
    gross = parseFixedDecimal(grossInput, 3, 9);
    tare = parseFixedDecimal(tareInput, 3, 9);
  } catch {
    throw new SackWeightError('El peso debe tener hasta tres decimales.');
  }
  if (gross <= 0n || tare < 0n || tare >= gross)
    throw new SackWeightError('El peso neto debe ser mayor que cero.');
  return {
    gross: formatFixedDecimal(gross, 3),
    tare: formatFixedDecimal(tare, 3),
    net: formatFixedDecimal(gross - tare, 3),
  };
}
