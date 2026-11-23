import { ConflictException, NotFoundException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

import { CashDirection, CashMovementEntity } from '../../accounts/entities/cash-movement.entity.js';
import type { AuditService } from '../../../shared/audit/audit.service.js';
import { UserRole } from '../../identity/entities/user.entity.js';
import { PurchaseSettlementEntity } from '../../reception-and-purchases/purchase/entities/purchase-settlement.entity.js';
import { SaleEntity } from '../../sales/entities/sale.entity.js';
import { memoryManager } from '../../../../test/support/memory-manager.js';
import {
  StowageActivity,
  StowageEntryEntity,
  StowageEntryState,
  StowageOperationType,
} from './entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from './entities/stowage-settlement.entity.js';
import { WorkGroupEntity } from './entities/work-group.entity.js';
import { StowageService } from './stowage.service.js';

// Spec 017 (T1705): stowage rules without a database. Money is summed in
// BigInt cents, a settlement and its cash movement are written together, and
// a retried operation returns the first result or answers 409.
const identity = {
  businessId: 'business-1',
  businessName: 'Mercado',
  expiresAt: new Date(Date.now() + 60_000),
  role: UserRole.Wholesaler,
  sessionId: 'session-1',
  userId: 'user-1',
  username: 'Mayorista',
};
const op = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

function build() {
  const db = memoryManager();
  db.rows(WorkGroupEntity).push({ businessId: 'business-1', id: 'group-1', isActive: true, name: 'Cuadrilla A' });
  db.rows(PurchaseSettlementEntity).push({ businessId: 'business-1', id: 'purchase-1' });
  db.rows(SaleEntity).push({ businessId: 'business-1', id: 'sale-1' });
  const record = jest.fn().mockResolvedValue(undefined);
  const service = new StowageService(
    db.dataSource,
    { record } as unknown as AuditService,
    db.repository(WorkGroupEntity) as never,
    db.repository(StowageEntryEntity) as never,
  );
  return { db, record, service };
}
const entry = (overrides: Partial<Record<string, unknown>> = {}) => ({
  activity: StowageActivity.Unload,
  amountCents: 2500,
  clientOperationId: op(1),
  occurredOn: '2026-11-18',
  operationId: 'purchase-1',
  operationType: StowageOperationType.Purchase,
  workGroupId: 'group-1',
  ...overrides,
}) as never;

describe('StowageService', () => {
  it('records a pending entry for a purchase of the business, with its audit event', async () => {
    const { db, record, service } = build();
    const created = await service.createEntry(identity, entry());
    expect(created).toMatchObject({ amountCents: '2500', state: StowageEntryState.Pending, settlementId: null });
    expect(db.queries[0]?.sql).toContain('pg_advisory_xact_lock');
    expect(record).toHaveBeenCalledWith(db.manager, expect.objectContaining({ action: 'stowage.entry-created' }));
  });

  it('returns the first entry on a retry and answers 409 when the same id carries other data', async () => {
    const { db, service } = build();
    const first = await service.createEntry(identity, entry());
    await expect(service.createEntry(identity, entry())).resolves.toEqual(first);
    await expect(service.createEntry(identity, entry({ amountCents: 9999 }))).rejects.toBeInstanceOf(ConflictException);
    expect(db.rows(StowageEntryEntity)).toHaveLength(1);
  });

  it('rejects an inactive group or an operation of another business', async () => {
    const { db, service } = build();
    db.rows(WorkGroupEntity)[0]!.isActive = false;
    await expect(service.createEntry(identity, entry())).rejects.toBeInstanceOf(NotFoundException);
    db.rows(WorkGroupEntity)[0]!.isActive = true;
    await expect(service.createEntry(identity, entry({ operationType: StowageOperationType.Sale, operationId: 'sale-of-other' }))).rejects.toThrow('Operación de origen no encontrada.');
  });

  it('settles pending entries in one go: exact total in cents, entries settled and cash out', async () => {
    const { db, record, service } = build();
    const a = await service.createEntry(identity, entry({ amountCents: 2500, clientOperationId: op(1) }));
    const b = await service.createEntry(identity, entry({ amountCents: 1999, clientOperationId: op(2), operationType: StowageOperationType.Sale, operationId: 'sale-1' }));
    const settlement = await service.settle(identity, { clientOperationId: op(3), entryIds: [b.id, a.id], settledOn: '2026-11-18' } as never);
    expect(settlement.totalAmountCents).toBe('4499');
    expect(db.rows(StowageEntryEntity).map((row) => [row.state, row.settlementId])).toEqual([[StowageEntryState.Settled, settlement.id], [StowageEntryState.Settled, settlement.id]]);
    expect(db.rows(CashMovementEntity)).toEqual([expect.objectContaining({ amountCents: '4499', direction: CashDirection.Out, sourceId: settlement.id, sourceType: 'stowage-settlement' })]);
    expect(record).toHaveBeenLastCalledWith(db.manager, expect.objectContaining({ action: 'stowage.settled', details: { entryCount: 2, totalAmountCents: '4499' } }));
  });

  it('replays a settlement and refuses to settle an entry twice', async () => {
    const { db, service } = build();
    const a = await service.createEntry(identity, entry());
    const input = { clientOperationId: op(4), entryIds: [a.id], settledOn: '2026-11-18' } as never;
    const first = await service.settle(identity, input);
    await expect(service.settle(identity, input)).resolves.toEqual(first);
    await expect(service.settle(identity, { clientOperationId: op(4), entryIds: [a.id], settledOn: '2026-11-19' } as never)).rejects.toBeInstanceOf(ConflictException);
    await expect(service.settle(identity, { clientOperationId: op(5), entryIds: [a.id], settledOn: '2026-11-18' } as never)).rejects.toThrow('Un registro de estiba ya fue liquidado.');
    expect(db.rows(StowageSettlementEntity)).toHaveLength(1);
    expect(db.rows(CashMovementEntity)).toHaveLength(1);
  });

  it('answers 404 for an entry that does not exist', async () => {
    const { service } = build();
    await expect(service.settle(identity, { clientOperationId: op(6), entryIds: ['missing'], settledOn: '2026-11-18' } as never)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates, lists and deactivates groups within the business, and maps a duplicate name to 409', async () => {
    const { db, service } = build();
    const created = await service.createGroup(identity, { name: 'Cuadrilla B' });
    expect(created).toMatchObject({ businessId: 'business-1', isActive: true, name: 'Cuadrilla B' });
    expect((await service.listGroups('business-1', { limit: 50, offset: 0 })).total).toBe(2);
    expect((await service.listGroups('business-2', { limit: 50, offset: 0 })).total).toBe(0);
    await service.deactivateGroup(identity, created.id);
    await expect(service.deactivateGroup(identity, created.id)).rejects.toBeInstanceOf(NotFoundException);
    expect((await service.listEntries('business-1', { limit: 50, offset: 0 })).items).toEqual([]);

    const duplicate = new QueryFailedError('INSERT', [], Object.assign(new Error('duplicate'), { code: '23505' }));
    const failing = new StowageService({ transaction: async () => { throw duplicate; } } as never, {} as never, {} as never, {} as never);
    await expect(failing.createGroup(identity, { name: 'Cuadrilla A' })).rejects.toThrow('Ya existe un grupo activo con ese nombre.');
    expect(db.rows(WorkGroupEntity)).toHaveLength(2);
  });
});
