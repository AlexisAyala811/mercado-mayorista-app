import { isValidCivilDate } from '@/domain/shared/date';

type CostEntry = { id: string; state: string; amountCents: string };
export function reviewCostSettlement(entries: readonly CostEntry[], selectedIds: readonly string[], settledOn: string) {
  const invalid = (message: string) => ({ kind: 'invalid' as const, message });
  if (!isValidCivilDate(settledOn))
    return invalid('Ingresa una fecha válida con formato AAAA-MM-DD.');
  if (!selectedIds.length) return invalid('Selecciona al menos un registro pendiente.');
  if (new Set(selectedIds).size !== selectedIds.length) return invalid('La selección contiene registros repetidos. Revisa los costos.');
  let total = 0n;
  for (const id of selectedIds) {
    const entry = entries.find(item => item.id === id);
    if (!entry || entry.state !== 'pending') return invalid('Un registro seleccionado ya no está pendiente o no está disponible. Actualiza los costos.');
    if (!/^\d+$/.test(entry.amountCents)) return invalid('No se pudo comprobar un importe seleccionado. Actualiza los costos.');
    total += BigInt(entry.amountCents);
  }
  return { kind: 'ready' as const, settledOn, entryIds: [...selectedIds], entryCount: selectedIds.length, totalAmountCents: total.toString() };
}
