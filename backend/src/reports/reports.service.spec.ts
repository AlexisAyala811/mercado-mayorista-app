import { UnprocessableEntityException } from '@nestjs/common';
import type { DataSource } from 'typeorm';

import { ReportsService } from './reports.service.js';

describe('ReportsService', () => {
  it('returns commercial and financial amounts without querying or reporting stock', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ count: '1', amount: '50000' }])
      .mockResolvedValueOnce([{ count: '2', amount: '10000' }])
      .mockResolvedValueOnce([{ balance: '7000' }])
      .mockResolvedValueOnce([{ balance: '8000' }])
      .mockResolvedValueOnce([{ incoming: '10000', outgoing: '30000' }])
      .mockResolvedValueOnce([
        { purchaseFreight: '1000', saleFreight: '500', stowage: '200' },
      ]);
    const service = new ReportsService({ query } as unknown as DataSource);
    const result = await service.commercialSummary('business-1', {
      from: '2026-10-01',
      to: '2026-10-07',
    });
    expect(result).toMatchObject({
      purchases: { count: 1, liquidAmountCents: '50000' },
      sales: { count: 2, totalAmountCents: '10000' },
      accounts: { payableBalanceCents: '7000', receivableBalanceCents: '8000' },
      cash: { netCents: '-20000' },
      costs: {
        purchaseFreightCents: '1000',
        saleFreightCents: '500',
        stowageCents: '200',
      },
    });
    expect(result).not.toHaveProperty('inventory');
    expect(
      query.mock.calls.every(
        ([sql, parameters]) =>
          !sql.includes('inventory_lots') && parameters[0] === 'business-1',
      ),
    ).toBe(true);
  });

  it('keeps overdue financial alerts and never reads low-stock data', async () => {
    const accounts = [
      { accountId: 'account', status: 'overdue', balanceCents: '8000' },
    ];
    const query = vi.fn().mockResolvedValue(accounts);
    const service = new ReportsService({ query } as unknown as DataSource);
    const result = await service.alerts('business-1', {
      asOf: '2026-10-07',
      through: '2026-10-14',
    });
    expect(result.accountAlerts).toEqual(accounts);
    expect(result).not.toHaveProperty('lowStockAlerts');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0]![0]).not.toContain('inventory_lots');
    expect(query.mock.calls[0]![1]).toEqual([
      'business-1',
      '2026-10-14',
      '2026-10-07',
    ]);
  });
  it('uses the requested date as the overdue cutoff', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new ReportsService({ query } as unknown as DataSource);

    await service.overdueAccounts('business-1', { asOf: '2026-09-25' });

    expect(query).toHaveBeenCalledWith(expect.any(String), [
      'business-1',
      '2026-09-25',
    ]);
    expect(query.mock.calls[0]![0]).toContain('i.due_on < $2');
  });

  it('rejects an alert window ending before its explicit cutoff', async () => {
    const query = vi.fn();
    const service = new ReportsService({ query } as unknown as DataSource);

    await expect(
      service.alerts('business-1', {
        asOf: '2026-09-25',
        through: '2026-09-24',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(query).not.toHaveBeenCalled();
  });
});
