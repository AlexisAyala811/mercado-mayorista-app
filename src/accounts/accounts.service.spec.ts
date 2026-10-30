import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { AccountsService } from './accounts.service.js';
import {
  AccountEntity,
  AccountKind,
  AccountState,
} from './entities/account.entity.js';
import {
  AccountInstallmentEntity,
  InstallmentState,
} from './entities/account-installment.entity.js';
import { AccountPaymentEntity } from './entities/account-payment.entity.js';
import { AccountPaymentAllocationEntity } from './entities/account-payment-allocation.entity.js';
import {
  CashDirection,
  CashMovementEntity,
} from './entities/cash-movement.entity.js';

function fixture(kind = AccountKind.Receivable) {
  const account = {
    id: 'account',
    balanceCents: '1000',
    state: AccountState.Open,
    version: 2,
    kind,
  };
  const installments = [
    { id: 'oldest', balanceCents: '300', state: InstallmentState.Open },
    { id: 'latest', balanceCents: '700', state: InstallmentState.Open },
  ];
  const mockRepository = () => ({
    exists: vi.fn().mockResolvedValue(false),
    findOneByOrFail: vi.fn(),
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockResolvedValue([]),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'payment', ...value })),
  });
  const accounts = mockRepository();
  accounts.findOne.mockResolvedValue(account);
  const schedules = mockRepository();
  schedules.find.mockResolvedValue(installments);
  const payments = mockRepository();
  const allocations = mockRepository();
  const cash = mockRepository();
  const repositories = new Map<unknown, ReturnType<typeof mockRepository>>([
    [AccountEntity, accounts],
    [AccountInstallmentEntity, schedules],
    [AccountPaymentEntity, payments],
    [AccountPaymentAllocationEntity, allocations],
    [CashMovementEntity, cash],
  ]);
  const manager = {
    query: vi.fn(),
    getRepository: (entity: unknown) => {
      const repository = repositories.get(entity);
      if (!repository) throw new Error('Unexpected repository');
      return repository;
    },
  } as unknown as EntityManager;
  const dataSource = {
    transaction: async (work: (manager: EntityManager) => Promise<unknown>) =>
      work(manager),
  } as DataSource;
  const audit = { record: vi.fn() };
  const service = new AccountsService(
    dataSource,
    audit as unknown as AuditService,
    accounts as unknown as Repository<AccountEntity>,
    schedules as unknown as Repository<AccountInstallmentEntity>,
    payments as unknown as Repository<AccountPaymentEntity>,
  );
  const identity: SessionIdentity = {
    businessId: 'business',
    userId: 'user',
    sessionId: 'session',
    businessName: 'Negocio de prueba',
    username: 'mayorista',
    expiresAt: new Date('2099-01-01T00:00:00Z'),
    role: UserRole.Wholesaler,
  };
  const input = {
    clientOperationId: 'operation',
    amountCents: 500,
    expectedAccountVersion: 2,
  };
  return {
    service,
    identity,
    input,
    account,
    installments,
    accounts,
    schedules,
    payments,
    allocations,
    cash,
    audit,
  };
}

