import type { DataSource, EntityManager } from 'typeorm';
import type { AuditService } from '../audit/audit.service.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { ReceptionEntity, ReceptionState } from '../reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import { WeighingService } from '../reception/weighing.service.js';
import { PurchaseService } from './purchase.service.js';
import { PaymentMode, CalculationBasis, PurchaseSettlementEntity } from './entities/purchase-settlement.entity.js';
import { CashMovementEntity } from '../accounts/entities/cash-movement.entity.js';
import { AccountEntity } from '../accounts/entities/account.entity.js';
import { AccountInstallmentEntity } from '../accounts/entities/account-installment.entity.js';
import { FreightEntryEntity } from '../freight/entities/freight-entry.entity.js';

type Row = Record<string, unknown>;
function repository(initial: Row[] = []) {
  const rows = [...initial];
  const save = vi.fn(async (value: Row | Row[]) => {
    for (const row of Array.isArray(value) ? value : [value]) { row.id ??= `row-${rows.length + 1}`; if (!rows.includes(row)) rows.push(row); }
    return value;
  });
  const builder = { innerJoinAndSelect: vi.fn(), where: vi.fn(), andWhere: vi.fn(), setLock: vi.fn(), getOne: vi.fn(async () => rows[0] ?? null) };
  for (const method of ['innerJoinAndSelect', 'where', 'andWhere', 'setLock'] as const) builder[method].mockReturnValue(builder);
  return { rows, save, create: (value: Row | Row[]) => value, createQueryBuilder: () => builder,
    find: vi.fn(async () => rows.filter(row => !row.voidedAt)),
    findOne: vi.fn(async (options: { where: Row }) => rows.find(row => Object.entries(options.where).every(([key, value]) => key === 'voidedAt' ? !row.voidedAt : row[key] === value)) ?? null),
  };
}
function setup(state = ReceptionState.Weighed) {
  const reception = { id: 'reception', businessId: 'business', providerId: 'provider', vehicleId: null, version: 2, state, expectedVarieties: [{ id: 'variety' }], closeOperationId: null };
  const sacks = [{ id: 'sack-1', businessId: 'business', receptionId: 'reception', sequence: 1, varietyId: 'variety', netWeightKg: '10.000', grossWeightKg: '10.000', tareKg: '0.000', voidedAt: null }, { id: 'sack-2', businessId: 'business', receptionId: 'reception', sequence: 2, varietyId: 'variety', netWeightKg: '20.000', grossWeightKg: '20.000', tareKg: '0.000', voidedAt: null }];
  const receipts = repository([reception]); const detail = repository(sacks); const purchases = repository(); const cash = repository(); const accounts = repository(); const installments = repository(); const freight = repository();
  const allowed = new Map<unknown, ReturnType<typeof repository>>([[ReceptionEntity, receipts], [ReceptionSackEntity, detail], [PurchaseSettlementEntity, purchases], [CashMovementEntity, cash], [AccountEntity, accounts], [AccountInstallmentEntity, installments], [FreightEntryEntity, freight]]);
  const manager = { query: vi.fn(async () => undefined), getRepository: vi.fn((entity: unknown) => { const result = allowed.get(entity); if (!result) throw new Error('Unexpected repository: inventory must not be accessed'); return result; }) } as unknown as EntityManager;
  const dataSource = { transaction: async (action: (value: EntityManager) => Promise<unknown>) => action(manager) } as unknown as DataSource;
  const record = vi.fn(); const audit = { record } as unknown as AuditService;
  return { reception, sacks, receipts, detail, purchases, cash, accounts, installments, freight, record, weighing: new WeighingService(dataSource, audit), purchase: new PurchaseService(dataSource, audit) };
}
const identity: SessionIdentity = { businessId: 'business', businessName: 'Mercado', userId: 'user', username: 'Mayorista', role: UserRole.Wholesaler, sessionId: 'session', expiresAt: new Date('2030-01-01') };
const agreement = { clientOperationId: 'settle-operation', expectedReceptionVersion: 2, unitPriceCents: 500, priceBasis: CalculationBasis.Kilogram, freightBasis: CalculationBasis.Kilogram, freightRateCents: 100, advancesCents: 1000, discountsCents: 500, paymentMode: PaymentMode.Cash, installments: [] };

it('closes weighing once and preserves totals without creating stock', async () => {
  const f = setup(ReceptionState.Weighing);
  const input = { clientOperationId: 'close-operation', expectedReceptionVersion: 2 };
  await f.weighing.close(identity, 'reception', input); await f.weighing.close(identity, 'reception', input);
  expect(f.reception).toMatchObject({ state: ReceptionState.Weighed, version: 3 });
  expect(f.receipts.save).toHaveBeenCalledTimes(1);
  expect(f.record).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ details: { varietyCount: 1, sackCount: 2, totalWeightKg: '30.000' } }));
});

it('corrects a closed sack while preserving its original without looking for a pending lot', async () => {
  const f = setup(); const input = { clientOperationId: 'correct-operation', expectedReceptionVersion: 2, varietyId: 'variety', grossWeightKg: '16', tareKg: '1', reason: 'Corrección autorizada' };
  const result = await f.weighing.correctClosed(identity, 'reception', 'sack-1', input);
  await f.weighing.correctClosed(identity, 'reception', 'sack-1', input);
  expect(result).toMatchObject({ correctedFromSackId: 'sack-1', netWeightKg: '15.000', sequence: 1 });
  expect(f.sacks[0]!.voidedAt).toBeInstanceOf(Date); expect(f.reception.version).toBe(3);
  expect(f.detail.rows.filter(row => !row.voidedAt)).toHaveLength(2);
});

it('settles cash and reverses it once without an inventory repository', async () => {
  const f = setup(); const result = await f.purchase.settle(identity, 'reception', agreement);
  await f.purchase.settle(identity, 'reception', agreement);
  expect(result).toMatchObject({ grossAmountCents: '15000', freightAmountCents: '3000', liquidAmountCents: '10500' });
  expect(f.cash.rows).toHaveLength(1); expect(f.freight.rows[0]).toMatchObject({ derivedSacks: 2, derivedWeightKg: '30.000' });
  const input = { clientOperationId: 'void-operation', expectedPurchaseVersion: 0, expectedReceptionVersion: 3, reason: 'Anulación autorizada' };
  await f.purchase.void(identity, String(result.id), input); await f.purchase.void(identity, String(result.id), input);
  expect(f.cash.rows).toHaveLength(2);
  expect(f.cash.rows.map(row => [row.direction, row.amountCents])).toEqual([['out', '10500'], ['in', '10500']]);
});

it('creates credit terms from the conserved weighing without valuing lots', async () => {
  const f = setup(); await f.purchase.settle(identity, 'reception', { ...agreement, paymentMode: PaymentMode.Credit, installments: [{ dueOn: '2026-11-01', amountCents: 10500 }] });
  expect(f.cash.rows).toHaveLength(0);
  expect(f.accounts.rows[0]).toMatchObject({ balanceCents: '10500', kind: 'payable' });
  expect(f.installments.rows[0]).toMatchObject({ initialAmountCents: '10500', dueOn: '2026-11-01' });
});
