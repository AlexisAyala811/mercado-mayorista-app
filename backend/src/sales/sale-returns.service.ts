import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, In, type EntityManager } from 'typeorm';

import {
  AccountInstallmentEntity,
  InstallmentState,
} from '../accounts/entities/account-installment.entity.js';
import {
  AccountEntity,
  AccountState,
} from '../accounts/entities/account.entity.js';
import {
  CashDirection,
  CashMovementEntity,
} from '../accounts/entities/cash-movement.entity.js';
import { AuditService } from '../audit/audit.service.js';
import {
  allocateProportionally,
  divideHalfUp,
} from '../common/domain/proportional-allocation.js';
import {
  formatFixedDecimal,
  parseFixedDecimal,
} from '../common/domain/fixed-decimal.js';
import { requireSameOperation } from '../common/domain/operation-replay.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import { ReceiptDocumentEntity } from '../receipts/receipt-document.entity.js';
import { ReceiptsService } from '../receipts/receipts.service.js';
import { PaymentMode } from '../purchase/entities/purchase-settlement.entity.js';
import { SaleLineEntity } from './entities/sale-line.entity.js';
import { SaleReturnLineEntity } from './entities/sale-return-line.entity.js';
import { SaleReturnEntity } from './entities/sale-return.entity.js';
import { SaleEntity, SaleState } from './entities/sale.entity.js';
import type {
  CommercialReturnLineDto,
  CreateCommercialReturnDto,
} from './http/sale.dto.js';

type PreviousLineReturn = {
  grossCost: string;
  purchaseDiscount: string;
  returnedGross: string;
  sacks: string;
  saleLineId: string;
  weightKg: string;
};

