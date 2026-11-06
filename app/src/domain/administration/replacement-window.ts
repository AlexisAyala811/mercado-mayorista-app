// Spec 011 (T1143, CL-FM17): the Wholesaler authorises the Encargado from the
// tablet for a duration that starts now, never longer than 24 hours.
export const replacementDurations = [2, 4, 8, 12, 24] as const;
export type ReplacementDuration = (typeof replacementDurations)[number];

export function replacementWindow(now: number, hours: ReplacementDuration) {
  if (!replacementDurations.includes(hours)) throw new Error('El reemplazo dura como máximo 24 horas.');
  return { startsAt: new Date(now).toISOString(), expiresAt: new Date(now + hours * 3_600_000).toISOString() };
}

export function formatReplacementTime(iso: string) {
  return new Date(iso).toLocaleString('es-PE', { timeZone: 'America/Lima', dateStyle: 'short', timeStyle: 'short' });
}

// Called when the Wholesaler confirms, so the window starts at that moment.
export function replacementWindowFromNow(hours: ReplacementDuration) {
  return replacementWindow(Date.now(), hours);
}
