import { ConflictException } from '@nestjs/common';
import type {
  DataSource,
  EntityManager,
  ObjectLiteral,
  Repository,
} from 'typeorm';

import {
  CashDirection,
  CashMovementEntity,
} from '../accounts/entities/cash-movement.entity.js';
import type { AuditService } from '../audit/audit.service.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import {
  FreightEntryEntity,
  FreightEntryState,
} from './entities/freight-entry.entity.js';
import { FreightSettlementEntity } from './entities/freight-settlement.entity.js';
import { FreightService } from './freight.service.js';

const identity: SessionIdentity = {
  businessId: 'business-1',
  businessName: 'Negocio de prueba',
  username: 'mayorista',
  expiresAt: new Date('2099-01-01T00:00:00Z'),
  role: UserRole.Wholesaler,
  sessionId: 'session-1',
  userId: 'user-1',
};

function repository<T extends ObjectLiteral>(
  overrides: Partial<Repository<T>> = {},
) {
  return {
    create: vi.fn((value) => value),
    findOne: vi.fn(),
    save: vi.fn(async (value) => value),
    ...overrides,
  } as unknown as Repository<T>;
}

describe('FreightService', () => {
  it('settles pending freight entries once and creates one cash outflow', async () => {
    const entries = [
      { id: 'entry-b', amountCents: '250', state: FreightEntryState.Pending },
      { id: 'entry-a', amountCents: '100', state: FreightEntryState.Pending },
    ] as FreightEntryEntity[];
    const findEntry = vi.fn(async ({ where }: { where: { id: string } }) =>
      entries.find((entry) => entry.id === where.id),
    );
    const entryRepository = repository<FreightEntryEntity>({
      findOne: findEntry as never,
    });
    const settlementRepository = repository<FreightSettlementEntity>({
      findOne: vi.fn().mockResolvedValue(null) as never,
      save: vi.fn().mockImplementation(async (value) => ({
        id: 'settlement-1',
        ...value,
      })) as never,
    });
    const createCash = vi.fn((value) => value);
    const cashRepository = repository<CashMovementEntity>({
      create: createCash as never,
    });
    const manager = {
      getRepository: vi.fn((entity) => {
        if (entity === FreightEntryEntity) return entryRepository;
        if (entity === FreightSettlementEntity) return settlementRepository;
        if (entity === CashMovementEntity) return cashRepository;
        throw new Error('Unexpected repository');
      }),
      query: vi.fn(),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(async (work) => work(manager)),
    } as unknown as DataSource;
    const recordAudit = vi.fn();
    const audit = { record: recordAudit } as unknown as AuditService;
    const service = new FreightService(
      dataSource,
      audit,
      entryRepository,
      settlementRepository,
    );

    const result = await service.settle(identity, {
      clientOperationId: 'operation-1',
      entryIds: ['entry-b', 'entry-a'],
      settledOn: '2026-09-25',
    });

    expect(result).toMatchObject({
      id: 'settlement-1',
      totalAmountCents: '350',
    });
    expect(findEntry).toHaveBeenNthCalledWith(1, {
      lock: { mode: 'pessimistic_write' },
      where: { businessId: 'business-1', id: 'entry-a' },
    });
    expect(entries).toEqual([
      expect.objectContaining({
        settlementId: 'settlement-1',
        state: FreightEntryState.Settled,
      }),
      expect.objectContaining({
        settlementId: 'settlement-1',
        state: FreightEntryState.Settled,
      }),
    ]);
    expect(createCash).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: '350',
        direction: CashDirection.Out,
        sourceId: 'settlement-1',
      }),
    );
    expect(recordAudit).toHaveBeenCalledWith(
      manager,
      expect.objectContaining({ action: 'freight.settled' }),
    );
  });

  function retryFixture() {
    const repeated = {
      id: 'settlement-existing',
      settledOn: '2026-09-25',
    } as FreightSettlementEntity;
    const findEntry = vi.fn();
    const settlementRepository = repository<FreightSettlementEntity>({
      findOne: vi.fn().mockResolvedValue(repeated) as never,
    });
    const entryRepository = repository<FreightEntryEntity>({
      find: vi.fn().mockResolvedValue([{ id: 'entry-a' }]) as never,
      findOne: findEntry as never,
    });
    const manager = {
      getRepository: vi.fn((entity) =>
        entity === FreightSettlementEntity
          ? settlementRepository
          : entryRepository,
      ),
      query: vi.fn(),
    } as unknown as EntityManager;
    const dataSource = {
      transaction: vi.fn(async (work) => work(manager)),
    } as unknown as DataSource;
    const service = new FreightService(
      dataSource,
      { record: vi.fn() } as unknown as AuditService,
      entryRepository,
      settlementRepository,
    );
    return { findEntry, repeated, service };
  }

  it('returns the first result when the client operation is retried', async () => {
    const { findEntry, repeated, service } = retryFixture();
    await expect(
      service.settle(identity, {
        clientOperationId: 'operation-1',
        entryIds: ['entry-a'],
        settledOn: '2026-09-25',
      }),
    ).resolves.toBe(repeated);
    expect(findEntry).not.toHaveBeenCalled();
  });

  it('rejects a retried identifier that settles different entries', async () => {
    const { findEntry, service } = retryFixture();
    await expect(
      service.settle(identity, {
        clientOperationId: 'operation-1',
        entryIds: ['entry-a', 'entry-b'],
        settledOn: '2026-09-25',
      }),
    ).rejects.toThrow(ConflictException);
    expect(findEntry).not.toHaveBeenCalled();
  });
});
