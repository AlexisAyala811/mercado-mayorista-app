import type { SackEntryView } from './components/sack-entry-row';

// Fixed row height for the weighing list: FlatList can jump to any sack
// without measuring the rows before it (spec 011, T1122).
export const sackRowHeight = 64;

// null: nothing usable typed; -1: no current sack with that number.
export function findSackIndex(entries: readonly SackEntryView[], typed: string): number | null {
  const trimmed = typed.trim();
  if (!/^\d{1,6}$/.test(trimmed)) return null;
  const sequence = Number(trimmed);
  return entries.findIndex((entry) => entry.sequence === sequence);
}
