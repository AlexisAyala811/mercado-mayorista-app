/** Read only historical labels. Current catalogs must never reclassify a receipt. */
export interface ReceiptCharacteristics {
  qualityId?: string | null;
  qualityName?: string | null;
  originId?: string | null;
  originName?: string | null;
}

export function receiptCharacteristics(value: ReceiptCharacteristics) {
  const label = (id: string | null | undefined, name: string | null | undefined) =>
    name?.trim() || (id ? 'Referencia no disponible' : 'No informada');
  return `Calidad: ${label(value.qualityId, value.qualityName)} · Procedencia: ${label(value.originId, value.originName)}`;
}

export function receiptCharacteristicsVersion(sourceVersion: string) {
  return `${sourceVersion}:characteristics-v1`;
}

export function receiptSackGroups<T extends ReceiptCharacteristics & {
  varietyId: string;
  netWeightKg: string;
}>(sacks: T[]) {
  const grouped = new Map<string, { source: T; sacks: number; weight: bigint }>();
  for (const sack of sacks) {
    const key = JSON.stringify([
      sack.varietyId,
      sack.qualityId ?? null,
      sack.qualityName ?? null,
      sack.originId ?? null,
      sack.originName ?? null,
    ]);
    const current = grouped.get(key) ?? { source: sack, sacks: 0, weight: 0n };
    const [whole = '0', decimals = ''] = sack.netWeightKg.split('.');
    current.sacks += 1;
    current.weight += BigInt(whole) * 1000n + BigInt(decimals.padEnd(3, '0'));
    grouped.set(key, current);
  }
  return [...grouped.values()];
}
