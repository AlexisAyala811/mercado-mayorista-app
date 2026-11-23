import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../../modules/identity/entities/user.entity.js';
import { CatalogCache } from './catalog-cache.js';
import { CatalogService } from './catalog.service.js';
import type { BuyerEntity } from './entities/buyer.entity.js';
import type { PotatoVarietyEntity } from './entities/potato-variety.entity.js';
import type { ProviderEntity } from './entities/provider.entity.js';

// Spec 013: the catalogs are read from memory and a change drops them.
describe('CatalogService with cache', () => {
  const identity = (businessId: string) => ({
    businessId,
    businessName: 'Mercado',
    expiresAt: new Date(Date.now() + 60_000),
    role: UserRole.Wholesaler,
    sessionId: 'session-1',
    userId: 'user-1',
    username: 'Mayorista',
  });
  const page = { limit: 50, offset: 0 };

  function build() {
    const findProviders = jest.fn().mockResolvedValue([[{ id: 'p1', name: 'Aurelio' }], 1]);
    const findBuyers = jest.fn().mockResolvedValue([[], 0]);
    const update = jest.fn().mockResolvedValue({ affected: 1 });
    const manager = { getRepository: () => ({ update }) } as unknown as EntityManager;
    const dataSource = { transaction: (work: (m: EntityManager) => Promise<unknown>) => work(manager) } as unknown as DataSource;
    const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
    const service = new CatalogService(
      dataSource,
      audit,
      { findAndCount: findProviders } as unknown as Repository<ProviderEntity>,
      { findAndCount: jest.fn().mockResolvedValue([[], 0]) } as unknown as Repository<PotatoVarietyEntity>,
      { findAndCount: findBuyers } as unknown as Repository<BuyerEntity>,
      new CatalogCache(),
    );
    return { findBuyers, findProviders, service };
  }

  it('queries the database once for the same page of the same business', async () => {
    const { findProviders, service } = build();
    const first = await service.listProviders('business-1', page);
    const second = await service.listProviders('business-1', page);
    expect(second).toEqual(first);
    expect(findProviders).toHaveBeenCalledTimes(1);
  });

  it('never serves one business the page of another', async () => {
    const { findProviders, service } = build();
    await service.listProviders('business-1', page);
    await service.listProviders('business-2', page);
    expect(findProviders).toHaveBeenCalledTimes(2);
    expect(findProviders.mock.calls.map(([options]) => options.where.businessId)).toEqual(['business-1', 'business-2']);
  });

  it('reads again after a change of that catalog, and leaves the others cached', async () => {
    const { findBuyers, findProviders, service } = build();
    await service.listProviders('business-1', page);
    await service.listBuyers('business-1', page);
    await service.deactivateProvider(identity('business-1'), 'p1');
    await service.listProviders('business-1', page);
    await service.listBuyers('business-1', page);
    expect(findProviders).toHaveBeenCalledTimes(2);
    expect(findBuyers).toHaveBeenCalledTimes(1);
  });

  it('drops the pages even when the change is rejected', async () => {
    const { findProviders, service } = build();
    await service.listProviders('business-1', page);
    await expect(service.updateProvider(identity('business-1'), 'p1', {})).rejects.toThrow();
    await service.listProviders('business-1', page);
    expect(findProviders).toHaveBeenCalledTimes(2);
  });
});
