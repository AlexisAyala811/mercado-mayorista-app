import { formatLocalDateInput } from './date';

// Spec 011 (CL-ST18): «Hoy», «Esta semana», «Este mes» and «Personalizado» of
// the Stitch reports; «Mes anterior» stays in the period dialog.
export type ReportPeriodPreset = 'today' | 'this-week' | 'current-month' | 'previous-month' | 'custom';
export const reportPeriodChoices = [
  { id: 'today', label: 'Hoy' },
  { id: 'this-week', label: 'Esta semana' },
  { id: 'current-month', label: 'Mes actual' },
  { id: 'previous-month', label: 'Mes anterior' },
  { id: 'custom', label: 'Personalizado' },
] as const;

export function reportPeriod(preset: Exclude<ReportPeriodPreset, 'custom'>, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  if (preset === 'today') return { from: formatLocalDateInput(today), to: formatLocalDateInput(today) };
  // The week starts on Monday.
  if (preset === 'this-week') return { from: formatLocalDateInput(new Date(year, month, today.getDate() - ((today.getDay() + 6) % 7))), to: formatLocalDateInput(today) };
  return preset === 'previous-month'
    ? { from: formatLocalDateInput(new Date(year, month - 1, 1)), to: formatLocalDateInput(new Date(year, month, 0)) }
    : { from: formatLocalDateInput(new Date(year, month, 1)), to: formatLocalDateInput(today) };
}
