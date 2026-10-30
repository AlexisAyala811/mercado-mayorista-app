import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type EntityManager, type Repository } from 'typeorm';

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
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import {resolveCommercialSnapshot,type CommercialSnapshot} from '../catalog/commercial-snapshot.js';
import { calculateAmountByBasis } from '../common/domain/commercial-calculation.js';
import {
  formatFixedDecimal,
  parseFixedDecimal,
} from '../common/domain/fixed-decimal.js';
import {
  requireSameOperation,
  sameMembers,
} from '../common/domain/operation-replay.js';
import { toPage } from '../common/http/page-query.dto.js';
import type { SalesHistoryQueryDto } from './http/sales-history-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import {
  FreightEntryEntity,
  FreightEntryState,
  FreightOperationType,
} from '../freight/entities/freight-entry.entity.js';
import { VehicleEntity } from '../logistics/entities/vehicle.entity.js';
import {
  CalculationBasis,
  PaymentMode,
} from '../purchase/entities/purchase-settlement.entity.js';
import { SaleEntity, SaleState } from './entities/sale.entity.js';
import { SaleLineEntity } from './entities/sale-line.entity.js';
import { SaleReturnEntity } from './entities/sale-return.entity.js';
import type {
  CreateSaleDto,
  SaleLineDto,
  VoidSaleDto,
} from './http/sale.dto.js';