@Injectable()
export class SaleReturnsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    private readonly receipts: ReceiptsService,
  ) {}

  async create(
    identity: SessionIdentity,
    saleId: string,
    input: CreateCommercialReturnDto,
  ) {
    if (identity.role !== UserRole.Wholesaler) {
      throw new ForbiddenException(
        'Solo el Mayorista confirma una devolución comercial.',
      );
    }
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, `commercial-return:${input.clientOperationId}`],
      );
      const returns = manager.getRepository(SaleReturnEntity);
      const existing = await returns.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(existing.saleId === saleId);
        return {
          lines: await manager
            .getRepository(SaleReturnLineEntity)
            .find({ where: { saleReturnId: existing.id } }),
          saleReturn: existing,
        };
      }

      const sales = manager.getRepository(SaleEntity);
      const sale = await sales.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: saleId },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (sale.state !== SaleState.Confirmed) {
        throw new ConflictException(
          'La devolución comercial requiere una venta confirmada.',
        );
      }
      if (sale.version !== input.expectedSaleVersion) {
        throw new ConflictException({
          code: 'sale-version-conflict',
          currentVersion: sale.version,
          message: 'La venta cambió.',
        });
      }

      const lineIds = input.lines.map((line) => line.saleLineId);
      const saleLines = await manager.getRepository(SaleLineEntity).find({
        where: { id: In(lineIds), saleId: sale.id },
      });
      if (saleLines.length !== lineIds.length) {
        throw new UnprocessableEntityException(
          'Una línea no pertenece a la venta indicada.',
        );
      }
      const lineMap = new Map(saleLines.map((line) => [line.id, line]));
      const previous = await previousLineReturns(manager, sale.id);
      const previousMap = new Map(
        previous.map((item) => [item.saleLineId, item]),
      );

      const ordered = [...input.lines].sort((left, right) =>
        left.saleLineId.localeCompare(right.saleLineId),
      );
      const validated = ordered.map((dto) =>
        validateReturnLine(
          dto,
          lineMap.get(dto.saleLineId)!,
          previousMap.get(dto.saleLineId),
        ),
      );
      const merchandiseGross = validated.reduce(
        (sum, item) => sum + item.authorizedGross,
        0n,
      );
      const previousTotals = await returns
        .createQueryBuilder('return')
        .select('COALESCE(SUM(return.merchandiseGrossCents), 0)', 'gross')
        .addSelect(
          'COALESCE(SUM(return.allocatedSaleDiscountCents), 0)',
          'discount',
        )
        .addSelect('COALESCE(SUM(return.freightAdjustmentCents), 0)', 'freight')
        .where('return.businessId = :businessId', {
          businessId: identity.businessId,
        })
        .andWhere('return.saleId = :saleId', { saleId: sale.id })
        .getRawOne<{ discount: string; freight: string; gross: string }>();
      const cumulativeGross =
        BigInt(previousTotals?.gross ?? 0) + merchandiseGross;
      const discountTarget = divideHalfUp(
        BigInt(sale.discountsCents) * cumulativeGross,
        BigInt(sale.grossAmountCents),
      );
      const returnDiscount =
        discountTarget - BigInt(previousTotals?.discount ?? 0);
      const lineDiscounts = allocateProportionally(
        returnDiscount,
        validated.map((item) => item.authorizedGross),
      );
      const maximumFreight = sale.freightIncludedInTotal
        ? BigInt(sale.freightAmountCents)
        : 0n;
      if (
        BigInt(previousTotals?.freight ?? 0) +
          BigInt(input.freightAdjustmentCents) >
        maximumFreight
      ) {
        throw new UnprocessableEntityException(
          'El ajuste de flete supera el importe originalmente cobrado.',
        );
      }

      const preparedLines = validated.map((item, index) => ({
        ...item,
        saleDiscount: lineDiscounts[index]!,
      }));
      const netMerchandise = merchandiseGross - returnDiscount;
      const totalRefund = netMerchandise + BigInt(input.freightAdjustmentCents);
      const financial = await determineFinancialEffect(
        manager,
        identity.businessId,
        sale,
        totalRefund,
      );
      const versionBefore = sale.version;
      const saleReturn = await returns.save(
        returns.create({
          accountCreditCents: financial.accountCredit.toString(),
          allocatedSaleDiscountCents: returnDiscount.toString(),
          businessId: identity.businessId,
          cashRefundCents: financial.cashRefund.toString(),
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          freightAdjustmentCents: String(input.freightAdjustmentCents),
          merchandiseGrossCents: merchandiseGross.toString(),
          netMerchandiseRefundCents: netMerchandise.toString(),
          reason: input.reason,
          saleId: sale.id,
          saleVersionAfter: versionBefore + 1,
          saleVersionBefore: versionBefore,
          totalRefundCents: totalRefund.toString(),
        }),
      );
      const returnLines = manager.getRepository(SaleReturnLineEntity);
      const savedLines = await returnLines.save(
        preparedLines.map((item) =>
          returnLines.create({
            allocatedSaleDiscountCents: item.saleDiscount.toString(),
            authorizedGrossCents: item.authorizedGross.toString(),
            grossCostReductionCents: null,
            netCostReductionCents: null,
            netRefundCents: (
              item.authorizedGross - item.saleDiscount
            ).toString(),
            purchaseDiscountReductionCents: null,
            returnedSacks: item.sacks,
            returnedWeightKg: formatFixedDecimal(item.weight, 3),
            saleLineId: item.line.id,
            saleReturnId: saleReturn.id,
          }),
        ),
      );
      await applyFinancialEffect(
        manager,
        identity,
        sale,
        saleReturn,
        financial,
      );
      sale.version += 1;
      await sales.save(sale);
      await manager
        .getRepository(ReceiptDocumentEntity)
        .createQueryBuilder()
        .update(ReceiptDocumentEntity)
        .set({ invalidatedAt: new Date() })
        .where('business_id = :businessId', { businessId: identity.businessId })
        .andWhere('source_type = :sourceType', { sourceType: 'sale' })
        .andWhere('source_id = :sourceId', { sourceId: sale.id })
        .andWhere('invalidated_at IS NULL')
        .execute();
      await this.audit.record(manager, {
        action: 'sale.commercial-return.confirmed',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          accountCreditCents: financial.accountCredit.toString(),
          cashRefundCents: financial.cashRefund.toString(),
          freightAdjustmentCents: String(input.freightAdjustmentCents),
          reason: input.reason,
          totalRefundCents: totalRefund.toString(),
        },
        resourceId: saleReturn.id,
        resourceType: 'sale-return',
      });
      return { lines: savedLines, saleReturn };
    });
    await this.receipts.saleReturn(identity, result.saleReturn.id);
    return result;
  }
}

async function previousLineReturns(manager: EntityManager, saleId: string) {
  return (await manager.query(
    `SELECT srl.sale_line_id AS "saleLineId",
            COALESCE(SUM(srl.returned_sacks), 0)::text AS sacks,
            COALESCE(SUM(srl.returned_weight_kg), 0)::text AS "weightKg",
            COALESCE(SUM(srl.authorized_gross_cents), 0)::text AS "returnedGross",
            COALESCE(SUM(srl.gross_cost_reduction_cents), 0)::text AS "grossCost",
            COALESCE(SUM(srl.purchase_discount_reduction_cents), 0)::text AS "purchaseDiscount"
     FROM sale_return_lines srl JOIN sale_returns sr ON sr.id = srl.sale_return_id
     WHERE sr.sale_id = $1 GROUP BY srl.sale_line_id`,
    [saleId],
  )) as PreviousLineReturn[];
}

