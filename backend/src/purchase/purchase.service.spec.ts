import { ConflictException } from '@nestjs/common';
import type { DataSource, EntityManager } from 'typeorm';

import {
  AccountInstallmentEntity,
  InstallmentState,
} from '../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import {
  AccountEntity,
  AccountState,
} from '../accounts/entities/account.entity.js';
import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import type { AuditService } from '../audit/audit.service.js';
import { FreightEntryEntity } from '../freight/entities/freight-entry.entity.js';
import { UserRole } from '../identity/entities/user.entity.js';
import {
  ReceptionEntity,
  ReceptionState,
} from '../reception/entities/reception.entity.js';
import {
  PaymentMode,
  PurchaseSettlementEntity,
  PurchaseSettlementState,
} from './entities/purchase-settlement.entity.js';
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

  it('marks the installments of a voided credit purchase as voided, not paid', async () => {
    const installments = [
      { id: 'i-1', balanceCents: '600', state: InstallmentState.Open },
      { id: 'i-2', balanceCents: '0', state: InstallmentState.Paid },
    ];
    const repository = (overrides: Record<string, unknown> = {}) => ({
      findOne: vi.fn().mockResolvedValue(null),
      find: vi.fn().mockResolvedValue([]),
      save: vi.fn(async (value) => value),
      create: vi.fn((value) => value),
      ...overrides,
    });
    const paymentsQuery = {
      where: vi.fn().mockReturnThis(),
      andWhere: vi.fn().mockReturnThis(),
      getExists: vi.fn().mockResolvedValue(false),
    };
    const repositories = new Map<unknown, ReturnType<typeof repository>>([
      [
        PurchaseSettlementEntity,
        repository({
          findOne: vi.fn().mockResolvedValue({
            id: 'purchase-1',
            receptionId: 'reception-1',
            state: PurchaseSettlementState.Confirmed,
            version: 3,
            voidOperationId: null,
            paymentMode: PaymentMode.Credit,
            liquidAmountCents: '600',
          }),
        }),
      ],
      [
        ReceptionEntity,
        repository({
          findOne: vi.fn().mockResolvedValue({
            id: 'reception-1',
            state: ReceptionState.Settled,
            version: 2,
          }),
        }),
      ],
      [
        AccountEntity,
        repository({
          findOne: vi.fn().mockResolvedValue({
            id: 'account-1',
            state: AccountState.Open,
            balanceCents: '600',
            version: 1,
          }),
        }),
      ],
      [
        AccountPaymentEntity,
        repository({ createQueryBuilder: vi.fn(() => paymentsQuery) }),
      ],
      [FreightEntryEntity, repository()],
      [
        AccountInstallmentEntity,
        repository({ find: vi.fn().mockResolvedValue(installments) }),
      ],
      [CashMovementEntity, repository()],
    ]);
    const manager = {
      getRepository: (entity: unknown) => repositories.get(entity)!,
      query: vi.fn(),
    } as unknown as EntityManager;
    const service = new PurchaseService(
      {
        transaction: async (work: (value: EntityManager) => Promise<unknown>) =>
          work(manager),
      } as unknown as DataSource,
      { record: vi.fn() } as unknown as AuditService,
    );

    await service.void(
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
        reason: 'Error de digitación',
      },
    );

    expect(installments.map((item) => [item.state, item.balanceCents])).toEqual(
      [
        [InstallmentState.Voided, '0'],
        [InstallmentState.Voided, '0'],
      ],
    );
    expect(repositories.get(CashMovementEntity)!.save).not.toHaveBeenCalled();
  });
});