@Injectable()
export class SalesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(SaleEntity)
    private readonly sales: Repository<SaleEntity>,
    @InjectRepository(SaleLineEntity)
    private readonly lines: Repository<SaleLineEntity>,
  ) {}

  async list(businessId: string, page: SalesHistoryQueryDto) {
    if (page.from && page.to && page.from > page.to)
      throw new UnprocessableEntityException(
        'La fecha inicial debe ser anterior o igual a la final.',
      );
    const query = this.sales
      .createQueryBuilder('sale')
      .leftJoinAndMapOne(
        'sale.buyer',
        BuyerEntity,
        'buyer',
        'buyer.id = sale.buyerId AND buyer.businessId = sale.businessId',
      )
      .where('sale.businessId = :businessId', { businessId });
    if (page.from)
      query.andWhere(
        "sale.createdAt >= (:from::date::timestamp AT TIME ZONE 'America/Lima')",
        { from: page.from },
      );
    if (page.to)
      query.andWhere(
        "sale.createdAt < ((:to::date + INTERVAL '1 day') AT TIME ZONE 'America/Lima')",
        { to: page.to },
      );
    if (page.search)
      query.andWhere('strpos(lower(buyer.name), lower(:participant)) > 0', {
        participant: page.search,
      });
    if (page.buyerId)
      query.andWhere('sale.buyerId = :buyerId', { buyerId: page.buyerId });
    if (page.state)
      query.andWhere('sale.state = :state', { state: page.state });
    const [items, total] = await query
      .orderBy('sale.createdAt', 'DESC')
      .addOrderBy('sale.id', 'DESC')
      .skip(page.offset)
      .take(page.limit)
      .getManyAndCount();
    const views = items.map((item) => {
      const { buyer, ...sale } = item as SaleEntity & { buyer?: BuyerEntity };
      return { ...sale, buyerName: buyer?.name ?? null };
    });
    return toPage(views, total, page);
  }

  async get(businessId: string, id: string) {
    const sale = await this.sales.findOne({ where: { businessId, id } });
    if (!sale) throw new NotFoundException('Venta no encontrada.');
    const buyer = await this.dataSource
      .getRepository(BuyerEntity)
      .findOneBy({ businessId, id: sale.buyerId });
    return {
      sale: Object.assign({}, sale, { buyerName: buyer?.name ?? null }),
      lines: await this.lines.find({ where: { saleId: id } }),
    };
  }

  async create(identity: SessionIdentity, input: CreateSaleDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const saleRepository = manager.getRepository(SaleEntity);
      const existing = await saleRepository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(await matchesSale(manager, existing, input));
        return existing;
      }

      const buyer = await manager.getRepository(BuyerEntity).findOne({
        lock: { mode: 'pessimistic_write' },
        where: {
          businessId: identity.businessId,
          id: input.buyerId,
          isActive: true,
        },
      });
      if (!buyer) throw new NotFoundException('Comprador no encontrado.');
      let vehicle: VehicleEntity | null = null;
      if (input.vehicleId) {
        vehicle = await manager.getRepository(VehicleEntity).findOne({
          where: {
            businessId: identity.businessId,
            id: input.vehicleId,
            isActive: true,
          },
        });
        if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
      }
      validateFreight(input);

      const varieties = manager.getRepository(PotatoVarietyEntity);
      const varietyIds = input.lines.map((line) => line.varietyId);
      const combinations=input.lines.map(line=>JSON.stringify([line.varietyId,line.qualityId??null,line.originId??null]));
      if (new Set(combinations).size !== combinations.length)
        throw new UnprocessableEntityException(
          'La combinación de variedad, calidad y procedencia no puede repetirse en la venta.',
        );
      for (const varietyId of [...new Set(varietyIds)].sort()) {
        const variety = await varieties.findOne({
          lock: { mode: 'pessimistic_read' },
          where: {
            businessId: identity.businessId,
            id: varietyId,
            isActive: true,
          },
        });
        if (!variety)
          throw new NotFoundException('Variedad no disponible en el catálogo.');
      }

      let gross = 0n;
      let totalSacks = 0;
      let totalWeight = 0n;
      const calculatedLines: Array<{
        dto: SaleLineDto;
        subtotal: bigint;
        weight: bigint;
        characteristics:CommercialSnapshot;
      }> = [];
      for (const line of input.lines) {
        const requestedWeight = parseWeight(line.weightKg);
        if (
          requestedWeight <= 0n ||
          !Number.isSafeInteger(line.sacks) ||
          line.sacks <= 0
        )
          throw new UnprocessableEntityException(
            'Los sacos y el peso deben ser positivos.',
          );
        const subtotal =
          line.priceBasis === CalculationBasis.Kilogram
            ? calculateAmountByBasis(
                line.priceBasis,
                BigInt(line.unitPriceCents),
                line.sacks,
                requestedWeight,
              )
            : BigInt(line.sacks) * BigInt(line.unitPriceCents);
        calculatedLines.push({ dto: line, subtotal, weight: requestedWeight,characteristics:await resolveCommercialSnapshot(manager,identity.businessId,line) });
        gross += subtotal;
        totalSacks += line.sacks;
        totalWeight += requestedWeight;
      }
      const freight = input.freightBasis
        ? calculateAmountByBasis(
            input.freightBasis,
            BigInt(input.freightRateCents ?? 0),
            totalSacks,
            totalWeight,
          )
        : 0n;
      const total =
        gross -
        BigInt(input.discountsCents) +
        (input.freightIncludedInTotal ? freight : 0n);
      if (total < 0n)
        throw new UnprocessableEntityException(
          'Los descuentos superan el importe de venta.',
        );
      validatePayment(input, total);
      const creditLimitOverride = await validateCredit(
        manager,
        identity,
        buyer,
        input,
        total,
      );

      const sale = await saleRepository.save(
        saleRepository.create({
          businessId: identity.businessId,
          buyerId: input.buyerId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          destinationDepartment: input.destinationDepartment,
          discountsCents: String(input.discountsCents),
          driverName: normalizeOptional(input.driverName),
          freightAmountCents: freight.toString(),
          freightBasis: input.freightBasis ?? null,
          freightIncludedInTotal: input.freightIncludedInTotal,
          freightRateCents: input.freightBasis
            ? String(input.freightRateCents ?? 0)
            : null,
          grossAmountCents: gross.toString(),
          paymentMode: input.paymentMode,
          state: SaleState.Confirmed,
          totalAmountCents: total.toString(),
          vehicleId: input.vehicleId ?? null,
          version: 0,
          voidOperationId: null,
          voidedAt: null,
        }),
      );
      const lineRepository = manager.getRepository(SaleLineEntity);
      if (freight > 0n) {
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
            operationId: sale.id,
            operationType: FreightOperationType.Sale,
            rateCents: String(input.freightRateCents ?? 0),
            settlementId: null,
            state: FreightEntryState.Pending,
          }),
        );
      }
      for (const calculated of calculatedLines) {
        await lineRepository.save(
          lineRepository.create({
            ...calculated.characteristics,
            varietyId: calculated.dto.varietyId,
            lotId: null,
            lotVersion: null,
            priceBasis: calculated.dto.priceBasis,
            sacks: calculated.dto.sacks,
            saleId: sale.id,
            subtotalCents: calculated.subtotal.toString(),
            unitPriceCents: String(calculated.dto.unitPriceCents),
            weightKg: formatFixedDecimal(calculated.weight, 3),
          }),
        );
      }
      await createSaleFinancialEffect(manager, identity, sale, input, total);
      await this.audit.record(manager, {
        action: 'sale.confirmed',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          creditLimitOverride: creditLimitOverride ?? null,
          paymentMode: input.paymentMode,
          totalAmountCents: total.toString(),
        },
        resourceId: sale.id,
        resourceType: 'sale',
      });
      return sale;
    });
  }

  async void(identity: SessionIdentity, id: string, input: VoidSaleDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const saleRepository = manager.getRepository(SaleEntity);
      const sale = await saleRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id },
      });
      if (!sale) throw new NotFoundException('Venta no encontrada.');
      if (sale.voidOperationId === input.clientOperationId) return sale;
      if (sale.version !== input.expectedSaleVersion) {
        throw new ConflictException({
          code: 'sale-version-conflict',
          currentVersion: sale.version,
          message: 'La venta cambió.',
        });
      }
      if (sale.state !== SaleState.Confirmed)
        throw new ConflictException('La venta ya no puede anularse.');
      const hasCommercialReturns = await manager
        .getRepository(SaleReturnEntity)
        .exists({
          where: { businessId: identity.businessId, saleId: sale.id },
        });
      if (hasCommercialReturns)
        throw new ConflictException(
          'La venta con devoluciones comerciales no puede anularse.',
        );
      const account = await manager.getRepository(AccountEntity).findOne({
        lock: { mode: 'pessimistic_write' },
        where: {
          businessId: identity.businessId,
          sourceId: sale.id,
          sourceType: 'sale',
        },
      });
      if (account) {
        const hasPayments = await manager
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
        if (hasPayments)
          throw new ConflictException(
            'Revierta los cobros antes de anular la venta.',
          );
        account.state = AccountState.Voided;
        account.balanceCents = '0';
        account.version += 1;
        await manager.getRepository(AccountEntity).save(account);
        const installmentRepository = manager.getRepository(
          AccountInstallmentEntity,
        );
        const accountInstallments = await installmentRepository.find({
          where: { accountId: account.id },
        });
        for (const installment of accountInstallments) {
          installment.balanceCents = '0';
          installment.state = InstallmentState.Voided;
          await installmentRepository.save(installment);
        }
      }
      const freightEntry = await manager
        .getRepository(FreightEntryEntity)
        .findOne({
          lock: { mode: 'pessimistic_write' },
          where: {
            businessId: identity.businessId,
            operationId: sale.id,
            operationType: FreightOperationType.Sale,
          },
        });
      if (freightEntry?.state === FreightEntryState.Settled) {
        throw new ConflictException(
          'La venta no puede anularse porque su flete ya fue liquidado.',
        );
      }
      if (freightEntry) {
        freightEntry.state = FreightEntryState.Voided;
        await manager.getRepository(FreightEntryEntity).save(freightEntry);
      }
      if (
        sale.paymentMode === PaymentMode.Cash &&
        BigInt(sale.totalAmountCents) > 0n
      ) {
        const cash = manager.getRepository(CashMovementEntity);
        await cash.save(
          cash.create({
            amountCents: sale.totalAmountCents,
            businessId: identity.businessId,
            category: 'sale-void',
            clientOperationId: input.clientOperationId,
            createdByUserId: identity.userId,
            direction: CashDirection.Out,
            sourceId: sale.id,
            sourceType: 'sale',
          }),
        );
      }
      sale.state = SaleState.Voided;
      sale.version += 1;
      sale.voidedAt = new Date();
      sale.voidOperationId = input.clientOperationId;
      const saved = await saleRepository.save(sale);
      await this.audit.record(manager, {
        action: 'sale.voided',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { reason: input.reason },
        resourceId: sale.id,
        resourceType: 'sale',
      });
      return saved;
    });
  }
}