describe('Account payments', () => {
  it.each([
    [AccountKind.Receivable, CashDirection.In],
    [AccountKind.Payable, CashDirection.Out],
  ])(
    'allocates oldest dues first and records the correct cash direction for %s',
    async (kind, direction) => {
      const f = fixture(kind);
      await f.service.registerPayment(f.identity, 'account', f.input);
      expect(f.schedules.find).toHaveBeenCalledWith({
        where: { accountId: 'account', state: InstallmentState.Open },
        order: { dueOn: 'ASC' },
      });
      expect(f.installments.map((item) => item.balanceCents)).toEqual([
        '0',
        '500',
      ]);
      expect(
        f.allocations.create.mock.calls.map(
          ([allocation]) => allocation.amountCents,
        ),
      ).toEqual(['300', '200']);
      expect(f.account).toMatchObject({ balanceCents: '500', version: 3 });
      expect(f.cash.create).toHaveBeenCalledWith(
        expect.objectContaining({ amountCents: '500', direction }),
      );
    },
  );

  it('rejects overpayment before writing payment or cash', async () => {
    const f = fixture();
    await expect(
      f.service.registerPayment(f.identity, 'account', {
        ...f.input,
        amountCents: 1001,
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    expect(f.payments.save).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
  });

  it('rejects a stale account version before any financial effect', async () => {
    const f = fixture();
    await expect(
      f.service.registerPayment(f.identity, 'account', {
        ...f.input,
        expectedAccountVersion: 1,
      }),
    ).rejects.toThrow(ConflictException);
    expect(f.payments.save).not.toHaveBeenCalled();
    expect(f.accounts.save).not.toHaveBeenCalled();
  });

  it('returns an already confirmed payment without applying it again', async () => {
    const f = fixture();
    const confirmed = {
      id: 'confirmed-payment',
      accountId: 'account',
      amountCents: '500',
      isReversal: false,
    };
    f.payments.findOne.mockResolvedValue(confirmed);
    await expect(
      f.service.registerPayment(f.identity, 'account', f.input),
    ).resolves.toBe(confirmed);
    expect(f.accounts.findOne).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
    expect(f.audit.record).not.toHaveBeenCalled();
  });

  it.each([
    ['another account', { accountId: 'other-account' }],
    ['another amount', { amountCents: '400' }],
    ['a reversal', { isReversal: true }],
  ])(
    'rejects an operation identifier already used for %s',
    async (_case, difference) => {
      const f = fixture();
      f.payments.findOne.mockResolvedValue({
        id: 'confirmed-payment',
        accountId: 'account',
        amountCents: '500',
        isReversal: false,
        ...difference,
      });
      await expect(
        f.service.registerPayment(f.identity, 'account', f.input),
      ).rejects.toThrow(ConflictException);
      expect(f.accounts.findOne).not.toHaveBeenCalled();
      expect(f.cash.save).not.toHaveBeenCalled();
    },
  );

  it('rejects a reversal whose identifier belongs to a regular payment', async () => {
    const f = fixture();
    f.payments.findOne.mockResolvedValue({
      id: 'confirmed-payment',
      accountId: 'account',
      amountCents: '500',
      isReversal: false,
      reversedPaymentId: null,
    });
    await expect(
      f.service.reversePayment(f.identity, 'account', 'confirmed-payment', {
        clientOperationId: 'operation',
        expectedAccountVersion: 2,
        reason: 'Error de digitación',
      }),
    ).rejects.toThrow(ConflictException);
    expect(f.cash.save).not.toHaveBeenCalled();
  });
});

describe('Account payment reversals', () => {
  function reversalFixture(kind = AccountKind.Receivable) {
    const f = fixture(kind);
    f.account.balanceCents = '500';
    f.payments.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'original',
      amountCents: '500',
    });
    f.allocations.find.mockResolvedValue([
      { installmentId: 'oldest', amountCents: '300' },
      { installmentId: 'latest', amountCents: '200' },
    ]);
    const schedules = [
      {
        id: 'oldest',
        initialAmountCents: '300',
        balanceCents: '0',
        state: InstallmentState.Paid,
      },
      {
        id: 'latest',
        initialAmountCents: '700',
        balanceCents: '500',
        state: InstallmentState.Open,
      },
    ];
    f.schedules.findOneByOrFail.mockImplementation(async ({ id }) =>
      schedules.find((item) => item.id === id),
    );
    const input = {
      clientOperationId: 'reversal-operation',
      expectedAccountVersion: 2,
      reason: 'Pago registrado por error',
    };
    return {
      ...f,
      restoredSchedules: schedules,
      reverse: () =>
        f.service.reversePayment(f.identity, 'account', 'original', input),
    };
  }

  it.each([
    [AccountKind.Receivable, CashDirection.Out],
    [AccountKind.Payable, CashDirection.In],
  ])(
    'restores the original allocations and compensates cash for %s',
    async (kind, direction) => {
      const f = reversalFixture(kind);
      await f.reverse();
      expect(f.restoredSchedules.map((item) => item.balanceCents)).toEqual([
        '300',
        '700',
      ]);
      expect(f.account).toMatchObject({
        balanceCents: '1000',
        version: 3,
        state: AccountState.Open,
      });
      expect(f.schedules.findOneByOrFail).toHaveBeenCalledWith({
        id: 'oldest',
        accountId: 'account',
      });
      expect(f.payments.create).toHaveBeenCalledWith(
        expect.objectContaining({
          isReversal: true,
          reversedPaymentId: 'original',
          amountCents: '500',
        }),
      );
      expect(f.cash.create).toHaveBeenCalledWith(
        expect.objectContaining({
          direction,
          amountCents: '500',
          category: 'account-payment-reversal',
        }),
      );
    },
  );

  it('rejects a second reversal without financial writes', async () => {
    const f = reversalFixture();
    f.payments.exists.mockResolvedValue(true);
    await expect(f.reverse()).rejects.toThrow(ConflictException);
    expect(f.payments.save).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
  });

  it('rejects incomplete allocations instead of restoring inconsistent balances', async () => {
    const f = reversalFixture();
    f.allocations.find.mockResolvedValue([
      { installmentId: 'oldest', amountCents: '300' },
    ]);
    await expect(f.reverse()).rejects.toThrow(
      'La distribución del pago no coincide',
    );
    expect(f.payments.save).not.toHaveBeenCalled();
    expect(f.accounts.save).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
  });
});
