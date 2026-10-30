import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import {
  AccountEntity,
  AccountKind,
  AccountState,
} from '../accounts/entities/account.entity.js';
import {
  AccountInstallmentEntity,
  InstallmentState,
} from '../accounts/entities/account-installment.entity.js';
import { AccountPaymentEntity } from '../accounts/entities/account-payment.entity.js';
import {
  CashDirection,
  CashMovementEntity,
} from '../accounts/entities/cash-movement.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { calculateAmountByBasis } from '../common/domain/commercial-calculation.js';
import {
  formatFixedDecimal,
  parseFixedDecimal,
} from '../common/domain/fixed-decimal.js';
import { requireSameOperation } from '../common/domain/operation-replay.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import {
  FreightEntryEntity,
  FreightEntryState,
  FreightOperationType,
} from '../freight/entities/freight-entry.entity.js';
import { VehicleEntity } from '../logistics/entities/vehicle.entity.js';
import {
  ReceptionEntity,
  ReceptionState,
} from '../reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../reception/entities/reception-sack.entity.js';
import {
  PaymentMode,
  PurchaseSettlementEntity,
  PurchaseSettlementState,
} from './entities/purchase-settlement.entity.js';
import type {
  SettlePurchaseDto,
  VoidPurchaseDto,
} from './http/settle-purchase.dto.js';

type VarietyTotal = { sacks: number; weight: bigint };