async function matchesSale(
  manager: EntityManager,
  sale: SaleEntity,
  input: CreateSaleDto,
) {
  if (
    sale.buyerId !== input.buyerId ||
    sale.paymentMode !== input.paymentMode ||
    sale.discountsCents !== String(input.discountsCents) ||
    sale.destinationDepartment !== input.destinationDepartment ||
    sale.vehicleId !== (input.vehicleId ?? null) ||
    sale.freightIncludedInTotal !== input.freightIncludedInTotal ||
    sale.freightBasis !== (input.freightBasis ?? null) ||
    sale.freightRateCents !==
      (input.freightBasis ? String(input.freightRateCents ?? 0) : null)
  )
    return false;
  const lineKey = (line: {
    originId: string | null;
    priceBasis: CalculationBasis;
    qualityId: string | null;
    sacks: number;
    unitPriceCents: string;
    varietyId: string;
    weightKg: string;
  }) =>
    JSON.stringify([
      line.varietyId,
      line.qualityId,
      line.originId,
      line.sacks,
      line.weightKg,
      line.priceBasis,
      line.unitPriceCents,
    ]);
  const stored = await manager
    .getRepository(SaleLineEntity)
    .find({ where: { saleId: sale.id } });
  const requested = input.lines.map((line) =>
    lineKey({
      originId: line.originId ?? null,
      priceBasis: line.priceBasis,
      qualityId: line.qualityId ?? null,
      sacks: line.sacks,
      unitPriceCents: String(line.unitPriceCents),
      varietyId: line.varietyId,
      weightKg: formatFixedDecimal(parseWeight(line.weightKg), 3),
    }),
  );
  return sameMembers(stored.map(lineKey), requested);
}

