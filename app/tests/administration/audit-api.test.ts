import { apiRequest } from '@/services/api/api-client';
import { listAuditEvents } from '@/services/api/administration-api';
jest.mock('@/services/api/api-client', () => ({ apiRequest: jest.fn() }));
it('requests a bounded page with exact filters and session credentials', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ items: [], total: 0, offset: 40, limit: 20 });
  await listAuditEvents('audit-session', { action: 'sale.created', fromDay: '2026-10-26', toDay: '2026-10-26' }, 40);
  expect(apiRequest).toHaveBeenCalledWith('/audit/events?limit=20&offset=40&action=sale.created&fromDay=2026-10-26&toDay=2026-10-26', { token: 'audit-session' });
});
