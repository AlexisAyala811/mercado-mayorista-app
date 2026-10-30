import { randomUUID } from 'node:crypto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';
import { AccountsService } from '../src/accounts/accounts.service.js';
import {
  AccountEntity,
  AccountKind,
  AccountState,
} from '../src/accounts/entities/account.entity.js';
import {
  AccountInstallmentEntity,
  InstallmentState,
} from '../src/accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../src/accounts/entities/account-payment.entity.js';
import {
  CashMovementEntity,
  CashDirection,
} from '../src/accounts/entities/cash-movement.entity.js';
import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import { AuditService } from '../src/audit/audit.service.js';
import type { SessionIdentity } from '../src/identity/application/ports/session-identity-reader.js';
import { UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';

// Registered inside the migration suite so every scenario starts after migration
// completion, without racing another runner to create the schema.
export function registerAccountDatabaseScenarios(
  getDataSource: () => DataSource,
) {
  async function fixture(installmentAmount = '1000') {
    const dataSource = getDataSource();
    const businessId = randomUUID();
    const userId = randomUUID();
    await dataSource.query(
      'INSERT INTO businesses (id, display_name) VALUES ($1, $2)',
      [businessId, 'E2E cuentas'],
    );
    const passwordHash = await new PasswordHasher().hash(randomUUID());
    await dataSource.query(
      'INSERT INTO users (id, business_id, username, password_hash, role) VALUES ($1, $2, $3, $4, $5)',
      [userId, businessId, `e2e-${userId}`, passwordHash, UserRole.Wholesaler],
    );
    const accounts = dataSource.getRepository(AccountEntity);
    const installments = dataSource.getRepository(AccountInstallmentEntity);
    const payments = dataSource.getRepository(AccountPaymentEntity);
    const cash = dataSource.getRepository(CashMovementEntity);
    const audit = dataSource.getRepository(AuditEventEntity);
    const account = await accounts.save(
      accounts.create({
        businessId,
        kind: AccountKind.Receivable,
        state: AccountState.Open,
        sourceType: 'e2e-fixture',
        sourceId: randomUUID(),
        counterpartyType: 'buyer',
        counterpartyId: randomUUID(),
        initialAmountCents: '1000',
        balanceCents: '1000',
        version: 0,
      }),
    );
    const installment = await installments.save(
      installments.create({
        accountId: account.id,
        dueOn: '2026-09-25',
        initialAmountCents: installmentAmount,
        balanceCents: installmentAmount,
        state: InstallmentState.Open,
      }),
    );
    const service = new AccountsService(
      dataSource,
      new AuditService(
        audit,
        new ConfigService({ EVIDENCE_RETENTION_YEARS: 5 }),
      ),
      accounts,
      installments,
      payments,
    );
    const identity: SessionIdentity = {
      businessId,
      userId,
      role: UserRole.Wholesaler,
      sessionId: randomUUID(),
      businessName: 'E2E cuentas',
      username: `e2e-${userId}`,
      expiresAt: new Date('2099-01-01T00:00:00Z'),
    };
    return {
      account,
      installment,
      accounts,
      installments,
      payments,
      cash,
      audit,
      service,
      identity,
    };
  }

  it('allows the same UUID for distinct cash categories but rejects duplicate effects within one category', async () => {
    const f = await fixture();
    const clientOperationId = randomUUID();
    await f.service.registerPayment(f.identity, f.account.id, {
      clientOperationId,
      amountCents: 100,
      expectedAccountVersion: 0,
    });
    const independentCashEffect = {
      businessId: f.identity.businessId,
      clientOperationId,
      createdByUserId: f.identity.userId,
      amountCents: '200',
      category: 'sale-collection',
      direction: CashDirection.In,
      sourceType: 'sale',
      sourceId: randomUUID(),
    };
    await f.cash.save(f.cash.create(independentCashEffect));
    await expect(
      f.cash.save(f.cash.create(independentCashEffect)),
    ).rejects.toMatchObject({
      driverError: {
        code: '23505',
        constraint: 'uq_cash_movements_business_category_operation',
      },
    });
    expect(
      await f.cash.countBy({
        businessId: f.identity.businessId,
        clientOperationId,
      }),
    ).toBe(2);
  });

  it('commits one payment, cash movement and audit event for simultaneous retries', async () => {
    const f = await fixture();
    const input = {
      clientOperationId: randomUUID(),
      amountCents: 400,
      expectedAccountVersion: 0,
    };
    const results = await Promise.all([
      f.service.registerPayment(f.identity, f.account.id, input),
      f.service.registerPayment(f.identity, f.account.id, input),
    ]);
    expect(results[0]!.id).toBe(results[1]!.id);
    expect(
      await f.payments.countBy({ businessId: f.identity.businessId }),
    ).toBe(1);
    expect(await f.cash.countBy({ businessId: f.identity.businessId })).toBe(1);
    expect(await f.audit.countBy({ businessId: f.identity.businessId })).toBe(
      1,
    );
    expect(
      await f.accounts.findOneByOrFail({ id: f.account.id }),
    ).toMatchObject({ balanceCents: '600', version: 1 });
  });

  it('rolls back payment, allocations and installment changes when dues do not cover the payment', async () => {
    const f = await fixture('300');
    await expect(
      f.service.registerPayment(f.identity, f.account.id, {
        clientOperationId: randomUUID(),
        amountCents: 500,
        expectedAccountVersion: 0,
      }),
    ).rejects.toThrow(ConflictException);
    expect(
      await f.payments.countBy({ businessId: f.identity.businessId }),
    ).toBe(0);
    expect(await f.cash.countBy({ businessId: f.identity.businessId })).toBe(0);
    expect(await f.audit.countBy({ businessId: f.identity.businessId })).toBe(
      0,
    );
    expect(
      await f.accounts.findOneByOrFail({ id: f.account.id }),
    ).toMatchObject({ balanceCents: '1000', version: 0 });
    expect(
      await f.installments.findOneByOrFail({ id: f.installment.id }),
    ).toMatchObject({ balanceCents: '300', state: InstallmentState.Open });
  });

  it('restores balances with compensating cash and rejects another business', async () => {
    const f = await fixture();
    const payment = await f.service.registerPayment(f.identity, f.account.id, {
      clientOperationId: randomUUID(),
      amountCents: 1000,
      expectedAccountVersion: 0,
    });
    const reversalInput = {
      clientOperationId: randomUUID(),
      expectedAccountVersion: 1,
      reason: 'Corrección E2E',
    };
    const reversal = await f.service.reversePayment(
      f.identity,
      f.account.id,
      payment.id,
      reversalInput,
    );
    expect(
      (
        await f.service.reversePayment(
          f.identity,
          f.account.id,
          payment.id,
          reversalInput,
        )
      ).id,
    ).toBe(reversal.id);
    expect(
      await f.accounts.findOneByOrFail({ id: f.account.id }),
    ).toMatchObject({
      balanceCents: '1000',
      version: 2,
      state: AccountState.Open,
    });
    expect(
      await f.installments.findOneByOrFail({ id: f.installment.id }),
    ).toMatchObject({ balanceCents: '1000', state: InstallmentState.Open });
    const movements = await f.cash.findBy({
      businessId: f.identity.businessId,
    });
    expect(movements).toHaveLength(2);
    expect(movements.map((item) => item.direction).sort()).toEqual(
      [CashDirection.In, CashDirection.Out].sort(),
    );
    expect(movements.every((item) => item.amountCents === '1000')).toBe(true);
    await expect(f.service.get(randomUUID(), f.account.id)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      f.service.registerPayment(
        { ...f.identity, businessId: randomUUID() },
        f.account.id,
        {
          clientOperationId: randomUUID(),
          amountCents: 1,
          expectedAccountVersion: 2,
        },
      ),
    ).rejects.toThrow(NotFoundException);
    expect(
      await f.payments.countBy({ businessId: f.identity.businessId }),
    ).toBe(2);
  });
}
