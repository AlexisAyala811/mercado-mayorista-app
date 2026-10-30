import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import type { AuditService } from '../audit/audit.service.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { PurchaseSettlementState } from './entities/purchase-settlement.entity.js';
import { PurchaseService } from './purchase.service.js';

describe('PurchaseService', () => {
  it('rejects a stale purchase version before applying compensating effects', async () => {
    const settlement = {
      businessId: 'business-1',
      id: 'purchase-1',
      state: PurchaseSettlementState.Confirmed,
      version: 4,
      voidOperationId: null,
    };
    const repository = { findOne: vi.fn().mockResolvedValue(settlement) };
    const manager = {
      getRepository: vi.fn().mockReturnValue(repository),
      query: vi.fn().mockResolvedValue(undefined),
    } as unknown as EntityManager;
    const transaction = vi.fn(
      async (callback: (value: EntityManager) => Promise<unknown>) =>
        callback(manager),
    );
    const service = new PurchaseService(
      { transaction } as unknown as DataSource,
      { record: vi.fn() } as unknown as AuditService,
    );

    const promise = service.void(
      {
        businessId: 'business-1',
        businessName: 'Mercado',
        expiresAt: new Date(),
        role: UserRole.Wholesaler,
        sessionId: 'session-1',
        userId: 'user-1',
        username: 'Mayorista',
      },
      'purchase-1',
      {
        clientOperationId: 'operation-1',
        expectedPurchaseVersion: 3,
        expectedReceptionVersion: 2,
        reason: 'Error',
      },
    );

    await expect(promise).rejects.toBeInstanceOf(ConflictException);
    expect(repository.findOne).toHaveBeenCalledOnce();
  });
});
