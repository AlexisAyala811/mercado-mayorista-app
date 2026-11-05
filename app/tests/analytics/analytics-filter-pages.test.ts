import { apiRequest } from '@/services/api/api-client';
import { analyticsSeries, loadAnalyticsFilters, predictionReadiness } from '@/services/api/analytics-api';
jest.mock('@/services/api/api-client', () => ({ apiRequest: jest.fn() }));
beforeEach(() => jest.resetAllMocks());

it('loads every historical page including inactive records beyond the first hundred', async () => {
  jest.mocked(apiRequest).mockImplementation(async path => {
    const url = new URL(path, 'http://local.test');
    const offset = Number(url.searchParams.get('offset'));
    return { total: 101, items: Array.from({ length: offset ? 1 : 100 }, (_, index) => ({ id: `${url.pathname}-${offset + index}`, name: 'Histórico', isActive: offset === 0 })) };
  });
  const filters = await loadAnalyticsFilters('token');
  for (const [kind, items] of Object.entries(filters)) {
    expect(items).toHaveLength(101);
    expect(items[100]!.isActive).toBe(false);
    expect(apiRequest).toHaveBeenCalledWith(`/analytics/filters/${kind}?limit=100&offset=100`, { token: 'token' });
  }
  expect(apiRequest).toHaveBeenCalledTimes(10);
});

it('does not return a partial historical catalog when a later page fails', async () => {
  jest.mocked(apiRequest).mockImplementation(async path => {
    if (path.includes('offset=100')) throw new Error('network');
    return { total: 101, items: Array.from({ length: 100 }, (_, index) => ({ id: `${path}-${index}`, name: 'Histórico', isActive: true })) };
  });
  await expect(loadAnalyticsFilters('token')).rejects.toThrow('network');
});

it('encodes independent descriptive characteristics and never forwards them to readiness', async () => {
  await analyticsSeries('token', { from: '2026-10-01', to: '2026-10-14', qualityId: 'unreported', originId: 'origin-id' });
  const url = new URL(jest.mocked(apiRequest).mock.calls[0]![0], 'http://local.test');
  expect(url.searchParams.get('qualityId')).toBe('unreported');
  expect(url.searchParams.get('originId')).toBe('origin-id');
  await predictionReadiness('token', '2026-10-14', 'variety-id');
  expect(apiRequest).toHaveBeenLastCalledWith('/analytics/readiness?asOf=2026-10-14&varietyId=variety-id', { token: 'token' });
});
