// Spec 011 (CL-FM11): the scale is read by hand and weights are exact, so the
// tablet captures gross and tare in whole kilograms. The domain and the API keep
// three decimals; older sacks with decimals are only rounded on screen.
const wholeKilograms = /^\d{1,7}$/;

export function parseWholeKilograms(value: string): bigint | null {
  const trimmed = value.trim();
  return wholeKilograms.test(trimmed) ? BigInt(trimmed) : null;
}

export type SackWeightInput = { grossWeightKg: string; tareKg: string };

export function validateSackWeights(gross: string, tare: string): { ok: true; value: SackWeightInput } | { ok: false; message: string } {
  const grossKg = parseWholeKilograms(gross);
  const tareKg = parseWholeKilograms(tare.trim() ? tare : '0');
  if (grossKg === null || tareKg === null) return { ok: false, message: 'Ingresa el bruto y la tara en kilos enteros, sin decimales.' };
  if (grossKg <= tareKg) return { ok: false, message: 'El peso bruto debe ser mayor que la tara.' };
  return { ok: true, value: { grossWeightKg: grossKg.toString(), tareKg: tareKg.toString() } };
}

// "52.000" → 52 000 grams; anything unexpected is treated as zero for display.
function grams(value: string): bigint {
  const match = /^(\d+)(?:\.(\d{1,3}))?$/.exec(value.trim());
  return match ? BigInt(match[1]!) * 1000n + BigInt((match[2] ?? '').padEnd(3, '0')) : 0n;
}

function roundedKilograms(totalGrams: bigint): bigint {
  return (totalGrams + 500n) / 1000n;
}

export function formatKilograms(value: string): string {
  return `${roundedKilograms(grams(value))} kg`;
}

// Draft value for correcting a sack: whole kilograms as typed on the tablet.
export function kilogramsDraft(value: string): string {
  return roundedKilograms(grams(value)).toString();
}

export function summarizeWholeKilograms(netWeights: readonly string[]) {
  const total = netWeights.reduce((sum, weight) => sum + grams(weight), 0n);
  const count = BigInt(netWeights.length);
  // Average to one decimal, half up, from the exact total.
  const tenths = count ? (total * 10n / count + 500n) / 1000n : 0n;
  return {
    sackCountDisplay: String(netWeights.length),
    totalWeightDisplay: `${roundedKilograms(total)} kg`,
    averageWeightDisplay: `${tenths / 10n}.${tenths % 10n} kg`,
  };
}