@Injectable()
export class PurchaseService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async getByReception(businessId: string, receptionId: string) {
    const settlement = await this.dataSource
      .getRepository(PurchaseSettlementEntity)
      .findOne({
        where: { businessId, receptionId },
      });
    if (!settlement)
      throw new NotFoundException('Liquidación de compra no encontrada.');
    return settlement;
  }

  async settle(
    identity: SessionIdentity,
    receptionId: string,
    input: SettlePurchaseDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const settlements = manager.getRepository(PurchaseSettlementEntity);
      const existing = await settlements.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(
          existing.receptionId === receptionId &&
            existing.priceBasis === input.priceBasis &&
            existing.unitPriceCents === String(input.unitPriceCents) &&
            existing.paymentMode === input.paymentMode &&
            existing.advancesCents === String(input.advancesCents) &&
            existing.discountsCents === String(input.discountsCents) &&
            existing.freightBasis === (input.freightBasis ?? null) &&
            existing.freightRateCents ===
              (input.freightBasis ? String(input.freightRateCents ?? 0) : null),
        );
        return existing;
      }

      const receptionRepository = manager.getRepository(ReceptionEntity);
      const reception = await receptionRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: receptionId },
      });
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      if (reception.version !== input.expectedReceptionVersion) {
        throw new ConflictException({
          code: 'reception-version-conflict',
          currentVersion: reception.version,
          message: 'La recepción cambió; revise sus datos.',
        });
      }
      if (reception.state !== ReceptionState.Weighed) {
        throw new ConflictException(
          'La compra requiere un pesaje cerrado y aún no liquidado.',
        );
      }
      const sacks = await manager.getRepository(ReceptionSackEntity).find({
        where: {
          businessId: identity.businessId,
          receptionId,
          voidedAt: IsNull(),
        },
      });
      if (!sacks.length)
        throw new UnprocessableEntityException(
          'La recepción no contiene sacos vigentes.',
        );

      const totals = aggregateSacks(sacks);
      const totalSacks = sacks.length;
      const totalWeight = [...totals.values()].reduce(
        (sum, current) => sum + current.weight,
        0n,
      );
      const gross = calculateAmountByBasis(
        input.priceBasis,
        BigInt(input.unitPriceCents),
        totalSacks,
        totalWeight,
      );
      validateFreight(input);
      const freight = input.freightBasis
        ? calculateAmountByBasis(
            input.freightBasis,
            BigInt(input.freightRateCents ?? 0),
            totalSacks,
            totalWeight,
          )
        : 0n;
      const liquid =
        gross -
        freight -
        BigInt(input.advancesCents) -
        BigInt(input.discountsCents);
      if (liquid < 0n)
        throw new UnprocessableEntityException(
          'Los descuentos superan el importe bruto.',
        );
      validatePayment(input, liquid);

      const settlement = await settlements.save(
        settlements.create({
          advancesCents: String(input.advancesCents),
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          discountsCents: String(input.discountsCents),
          freightAmountCents: freight.toString(),
          freightBasis: input.freightBasis ?? null,
          freightRateCents: input.freightBasis
            ? String(input.freightRateCents ?? 0)
            : null,
          grossAmountCents: gross.toString(),
          liquidAmountCents: liquid.toString(),
          paymentMode: input.paymentMode,
          priceBasis: input.priceBasis,
          receptionId,
          state: PurchaseSettlementState.Confirmed,
          unitPriceCents: String(input.unitPriceCents),
          version: 0,
          voidOperationId: null,
          voidReason: null,
          voidedAt: null,
        }),
      );

      if (freight > 0n) {
        const vehicle = reception.vehicleId
          ? await manager.getRepository(VehicleEntity).findOne({
              select: { carrierId: true, id: true },
              where: {
                businessId: identity.businessId,
                id: reception.vehicleId,
              },
            })
          : null;
        const freightEntries = manager.getRepository(FreightEntryEntity);
        await freightEntries.save(
          freightEntries.create({
            amountCents: freight.toString(),
            basis: input.freightBasis!,
            businessId: identity.businessId,
            carrierId: vehicle?.carrierId ?? null,
            createdByUserId: identity.userId,
            derivedSacks: totalSacks,
            derivedWeightKg: formatFixedDecimal(totalWeight, 3),
            operationId: settlement.id,
            operationType: FreightOperationType.Purchase,
            rateCents: String(input.freightRateCents ?? 0),
            settlementId: null,
            state: FreightEntryState.Pending,
          }),
        );
      }

      if (input.paymentMode === PaymentMode.Credit) {
        const accountRepository = manager.getRepository(AccountEntity);
        const account = await accountRepository.save(
          accountRepository.create({
            balanceCents: liquid.toString(),
            businessId: identity.businessId,
            counterpartyId: reception.providerId,
            counterpartyType: 'provider',
            initialAmountCents: liquid.toString(),
            kind: AccountKind.Payable,
            sourceId: settlement.id,
            sourceType: 'purchase-settlement',
            state: liquid === 0n ? AccountState.Paid : AccountState.Open,
            version: 0,
          }),
        );
        const installments = manager.getRepository(AccountInstallmentEntity);
        await installments.save(
          input.installments.map((item) =>
            installments.create({
              accountId: account.id,
              balanceCents: String(item.amountCents),
              dueOn: item.dueOn,
              initialAmountCents: String(item.amountCents),
              state: InstallmentState.Open,
            }),
          ),
        );
      } else if (liquid > 0n) {
        const cash = manager.getRepository(CashMovementEntity);
        await cash.save(
          cash.create({
            amountCents: liquid.toString(),
            businessId: identity.businessId,
            category: 'purchase-payment',
            clientOperationId: input.clientOperationId,
            createdByUserId: identity.userId,
            direction: CashDirection.Out,
            sourceId: settlement.id,
            sourceType: 'purchase-settlement',
          }),
        );
      }

      reception.state = ReceptionState.Settled;
      reception.version += 1;
      await receptionRepository.save(reception);
      await this.audit.record(manager, {
        action: 'purchase.settled',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          liquidAmountCents: liquid.toString(),
          paymentMode: input.paymentMode,
        },
        resourceId: settlement.id,
        resourceType: 'purchase-settlement',
      });
      return settlement;
    });
  }

  async void(identity: SessionIdentity, id: string, input: VoidPurchaseDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const settlements = manager.getRepository(PurchaseSettlementEntity);
      const settlement = await settlements.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id },
      });
      if (!settlement) throw new NotFoundException('Compra no encontrada.');
      if (settlement.voidOperationId === input.clientOperationId)
        return settlement;
      if (settlement.version !== input.expectedPurchaseVersion) {
        throw new ConflictException({
          code: 'purchase-version-conflict',
          currentVersion: settlement.version,
          message: 'La compra cambió.',
        });
      }
      if (settlement.state !== PurchaseSettlementState.Confirmed)
        throw new ConflictException('La compra ya no puede anularse.');
      const receptionRepository = manager.getRepository(ReceptionEntity);
      const reception = await receptionRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: settlement.receptionId },
      });
      if (!reception)
        throw new ConflictException(
          'La recepción de la compra no está disponible.',
        );
      if (reception.version !== input.expectedReceptionVersion) {
        throw new ConflictException({
          code: 'reception-version-conflict',
          currentVersion: reception.version,
          message: 'La recepción cambió.',
        });
      }
      if (reception.state !== ReceptionState.Settled)
        throw new ConflictException('La recepción ya no está liquidada.');

      const accountRepository = manager.getRepository(AccountEntity);
      const account = await accountRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: {
          businessId: identity.businessId,
          sourceId: settlement.id,
          sourceType: 'purchase-settlement',
        },
      });
      if (account) {
        const unreversedPayment = await manager
          .getRepository(AccountPaymentEntity)
          .createQueryBuilder('payment')
          .where('payment.accountId = :accountId', { accountId: account.id })
          .andWhere('payment.isReversal = :isReversal', { isReversal: false })
          .andWhere((query) => {
            const reversal = query
              .subQuery()
              .select('1')
              .from(AccountPaymentEntity, 'reversal')
              .where('reversal.reversedPaymentId = payment.id')
              .getQuery();
            return `NOT EXISTS ${reversal}`;
          })
          .getExists();
        if (unreversedPayment)
          throw new ConflictException(
            'Revierta los pagos antes de anular la compra.',
          );
      }

      const freightEntry = await manager
        .getRepository(FreightEntryEntity)
        .findOne({
          lock: { mode: 'pessimistic_write' },
          where: {
            businessId: identity.businessId,
            operationId: settlement.id,
            operationType: FreightOperationType.Purchase,
          },
        });
      if (freightEntry?.state === FreightEntryState.Settled) {
        throw new ConflictException(
          'La compra no puede anularse porque su flete ya fue liquidado.',
        );
      }
      if (freightEntry) {
        freightEntry.state = FreightEntryState.Voided;
        await manager.getRepository(FreightEntryEntity).save(freightEntry);
      }

      if (account) {
        account.balanceCents = '0';
        account.state = AccountState.Voided;
        account.version += 1;
        await accountRepository.save(account);
        const installments = manager.getRepository(AccountInstallmentEntity);
        const items = await installments.find({
          where: { accountId: account.id },
        });
        for (const item of items) {
          item.balanceCents = '0';
          item.state = InstallmentState.Voided;
          await installments.save(item);
        }
      } else if (
        settlement.paymentMode === PaymentMode.Cash &&
        BigInt(settlement.liquidAmountCents) > 0n
      ) {
        const cash = manager.getRepository(CashMovementEntity);
        await cash.save(
          cash.create({
            amountCents: settlement.liquidAmountCents,
            businessId: identity.businessId,
            category: 'purchase-void',
            clientOperationId: input.clientOperationId,
            createdByUserId: identity.userId,
            direction: CashDirection.In,
            sourceId: settlement.id,
            sourceType: 'purchase-settlement',
          }),
        );
      }

      const voidedAt = new Date();
      settlement.state = PurchaseSettlementState.Voided;
      settlement.version += 1;
      settlement.voidOperationId = input.clientOperationId;
      settlement.voidReason = input.reason;
      settlement.voidedAt = voidedAt;
      reception.state = ReceptionState.Voided;
      reception.version += 1;
      reception.voidOperationId = input.clientOperationId;
      reception.voidReason = input.reason;
      reception.voidedAt = voidedAt;
      await receptionRepository.save(reception);
      const saved = await settlements.save(settlement);
      await this.audit.record(manager, {
        action: 'purchase.voided',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { reason: input.reason },
        resourceId: settlement.id,
        resourceType: 'purchase-settlement',
      });
      return saved;
    });
  }
}

