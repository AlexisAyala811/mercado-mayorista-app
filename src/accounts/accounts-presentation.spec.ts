import type { DataSource, Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service.js';
import { AccountsService } from './accounts.service.js';
import {
  AccountEntity,
  AccountKind,
  AccountState,
} from './entities/account.entity.js';
import type { AccountInstallmentEntity } from './entities/account-installment.entity.js';
import type { AccountPaymentEntity } from './entities/account-payment.entity.js';

function fixture() {
  const account = {
    id: 'account-id',
    businessId: 'business-id',
    counterpartyType: 'provider',
    counterpartyId: 'provider-id',
    kind: AccountKind.Payable,
    state: AccountState.Open,
    balanceCents: '1000',
    version: 2,
    updatedAt: new Date('2026-10-15T14:00:00Z'),
  };
  const accounts = {
    findAndCount: vi.fn().mockResolvedValue([[account], 1]),
    findOne: vi.fn().mockResolvedValue(account),
  };
  const query = vi
    .fn()
    .mockResolvedValue([
      { id: account.id, counterpartyName: 'Proveedor histórico', projectionVersion: 2, nextDueOn: '2026-10-20' },
    ]);
  const service = new AccountsService(
    { query } as unknown as DataSource,
    {} as AuditService,
    accounts as unknown as Repository<AccountEntity>,
    {
      find: vi.fn().mockResolvedValue([]),
    } as unknown as Repository<AccountInstallmentEntity>,
    {
      find: vi.fn().mockResolvedValue([]),
    } as unknown as Repository<AccountPaymentEntity>,
  );
  return { service, accounts, query, account };
}
it('preserves page and account data while projecting a historical name', async () => {
  const { service, account, query } = fixture();
  const page = await service.list('business-id', { limit: 20, offset: 0 });
  expect(page).toMatchObject({
    total: 1,
    limit: 20,
    offset: 0,
    items: [{ ...account, counterpartyName: 'Proveedor histórico', nextDueOn: '2026-10-20', lastMovementAt: account.updatedAt }],
  });
  expect(query.mock.calls[0][1]).toEqual(['business-id', ['account-id']]);
  expect(account).not.toHaveProperty('counterpartyName');
});
it('uses the same projection for detail without contacts or invented names', async () => {
  const { service, query } = fixture();
  query.mockResolvedValueOnce([{ id: 'account-id', counterpartyName: null, projectionVersion: 2, nextDueOn: null }]);
  const detail = await service.get('business-id', 'account-id');
  expect(detail.account.counterpartyName).toBeNull();
  expect(detail.account).not.toHaveProperty('phone');
  expect(detail.installments).toEqual([]);
});
it('does not query counterparties for empty pages or nonexistent accounts', async () => {
  const { service, accounts, query } = fixture();
  accounts.findAndCount.mockResolvedValueOnce([[], 0]);
  expect(
    (await service.list('business-id', { limit: 20, offset: 0 })).items,
  ).toEqual([]);
  accounts.findOne.mockResolvedValueOnce(null);
  await expect(service.get('business-id', 'unknown')).rejects.toThrow(
    'Cuenta no encontrada',
  );
  expect(query).not.toHaveBeenCalled();
});

it('rejects a changed projection rather than mixing an old balance with new installments', async () => {
  const { service, query } = fixture();
  query.mockResolvedValueOnce([{ id: 'account-id', counterpartyName: 'Proveedor histórico', projectionVersion: 3, nextDueOn: '2026-11-01' }]);
  await expect(service.list('business-id', { limit: 20, offset: 0 })).rejects.toThrow('Las cuentas cambiaron');
});

it('does not report the creation timestamp as a later financial movement', async () => {
  const { service, account, query } = fixture();
  account.version = 0;
  query.mockResolvedValueOnce([{ id: account.id, counterpartyName: null, projectionVersion: 0, nextDueOn: null }]);
  const result = await service.list('business-id', { limit: 20, offset: 0 });
  expect(result.items[0]).toMatchObject({ nextDueOn: null, lastMovementAt: null });
});
