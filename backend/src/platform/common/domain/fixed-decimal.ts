const decimalPattern = /^\d+(?:\.(\d+))?$/;
const signedDecimalPattern = /^-?\d+(?:\.(\d+))?$/;

export function parseFixedDecimal(
  value: string,
  scale: number,
  maximumIntegerDigits: number,
): bigint {
  return parse(value, scale, maximumIntegerDigits, false);
}

export function parseSignedFixedDecimal(
  value: string,
  scale: number,
  maximumIntegerDigits: number,
): bigint {
  return parse(value, scale, maximumIntegerDigits, true);
}

function parse(
  value: string,
  scale: number,
  maximumIntegerDigits: number,
  signed: boolean,
) {
  const match = (signed ? signedDecimalPattern : decimalPattern).exec(value);
  if (!match) throw new Error('invalid-decimal');
  const negative = value.startsWith('-');
  const absolute = negative ? value.slice(1) : value;
  const [integerPart, fractionalPart = ''] = absolute.split('.');
  if (
    integerPart!.length > maximumIntegerDigits ||
    fractionalPart.length > scale
  )
    throw new Error('invalid-decimal');
  const paddedFraction = fractionalPart.padEnd(scale, '0');
  const parsed =
    BigInt(integerPart!) * 10n ** BigInt(scale) + BigInt(paddedFraction || '0');
  return negative ? -parsed : parsed;
}

export function formatFixedDecimal(value: bigint, scale: number): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const divisor = 10n ** BigInt(scale);
  const integer = absolute / divisor;
  const fraction = (absolute % divisor).toString().padStart(scale, '0');
  return `${sign}${integer}.${fraction}`;
}

export function multiplyAndRoundHalfUp(
  quantity: bigint,
  centsPerUnit: bigint,
  quantityScale: number,
): bigint {
  const divisor = 10n ** BigInt(quantityScale);
  const product = quantity * centsPerUnit;
  return (product + divisor / 2n) / divisor;
}
