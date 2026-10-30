import { BadRequestException } from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';

import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { CatalogService } from './catalog.service.js';
import type { PotatoVarietyEntity } from './entities/potato-variety.entity.js';
import type { ProviderEntity } from './entities/provider.entity.js';
import type { BuyerEntity } from './entities/buyer.entity.js';

describe('CatalogService', () => {
  const identity = {
    businessId: 'business-1',
    businessName: 'Mercado',
    expiresAt: new Date(Date.now() + 60_000),
    role: UserRole.Wholesaler,
    sessionId: 'session-1',
    userId: 'user-1',
    username: 'Mayorista',
  };

  it('always scopes catalog listings to the authenticated business', async () => {
    const findProviders = vi.fn().mockResolvedValue([[], 0]);
    const findVarieties = vi.fn().mockResolvedValue([[], 0]);
    const findBuyers = vi.fn().mockResolvedValue([[], 0]);
    const service = new CatalogService(
      {} as never,
      {} as never,
      { findAndCount: findProviders } as unknown as Repository<ProviderEntity>,
      {
        findAndCount: findVarieties,
      } as unknown as Repository<PotatoVarietyEntity>,
      { findAndCount: findBuyers } as unknown as Repository<BuyerEntity>,
    );

    await service.listProviders('business-1', { limit: 25, offset: 50 });
    await service.listVarieties('business-1', { limit: 25, offset: 50 });
    await service.listBuyers('business-1', { limit: 25, offset: 50 });

    expect(findProviders).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
        where: { businessId: 'business-1', isActive: true },
      }),
    );
    expect(findVarieties).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
        where: { businessId: 'business-1', isActive: true },
      }),
    );
    expect(findBuyers).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 50,
        take: 25,
        where: { businessId: 'business-1', isActive: true },
      }),
    );
  });

  it('creates a provider and its audit event in the same transaction', async () => {
    const provider = {
      businessId: 'business-1',
      id: 'provider-1',
      isActive: true,
      name: 'Proveedor',
      phone: null,
    };
    const repository = {
      create: vi.fn().mockReturnValue(provider),
      save: vi.fn().mockResolvedValue(provider),
    } as unknown as Repository<ProviderEntity>;
    const manager = {
      getRepository: vi.fn().mockReturnValue(repository),
    } as unknown as EntityManager;
    const transaction = vi.fn(
      async (callback: (value: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const record = vi.fn().mockResolvedValue(undefined);
    const service = new CatalogService(
      { transaction } as unknown as DataSource,
      { record } as unknown as AuditService,
      {} as Repository<ProviderEntity>,
      {} as Repository<PotatoVarietyEntity>,
      {} as Repository<BuyerEntity>,
    );

    await expect(
      service.createProvider(identity, { name: ' Proveedor ' }),
    ).resolves.toBe(provider);
    expect(record).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({
        action: 'provider.created',
        actorUserId: 'user-1',
        businessId: 'business-1',
      }),
    );
  });

  it('rejects empty updates before opening a transaction', async () => {
    const transaction = vi.fn();
    const service = new CatalogService(
      { transaction } as unknown as DataSource,
      {} as AuditService,
      {} as Repository<ProviderEntity>,
      {} as Repository<PotatoVarietyEntity>,
      {} as Repository<BuyerEntity>,
    );

    await expect(
      service.updateProvider(identity, 'provider-1', {}),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});
