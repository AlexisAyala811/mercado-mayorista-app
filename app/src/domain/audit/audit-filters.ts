import { isValidCivilDate } from '@/domain/shared/date';

export type AuditFilters = { action: string; resourceType: string; from: string; to: string };
export type AuditEventFilters = { action?: string; resourceType?: string; from?: string; to?: string; fromDay?: string; toDay?: string };
export const emptyAuditFilters: AuditFilters = { action: '', resourceType: '', from: '', to: '' };

export function auditEventsFilters(filters: AuditFilters): AuditEventFilters {
  const action = filters.action.trim();
  const resourceType = filters.resourceType.trim();
  const fromDay = filters.from.trim();
  const toDay = filters.to.trim();
  if ((fromDay && !isValidCivilDate(fromDay)) || (toDay && !isValidCivilDate(toDay))) {
    throw new Error('Ingresa fechas válidas en formato AAAA-MM-DD.');
  }
  if (fromDay && toDay && fromDay > toDay) throw new Error('La fecha inicial no puede ser posterior a la final.');
  if (action.length > 100 || resourceType.length > 80) throw new Error('La acción admite hasta 100 caracteres y el recurso hasta 80.');
  return { action: action || undefined, resourceType: resourceType || undefined, fromDay: fromDay || undefined, toDay: toDay || undefined };
}
