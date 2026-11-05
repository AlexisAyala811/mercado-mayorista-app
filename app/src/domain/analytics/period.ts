import { isValidCivilDate } from '@/domain/shared/date';

export function validateAnalyticsPeriod(from: string, to: string): string | null {
  if (!isValidCivilDate(from) || !isValidCivilDate(to)) return 'Escribe fechas válidas con el formato AAAA-MM-DD.';
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000;
  return days < 0 || days > 365 ? 'Selecciona un periodo ordenado de hasta 366 días.' : null;
}
