import { auditEventsFilters, emptyAuditFilters } from '@/domain/audit/audit-filters';
it.each(['0000-01-01', '2026-02-30', '2026-1-02', 'not-a-date'])('rejects invalid civil day %s', from => {
  expect(() => auditEventsFilters({ ...emptyAuditFilters, from })).toThrow('fechas válidas');
});
it('rejects reversed dates and oversized exact filters', () => {
  expect(() => auditEventsFilters({ ...emptyAuditFilters, from: '2026-10-27', to: '2026-10-26' })).toThrow('posterior');
  expect(() => auditEventsFilters({ ...emptyAuditFilters, action: 'a'.repeat(101) })).toThrow('100');
});
it('preserves civil days for the server timezone and supports open date limits', () => {
  expect(auditEventsFilters({ ...emptyAuditFilters, action: ' sale.created ', to: ' 2028-02-29 ' })).toEqual({ action: 'sale.created', resourceType: undefined, fromDay: undefined, toDay: '2028-02-29' });
});