async function validateCredit(
  manager: EntityManager,
  identity: SessionIdentity,
  buyer: BuyerEntity,
  input: CreateSaleDto,
  total: bigint,
) {
  if (
    input.paymentMode !== PaymentMode.Credit ||
    buyer.creditLimitCents === null
  )
    return;
  const raw = await manager
    .getRepository(AccountEntity)
    .createQueryBuilder('account')
    .select('COALESCE(SUM(account.balanceCents), 0)', 'balance')
    .where('account.businessId = :businessId', {
      businessId: identity.businessId,
    })
    .andWhere('account.counterpartyType = :type', { type: 'buyer' })
    .andWhere('account.counterpartyId = :buyerId', { buyerId: buyer.id })
    .andWhere('account.state = :state', { state: AccountState.Open })
    .getRawOne<{ balance: string }>();
  if (BigInt(raw?.balance ?? 0) + total <= BigInt(buyer.creditLimitCents))
    return;
  if (!input.authorizeCreditLimitOverride)
    throw new UnprocessableEntityException(
      'La venta supera el límite de crédito.',
    );
  if (identity.role !== UserRole.Wholesaler)
    throw new ForbiddenException(
      'Solo el Mayorista autoriza exceder el límite de crédito.',
    );
  return {
    buyerId: buyer.id,
    creditLimitCents: buyer.creditLimitCents,
    previousBalanceCents: raw?.balance ?? '0',
    resultingBalanceCents: (BigInt(raw?.balance ?? 0) + total).toString(),
  };
}

async function createSaleFinancialEffect(
  manager: EntityManager,
  identity: SessionIdentity,
  sale: SaleEntity,
  input: CreateSaleDto,
  total: bigint,
) {
  if (input.paymentMode === PaymentMode.Cash) {
    if (total === 0n) return;
    const cash = manager.getRepository(CashMovementEntity);
    await cash.save(
      cash.create({
        amountCents: total.toString(),
        businessId: identity.businessId,
        category: 'sale-collection',
        clientOperationId: input.clientOperationId,
        createdByUserId: identity.userId,
        direction: CashDirection.In,
        sourceId: sale.id,
        sourceType: 'sale',
      }),
    );
    return;
  }
  const accounts = manager.getRepository(AccountEntity);
  const account = await accounts.save(
    accounts.create({
      balanceCents: total.toString(),
      businessId: identity.businessId,
      counterpartyId: sale.buyerId,
      counterpartyType: 'buyer',
      initialAmountCents: total.toString(),
      kind: AccountKind.Receivable,
      sourceId: sale.id,
      sourceType: 'sale',
      state: total === 0n ? AccountState.Paid : AccountState.Open,
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
}

function validateFreight(input: CreateSaleDto) {
  if (
    (input.freightBasis !== undefined) !==
    (input.freightRateCents !== undefined)
  ) {
    throw new UnprocessableEntityException(
      'La base y tarifa de flete deben indicarse juntas.',
    );
  }
}

function validatePayment(input: CreateSaleDto, total: bigint) {
  if (input.paymentMode === PaymentMode.Cash && input.installments.length) {
    throw new UnprocessableEntityException(
      'La venta al contado no admite vencimientos.',
    );
  }
  if (input.paymentMode === PaymentMode.Credit) {
    if (!input.installments.length)
      throw new UnprocessableEntityException(
        'La venta a crédito requiere vencimientos.',
      );
    const sum = input.installments.reduce(
      (current, item) => current + BigInt(item.amountCents),
      0n,
    );
    if (sum !== total)
      throw new UnprocessableEntityException(
        'Los vencimientos deben sumar el total de venta.',
      );
  }
}

function parseWeight(value: string) {
  try {
    const weight = parseFixedDecimal(value, 3, 11);
    if (weight <= 0n) throw new Error('invalid');
    return weight;
  } catch {
    throw new UnprocessableEntityException(
      'El peso debe ser mayor que cero y tener hasta tres decimales.',
    );
  }
}

function normalizeOptional(value?: string) {
  const normalized = value?.trim();
  return normalized || null;
}
