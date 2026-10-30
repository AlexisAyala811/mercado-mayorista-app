import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';

import { AuditService } from '../audit/audit.service.js';
import { requireSameOperation } from '../common/domain/operation-replay.js';
import { toPage, type PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import {
  AccountEntity,
  AccountKind,
  AccountState,
} from './entities/account.entity.js';
import {
  AccountInstallmentEntity,
  InstallmentState,
} from './entities/account-installment.entity.js';
import { AccountPaymentAllocationEntity } from './entities/account-payment-allocation.entity.js';
import { AccountPaymentEntity } from './entities/account-payment.entity.js';
import {
  CashDirection,
  CashMovementEntity,
} from './entities/cash-movement.entity.js';
import type {
  RegisterPaymentDto,
  ReversePaymentDto,
} from './http/account.dto.js';

@Injectable()
export class AccountsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(AccountEntity)
    private readonly accounts: Repository<AccountEntity>,
    @InjectRepository(AccountInstallmentEntity)
    private readonly installments: Repository<AccountInstallmentEntity>,
    @InjectRepository(AccountPaymentEntity)
    private readonly payments: Repository<AccountPaymentEntity>,
  ) {}

  async list(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.accounts.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(await this.presentAccounts(businessId, items), total, page);
  }

  async listCashMovements(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.dataSource
      .getRepository(CashMovementEntity)
      .findAndCount({
        where: { businessId },
        order: { createdAt: 'DESC' },
        skip: page.offset,
        take: page.limit,
      });
    return toPage(items, total, page);
  }

  async get(businessId: string, id: string) {
    const account = await this.accounts.findOne({ where: { businessId, id } });
    if (!account) throw new NotFoundException('Cuenta no encontrada.');
    const [installments, payments] = await Promise.all([
      this.installments.find({
        where: { accountId: id },
        order: { dueOn: 'ASC' },
      }),
      this.payments.find({
        where: { accountId: id, businessId },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const [presented] = await this.presentAccounts(businessId, [account]);
    return { account: presented!, installments, payments };
  }

  private async presentAccounts(businessId: string, accounts: AccountEntity[]) {
    if (!accounts.length) return [];
    const names = await this.dataSource.query<
      { id: string; counterpartyName: string | null; projectionVersion: number; nextDueOn: string | null }[]
    >(
      `SELECT a.id, a.version AS "projectionVersion", COALESCE(p.name, b.name) AS "counterpartyName",
         (SELECT MIN(i.due_on)::text FROM account_installments i
          WHERE i.account_id = a.id AND i.state = 'open' AND i.balance_cents > 0
            AND a.state = 'open') AS "nextDueOn"
       FROM accounts a
       LEFT JOIN providers p ON a.counterparty_type = 'provider' AND p.id = a.counterparty_id AND p.business_id = a.business_id
       LEFT JOIN buyers b ON a.counterparty_type = 'buyer' AND b.id = a.counterparty_id AND b.business_id = a.business_id
       WHERE a.business_id = $1 AND a.id = ANY($2::uuid[])`,
      [businessId, accounts.map((account) => account.id)],
    );
    const byId = new Map(names.map((row) => [row.id, row]));
    if (accounts.some((account) => byId.get(account.id)?.projectionVersion !== account.version)) {
      throw new ConflictException('Las cuentas cambiaron durante la consulta. Actualiza para consultar saldos y vencimientos coherentes.');
    }
    return accounts.map((account) => ({
      id: account.id,
      businessId: account.businessId,
      kind: account.kind,
      state: account.state,
      sourceType: account.sourceType,
      sourceId: account.sourceId,
      counterpartyType: account.counterpartyType,
      counterpartyId: account.counterpartyId,
      initialAmountCents: account.initialAmountCents,
      balanceCents: account.balanceCents,
      version: account.version,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      counterpartyName: byId.get(account.id)?.counterpartyName ?? null,
      nextDueOn: byId.get(account.id)?.nextDueOn ?? null,
      lastMovementAt: account.version > 0 ? account.updatedAt : null,
    }));
  }

  async registerPayment(
    identity: SessionIdentity,
    accountId: string,
    input: RegisterPaymentDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const paymentRepository = manager.getRepository(AccountPaymentEntity);
      const existing = await paymentRepository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(
          existing.accountId === accountId &&
            !existing.isReversal &&
            existing.amountCents === String(input.amountCents),
        );
        return existing;
      }
      const accountRepository = manager.getRepository(AccountEntity);
      const account = await accountRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: accountId },
      });
      if (!account) throw new NotFoundException('Cuenta no encontrada.');
      requireAccountVersion(account, input.expectedAccountVersion);
      if (account.state !== AccountState.Open)
        throw new ConflictException('La cuenta no admite pagos.');
      const amount = BigInt(input.amountCents);
      const balance = BigInt(account.balanceCents);
      if (amount > balance)
        throw new UnprocessableEntityException(
          'El pago supera el saldo pendiente.',
        );

      const payment = await paymentRepository.save(
        paymentRepository.create({
          accountId,
          amountCents: amount.toString(),
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          isReversal: false,
          reason: null,
          reversedPaymentId: null,
        }),
      );
      let remaining = amount;
      const installmentRepository = manager.getRepository(
        AccountInstallmentEntity,
      );
      const openInstallments = await installmentRepository.find({
        where: { accountId, state: InstallmentState.Open },
        order: { dueOn: 'ASC' },
      });
      const allocationRepository = manager.getRepository(
        AccountPaymentAllocationEntity,
      );
      for (const installment of openInstallments) {
        if (remaining === 0n) break;
        const installmentBalance = BigInt(installment.balanceCents);
        const applied =
          remaining < installmentBalance ? remaining : installmentBalance;
        installment.balanceCents = (installmentBalance - applied).toString();
        if (installment.balanceCents === '0')
          installment.state = InstallmentState.Paid;
        await installmentRepository.save(installment);
        await allocationRepository.save(
          allocationRepository.create({
            amountCents: applied.toString(),
            installmentId: installment.id,
            paymentId: payment.id,
          }),
        );
        remaining -= applied;
      }
      if (remaining !== 0n)
        throw new ConflictException(
          'Los vencimientos no cubren el saldo de la cuenta.',
        );

      account.balanceCents = (balance - amount).toString();
      account.state =
        account.balanceCents === '0' ? AccountState.Paid : AccountState.Open;
      account.version += 1;
      await accountRepository.save(account);
      await createCashMovement(
        manager,
        identity,
        payment,
        account,
        input.clientOperationId,
        false,
      );
      await this.audit.record(manager, {
        action:
          account.kind === AccountKind.Payable
            ? 'account.payment-recorded'
            : 'account.collection-recorded',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { amountCents: amount.toString() },
        resourceId: payment.id,
        resourceType: 'account-payment',
      });
      return payment;
    });
  }

  async reversePayment(
    identity: SessionIdentity,
    accountId: string,
    paymentId: string,
    input: ReversePaymentDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const paymentRepository = manager.getRepository(AccountPaymentEntity);
      const existing = await paymentRepository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(
          existing.accountId === accountId &&
            existing.isReversal &&
            existing.reversedPaymentId === paymentId,
        );
        return existing;
      }
      const original = await paymentRepository.findOne({
        where: {
          accountId,
          businessId: identity.businessId,
          id: paymentId,
          isReversal: false,
        },
      });
      if (!original) throw new NotFoundException('Pago no encontrado.');
      const alreadyReversed = await paymentRepository.exists({
        where: { reversedPaymentId: original.id },
      });
      if (alreadyReversed)
        throw new ConflictException('El pago ya fue revertido.');
      const accountRepository = manager.getRepository(AccountEntity);
      const account = await accountRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: accountId },
      });
      if (!account || account.state === AccountState.Voided)
        throw new ConflictException('La cuenta no admite el reverso.');
      requireAccountVersion(account, input.expectedAccountVersion);

      const allocationRepository = manager.getRepository(
        AccountPaymentAllocationEntity,
      );
      const allocations = await allocationRepository.find({
        where: { paymentId: original.id },
      });
      const allocatedAmount = allocations.reduce(
        (total, allocation) => total + BigInt(allocation.amountCents),
        0n,
      );
      if (
        allocatedAmount !== BigInt(original.amountCents) ||
        allocations.some((allocation) => BigInt(allocation.amountCents) <= 0n)
      )
        throw new ConflictException(
          'La distribución del pago no coincide con su importe original.',
        );

      const reversal = await paymentRepository.save(
        paymentRepository.create({
          accountId,
          amountCents: original.amountCents,
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          isReversal: true,
          reason: input.reason,
          reversedPaymentId: original.id,
        }),
      );
      const installmentRepository = manager.getRepository(
        AccountInstallmentEntity,
      );
      for (const allocation of allocations) {
        const installment = await installmentRepository.findOneByOrFail({
          id: allocation.installmentId,
          accountId,
        });
        const restored =
          BigInt(installment.balanceCents) + BigInt(allocation.amountCents);
        if (restored > BigInt(installment.initialAmountCents))
          throw new ConflictException(
            'El reverso excede el vencimiento original.',
          );
        installment.balanceCents = restored.toString();
        installment.state = InstallmentState.Open;
        await installmentRepository.save(installment);
        await allocationRepository.save(
          allocationRepository.create({
            amountCents: allocation.amountCents,
            installmentId: installment.id,
            paymentId: reversal.id,
          }),
        );
      }
      account.balanceCents = (
        BigInt(account.balanceCents) + BigInt(original.amountCents)
      ).toString();
      account.state = AccountState.Open;
      account.version += 1;
      await accountRepository.save(account);
      await createCashMovement(
        manager,
        identity,
        reversal,
        account,
        input.clientOperationId,
        true,
      );
      await this.audit.record(manager, {
        action: 'account.payment-reversed',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { originalPaymentId: original.id, reason: input.reason },
        resourceId: reversal.id,
        resourceType: 'account-payment',
      });
      return reversal;
    });
  }
}

function requireAccountVersion(
  account: AccountEntity,
  expectedVersion: number,
) {
  if (account.version !== expectedVersion) {
    throw new ConflictException({
      code: 'account-version-conflict',
      currentVersion: account.version,
      message: 'La cuenta cambió; revise el saldo.',
    });
  }
}

async function createCashMovement(
  manager: EntityManager,
  identity: SessionIdentity,
  payment: AccountPaymentEntity,
  account: AccountEntity,
  clientOperationId: string,
  reverse: boolean,
) {
  const normalDirection =
    account.kind === AccountKind.Payable ? CashDirection.Out : CashDirection.In;
  const direction = reverse
    ? normalDirection === CashDirection.Out
      ? CashDirection.In
      : CashDirection.Out
    : normalDirection;
  const repository = manager.getRepository(CashMovementEntity);
  await repository.save(
    repository.create({
      amountCents: payment.amountCents,
      businessId: identity.businessId,
      category: reverse ? 'account-payment-reversal' : 'account-payment',
      clientOperationId,
      createdByUserId: identity.userId,
      direction,
      sourceId: payment.id,
      sourceType: 'account-payment',
    }),
  );
}
