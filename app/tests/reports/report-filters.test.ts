import { operationOverview, priceHistory, reportAlerts } from '../../src/services/api/operations-api';

describe('price history filters', () => {
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'http://localhost:3000/api/v1';
    jest.restoreAllMocks();
  });

  afterAll(() => {
    process.env.EXPO_PUBLIC_API_URL = originalUrl;
  });

  it('sends the selected variety and counterparties to the central report', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ generatedAt: '2026-09-30T00:00:00.000Z', items: [] }), { status: 200 }),
    );

    await priceHistory('token', '2026-09-01', '2026-09-30', {
      buyerId: '22222222-2222-4222-8222-222222222222',
      providerId: '33333333-3333-4333-8333-333333333333',
      varietyId: '11111111-1111-4111-8111-111111111111',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/reports/price-history?from=2026-09-01&to=2026-09-30&varietyId=11111111-1111-4111-8111-111111111111&providerId=33333333-3333-4333-8333-333333333333&buyerId=22222222-2222-4222-8222-222222222222',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }),
    );
  });

  it('requests financial alerts without a stock threshold', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ accountAlerts: [] }), { status: 200 }));
    await reportAlerts('token', '2026-10-01', '2026-10-08');
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/reports/alerts?asOf=2026-10-01&through=2026-10-08', expect.anything());
  });
  it('keeps exact monetary strings and scopes the overview request to the selected operation', async () => {
    const payload = { totalAmountCents: '9007199254740993', currentBalanceCents: '7000', operation: 'purchase', balanceScope: 'current-for-period-operations' };
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const result = await operationOverview('token', 'purchase', '2026-10-01', '2026-10-17');
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith('http://localhost:3000/api/v1/reports/operation-overview?operation=purchase&from=2026-10-01&to=2026-10-17', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer token' }) }));
  });
});
