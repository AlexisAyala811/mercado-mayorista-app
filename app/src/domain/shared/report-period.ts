import { formatLocalDateInput } from './date';

export type ReportPeriodPreset = 'current-month' | 'previous-month' | 'custom';
export const reportPeriodChoices = [
  { id: 'current-month', label: 'Mes actual' },
  { id: 'previous-month', label: 'Mes anterior' },
  { id: 'custom', label: 'Personalizado' },
] as const;

export function reportPeriod(preset: Exclude<ReportPeriodPreset, 'custom'>, today = new Date()) {
  const year = today.getFullYear();
  const month = today.getMonth();
  return preset === 'previous-month'
    ? { from: formatLocalDateInput(new Date(year, month - 1, 1)), to: formatLocalDateInput(new Date(year, month, 0)) }
    : { from: formatLocalDateInput(new Date(year, month, 1)), to: formatLocalDateInput(today) };
}