function validateReturnLine(
  dto: CommercialReturnLineDto,
  line: SaleLineEntity,
  previous?: PreviousLineReturn,
) {
  const weight = parseWeight(dto.weightKg);
  if (dto.sacks === 0 && weight === 0n) {
    throw new UnprocessableEntityException(
      'Cada línea debe incluir sacos o peso devuelto.',
    );
  }
  const priorSacks = Number(previous?.sacks ?? 0);
  const priorWeight = parseFixedDecimal(previous?.weightKg ?? '0', 3, 11);
  if (
    priorSacks + dto.sacks > line.sacks ||
    priorWeight + weight > parseFixedDecimal(line.weightKg, 3, 11)
  ) {
    throw new UnprocessableEntityException(
      'La devolución comercial supera la cantidad vendida.',
    );
  }
  const authorizedGross = BigInt(dto.authorizedGrossCents);
  if (
    BigInt(previous?.returnedGross ?? 0) + authorizedGross >
    BigInt(line.subtotalCents)
  ) {
    throw new UnprocessableEntityException(
      'El importe autorizado supera el importe pendiente de la línea.',
    );
  }
  return { authorizedGross, line, sacks: dto.sacks, weight };
}

async function determineFinancialEffect(
  manager: EntityManager,
  businessId: string,
  sale: SaleEntity,
  totalRefund: bigint,
) {
  if (sale.paymentMode === PaymentMode.Cash) {
    return { account: null, accountCredit: 0n, cashRefund: totalRefund };
  }
  const account = await manager.getRepository(AccountEntity).findOne({
    lock: { mode: 'pessimistic_write' },
    where: { businessId, sourceId: sale.id, sourceType: 'sale' },
  });
  if (!account) throw new ConflictException('La cuenta de la venta no existe.');
  const accountCredit = minBigInt(totalRefund, BigInt(account.balanceCents));
  return {
    account,
    accountCredit,
    cashRefund: totalRefund - accountCredit,
  };
}

async function applyFinancialEffect(
  manager: EntityManager,
  identity: SessionIdentity,
  sale: SaleEntity,
  saleReturn: SaleReturnEntity,
  financial: Awaited<ReturnType<typeof determineFinancialEffect>>,
) {
  if (financial.account && financial.accountCredit > 0n) {
    let remaining = financial.accountCredit;
    const installments = await manager
      .getRepository(AccountInstallmentEntity)
      .createQueryBuilder('installment')
      .setLock('pessimistic_write')
      .where('installment.accountId = :accountId', {
        accountId: financial.account.id,
      })
      .andWhere('installment.state = :state', { state: InstallmentState.Open })
      .orderBy('installment.dueOn', 'DESC')
      .addOrderBy('installment.id', 'DESC')
      .getMany();
    for (const installment of installments) {
      if (remaining === 0n) break;
      const applied = minBigInt(remaining, BigInt(installment.balanceCents));
      installment.balanceCents = (
        BigInt(installment.balanceCents) - applied
      ).toString();
      if (installment.balanceCents === '0')
        installment.state = InstallmentState.Paid;
      await manager.getRepository(AccountInstallmentEntity).save(installment);
      remaining -= applied;
    }
    if (remaining !== 0n) {
      throw new ConflictException(
        'Los vencimientos no coinciden con el saldo.',
      );
    }
    financial.account.balanceCents = (
      BigInt(financial.account.balanceCents) - financial.accountCredit
    ).toString();
    financial.account.state =
      financial.account.balanceCents === '0'
        ? AccountState.Paid
        : AccountState.Open;
    financial.account.version += 1;
    await manager.getRepository(AccountEntity).save(financial.account);
  }
  if (financial.cashRefund > 0n) {
    const cash = manager.getRepository(CashMovementEntity);
    await cash.save(
      cash.create({
        amountCents: financial.cashRefund.toString(),
        businessId: identity.businessId,
        category: 'sale-return-refund',
        clientOperationId: saleReturn.clientOperationId,
        createdByUserId: identity.userId,
        direction: CashDirection.Out,
        sourceId: saleReturn.id,
        sourceType: 'sale-return',
      }),
    );
  }
}

function parseWeight(value: string) {
  try {
    return parseFixedDecimal(value, 3, 11);
  } catch {
    throw new UnprocessableEntityException(
      'El peso admite hasta tres decimales.',
    );
  }
}

function minBigInt(left: bigint, right: bigint) {
  return left < right ? left : right;
}
