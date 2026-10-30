import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource,EntityManager } from 'typeorm';
import { AnalyticsService } from './analytics.service.js';

describe('readiness snapshots', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-07T03:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });
  it('uses a business-scoped variety and a full-history window separate from descriptive filters', async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce([{ id: 'v-1', name: 'Canchán' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const service = new AnalyticsService({ transaction:async(_isolation:string,work:(manager:EntityManager)=>unknown)=>work({query} as unknown as EntityManager) } as unknown as DataSource);
    const result = await service.readiness('business-a', {
      asOf: '2026-10-06',
      varietyId: 'v-1',
    });
    expect(query.mock.calls[0]?.[1]).toEqual(['business-a', 'v-1']);
    expect(query.mock.calls[1]?.[1]).toEqual([
      'business-a',
      'v-1',
      '2026-04-06',
      '2026-10-06',
      '2026-10-04',
    ]);
    expect(query.mock.calls[1]?.[0]).toContain('s.voided_at >=');
    expect(query.mock.calls[1]?.[0]).toContain('sr.created_at <');
    expect(result.weeks).toHaveLength(26);
    expect(result.dataSufficient).toBe(false);
  });
  it('does not fetch another business history when the requested variety is unavailable', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const service = new AnalyticsService({ transaction:async(_isolation:string,work:(manager:EntityManager)=>unknown)=>work({query} as unknown as EntityManager) } as unknown as DataSource);
    await expect(
      service.readiness('business-a', {
        asOf: '2026-10-06',
        varietyId: 'foreign-variety',
      }),
    ).rejects.toThrow(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });
  it('rejects a future cutoff before reading a dataset', async () => {
    const query = vi.fn();
    const service = new AnalyticsService({ transaction:async(_isolation:string,work:(manager:EntityManager)=>unknown)=>work({query} as unknown as EntityManager) } as unknown as DataSource);
    await expect(
      service.readiness('business-a', { asOf: '2026-10-07', varietyId: 'v-1' }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(query).not.toHaveBeenCalled();
  });
});
