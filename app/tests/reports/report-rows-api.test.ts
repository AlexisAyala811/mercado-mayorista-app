import { apiRequest } from '@/services/api/api-client';
import { listReportRows } from '@/services/api/report-rows-api';
jest.mock('@/services/api/api-client', () => ({ apiRequest: jest.fn() }));
it('requests twenty rows from the selected operation and period with the current token', async () => {
  jest.mocked(apiRequest).mockResolvedValue({ total: '0', items: [] });
  await listReportRows('session', { operation: 'purchase', from: '2026-10-01', to: '2026-10-19' }, 'detail', 40);
  expect(apiRequest).toHaveBeenCalledWith('/reports/rows?operation=purchase&from=2026-10-01&to=2026-10-19&report=detail&limit=20&offset=40', { token: 'session' });
});
