export function divideHalfUp(numerator: bigint, denominator: bigint) {
  if (numerator < 0n || denominator <= 0n) {
    throw new Error('La división proporcional requiere valores no negativos.');
  }
  return (numerator * 2n + denominator) / (denominator * 2n);
}

export function allocateProportionally(total: bigint, weights: bigint[]) {
  if (total < 0n || weights.some((weight) => weight < 0n)) {
    throw new Error('La distribución proporcional no admite valores negativos.');
  }
  if (!weights.length) return [];
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0n);
  if (totalWeight === 0n) {
    if (total !== 0n) throw new Error('No se puede distribuir sin peso.');
    return weights.map(() => 0n);
  }
  let allocated = 0n;
  return weights.map((weight, index) => {
    if (index === weights.length - 1) return total - allocated;
    const rounded = divideHalfUp(total * weight, totalWeight);
    const current = rounded < total - allocated ? rounded : total - allocated;
    allocated += current;
    return current;
  });
}