function aggregateSacks(sacks: ReceptionSackEntity[]) {
  const totals = new Map<string, VarietyTotal>();
  for (const sack of sacks) {
    const current = totals.get(sack.varietyId) ?? { sacks: 0, weight: 0n };
    current.sacks += 1;
    current.weight += parseFixedDecimal(sack.netWeightKg, 3, 11);
    totals.set(sack.varietyId, current);
  }
  return totals;
}

function validateFreight(input: SettlePurchaseDto) {
  const hasBasis = input.freightBasis !== undefined;
  const hasRate = input.freightRateCents !== undefined;
  if (hasBasis !== hasRate)
    throw new UnprocessableEntityException(
      'La base y tarifa de flete deben indicarse juntas.',
    );
}

function validatePayment(input: SettlePurchaseDto, liquid: bigint) {
  if (input.paymentMode === PaymentMode.Cash && input.installments.length) {
    throw new UnprocessableEntityException(
      'El pago al contado no admite vencimientos.',
    );
  }
  if (input.paymentMode === PaymentMode.Credit) {
    if (!input.installments.length)
      throw new UnprocessableEntityException(
        'El crédito requiere al menos un vencimiento.',
      );
    const total = input.installments.reduce(
      (sum, item) => sum + BigInt(item.amountCents),
      0n,
    );
    if (total !== liquid)
      throw new UnprocessableEntityException(
        'Los vencimientos deben sumar el monto líquido.',
      );
  }
}
