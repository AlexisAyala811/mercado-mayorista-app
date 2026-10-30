import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { DataSource } from 'typeorm';

import { CashMovementEntity } from '../src/accounts/entities/cash-movement.entity.js';
import { AccountPaymentEntity } from '../src/accounts/entities/account-payment.entity.js';
import { AccountsService } from '../src/accounts/accounts.service.js';
import { AccountInstallmentEntity } from '../src/accounts/entities/account-installment.entity.js';
import { AccountEntity } from '../src/accounts/entities/account.entity.js';
import { AuditEventEntity } from '../src/audit/audit-event.entity.js';
import { AuditService } from '../src/audit/audit.service.js';
import { BuyerEntity } from '../src/catalog/entities/buyer.entity.js';
import { PotatoVarietyEntity } from '../src/catalog/entities/potato-variety.entity.js';
import { ProviderEntity } from '../src/catalog/entities/provider.entity.js';
import { FreightEntryEntity } from '../src/freight/entities/freight-entry.entity.js';
import { FreightSettlementEntity } from '../src/freight/entities/freight-settlement.entity.js';
import { FreightService } from '../src/freight/freight.service.js';
import type { SessionIdentity } from '../src/identity/application/ports/session-identity-reader.js';
import { BusinessEntity } from '../src/identity/entities/business.entity.js';
import { UserEntity, UserRole } from '../src/identity/entities/user.entity.js';
import { PasswordHasher } from '../src/identity/security/password-hasher.js';
import { InventoryLotEntity } from '../src/inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../src/inventory/entities/inventory-movement.entity.js';
import { InventoryService } from '../src/inventory/inventory.service.js';
import {
  CalculationBasis,
  PaymentMode,
  PurchaseSettlementEntity,
} from '../src/purchase/entities/purchase-settlement.entity.js';
import { PurchaseService } from '../src/purchase/purchase.service.js';
import {
  ReceptionEntity,
  ReceptionState,
} from '../src/reception/entities/reception.entity.js';
import { ReceptionSackEntity } from '../src/reception/entities/reception-sack.entity.js';
import { ReceptionService } from '../src/reception/reception.service.js';
import { WeighingService } from '../src/reception/weighing.service.js';
import { ReceiptDocumentEntity } from '../src/receipts/receipt-document.entity.js';
import { ReceiptsService } from '../src/receipts/receipts.service.js';
import { ReportsService } from '../src/reports/reports.service.js';
import { SaleEntity, SaleState } from '../src/sales/entities/sale.entity.js';
import { AnalyticsService } from '../src/analytics/analytics.service.js';
import type { CreateSaleDto } from '../src/sales/http/sale.dto.js';
import { SaleLineEntity } from '../src/sales/entities/sale-line.entity.js';
import { SaleReturnEntity } from '../src/sales/entities/sale-return.entity.js';
import { SaleReturnLineEntity } from '../src/sales/entities/sale-return-line.entity.js';
import { SalesService } from '../src/sales/sales.service.js';
import { SaleReturnsService } from '../src/sales/sale-returns.service.js';
import { StowageEntryEntity } from '../src/stowage/entities/stowage-entry.entity.js';
import { WorkGroupEntity } from '../src/stowage/entities/work-group.entity.js';
import { StowageService } from '../src/stowage/stowage.service.js';

export function registerCommercialDatabaseScenarios(
  getDataSource: () => DataSource,
) {
  async function fixture() {
    const dataSource = getDataSource();
    const businesses = dataSource.getRepository(BusinessEntity);
    const users = dataSource.getRepository(UserEntity);
    const providers = dataSource.getRepository(ProviderEntity);
    const varieties = dataSource.getRepository(PotatoVarietyEntity);
    const buyers = dataSource.getRepository(BuyerEntity);
    const business = await businesses.save(
      businesses.create({ displayName: `Comercial E2E ${randomUUID()}` }),
    );
    const username = `commercial-${randomUUID()}`;
    const user = await users.save(
      users.create({
        businessId: business.id,
        isActive: true,
        passwordHash: await new PasswordHasher().hash(randomUUID()),
        role: UserRole.Wholesaler,
        username,
      }),
    );
    const provider = await providers.save(
      providers.create({
        businessId: business.id,
        isActive: true,
        name: `Proveedor ${randomUUID()}`,
        phone: null,
      }),
    );
    const variety = await varieties.save(
      varieties.create({
        businessId: business.id,
        isActive: true,
        name: `Variedad ${randomUUID()}`,
      }),
    );
    const buyer = await buyers.save(
      buyers.create({
        businessId: business.id,
        creditLimitCents: null,
        destinationDepartment: 'Lima',
        isActive: true,
        name: `Comprador ${randomUUID()}`,
        phone: null,
      }),
    );
    const auditRepository = dataSource.getRepository(AuditEventEntity);
    const audit = new AuditService(
      auditRepository,
      new ConfigService({ EVIDENCE_RETENTION_YEARS: 5 }),
    );
    const receptions = dataSource.getRepository(ReceptionEntity);
    const receptionService = new ReceptionService(
      dataSource,
      audit,
      receptions,
    );
    const weighingService = new WeighingService(dataSource, audit);
    const purchaseService = new PurchaseService(dataSource, audit);
    const sales = dataSource.getRepository(SaleEntity);
    const saleLines = dataSource.getRepository(SaleLineEntity);
    const salesService = new SalesService(dataSource, audit, sales, saleLines);
    const inventoryLots = dataSource.getRepository(InventoryLotEntity);
    const inventoryMovements = dataSource.getRepository(
      InventoryMovementEntity,
    );
    const inventoryService = new InventoryService(
      dataSource,
      audit,
      inventoryLots,
      inventoryMovements,
    );
    const receiptDocuments = dataSource.getRepository(ReceiptDocumentEntity);
    const receiptsService = new ReceiptsService(
      dataSource,
      audit,
      new ConfigService({ EVIDENCE_RETENTION_YEARS: 5 }),
      businesses,
      dataSource.getRepository(PurchaseSettlementEntity),
      receptions,
      dataSource.getRepository(ReceptionSackEntity),
      providers,
      varieties,
      sales,
      saleLines,
      dataSource.getRepository(SaleReturnEntity),
      dataSource.getRepository(SaleReturnLineEntity),
      dataSource.getRepository(InventoryLotEntity),
      dataSource.getRepository(InventoryMovementEntity),
      buyers,
      receiptDocuments,
    );
    const saleReturnsService = new SaleReturnsService(
      dataSource,
      audit,
      receiptsService,
    );
    const reportsService = new ReportsService(dataSource);
    const accountsService = new AccountsService(
      dataSource,
      audit,
      dataSource.getRepository(AccountEntity),
      dataSource.getRepository(AccountInstallmentEntity),
      dataSource.getRepository(AccountPaymentEntity),
    );
    const freightEntries = dataSource.getRepository(FreightEntryEntity);
    const freightSettlements = dataSource.getRepository(
      FreightSettlementEntity,
    );
    const freightService = new FreightService(
      dataSource,
      audit,
      freightEntries,
      freightSettlements,
    );
    const workGroups = dataSource.getRepository(WorkGroupEntity);
    const stowageEntries = dataSource.getRepository(StowageEntryEntity);
    const stowageService = new StowageService(
      dataSource,
      audit,
      workGroups,
      stowageEntries,
    );
    const identity: SessionIdentity = {
      businessId: business.id,
      businessName: business.displayName,
      expiresAt: new Date('2099-01-01T00:00:00Z'),
      role: UserRole.Wholesaler,
      sessionId: randomUUID(),
      userId: user.id,
      username,
    };
    return {
      auditRepository,
      accountsService,
      buyer,
      dataSource,
      freightEntries,
      freightService,
      freightSettlements,
      identity,
      inventoryService,
      provider,
      purchaseService,
      receptionService,
      receptions,
      receiptDocuments,
      receiptsService,
      reportsService,
      sales,
      salesService,
      saleReturnsService,
      stowageEntries,
      stowageService,
      variety,
      weighingService,
      workGroups,
    };
  }

  function saleInput(f: Awaited<ReturnType<typeof fixture>>): CreateSaleDto {
    return {
      clientOperationId: randomUUID(),
      buyerId: f.buyer.id,
      destinationDepartment: 'Lima',
      discountsCents: 100,
      freightIncludedInTotal: false,
      paymentMode: PaymentMode.Cash,
      installments: [],
      lines: [
        {
          varietyId: f.variety.id,
          sacks: 30,
          weightKg: '1500.000',
          priceBasis: CalculationBasis.Kilogram,
          unitPriceCents: 150,
        },
      ],
    };
  }
  async function assertNoInventory(f: Awaited<ReturnType<typeof fixture>>) {
    for (const table of [
      'inventory_lots',
      'inventory_movements',
      'inventory_lot_valuations',
      'sale_line_costs',
    ]) {
      const rows = await f.dataSource.query<{ count: string }[]>(
        `SELECT COUNT(*)::text AS count FROM ${table} WHERE business_id=$1`,
        [f.identity.businessId],
      );
      expect(rows[0]!.count).toBe('0');
    }
  }
  it('confirms an independent sale without any purchases, with one cash effect on concurrent retries', async () => {
    const f = await fixture();
    const input = saleInput(f);
    const [first, retry] = await Promise.all([
      f.salesService.create(f.identity, input),
      f.salesService.create(f.identity, input),
    ]);
    expect(first.id).toBe(retry.id);
    expect(first.totalAmountCents).toBe('224900');
    const lines = await f.dataSource
      .getRepository(SaleLineEntity)
      .findBy({ saleId: first.id });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      varietyId: f.variety.id,
      lotId: null,
      lotVersion: null,
      sacks: 30,
      weightKg: '1500.000',
    });
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ businessId: f.identity.businessId, sourceId: first.id }),
    ).toBe(1);
    expect(
      await f.auditRepository.countBy({
        businessId: f.identity.businessId,
        action: 'sale.confirmed',
      }),
    ).toBe(1);
    await assertNoInventory(f);
    const detail = await f.salesService.get(f.identity.businessId, first.id);
    expect(detail.lines[0]!.varietyId).toBe(f.variety.id);
    const receipt = await f.receiptsService.sale(f.identity, first.id);
    expect(receipt).toBeDefined();
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const prices = await f.reportsService.priceHistory(f.identity.businessId, {
      from: today,
      to: today,
      varietyId: f.variety.id,
    });
    expect(prices.items).toHaveLength(1);
    const series = await new AnalyticsService(f.dataSource).series(
      f.identity.businessId,
      { from: today, to: today, varietyId: f.variety.id },
    );
    expect(series.points[0]).toMatchObject({
      sacks: 30,
      weightKg: '1500.000',
      merchandiseCents: '225000',
    });
  });
  it('keeps purchase quantities and financial effect, then allows an independent larger sale', async () => {
    const f = await fixture();
    const reception = await f.receptionService.create(f.identity, {
      clientOperationId: randomUUID(),
      providerId: f.provider.id,
      expectedVarietyIds: [f.variety.id],
      receivedOn: '2026-10-07',
      driverName: 'QA',
    });
    const sack = await f.weighingService.add(f.identity, reception.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 0,
      varietyId: f.variety.id,
      grossWeightKg: '50.500',
      tareKg: '0.500',
    });
    const close = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 1,
    };
    await f.weighingService.close(f.identity, reception.id, close);
    await f.weighingService.close(f.identity, reception.id, close);
    const correction = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 2,
      varietyId: f.variety.id,
      grossWeightKg: '60.500',
      tareKg: '0.500',
      reason: 'Corrección QA',
    };
    await f.weighingService.correctClosed(
      f.identity,
      reception.id,
      sack.id,
      correction,
    );
    await f.weighingService.correctClosed(
      f.identity,
      reception.id,
      sack.id,
      correction,
    );
    const input = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 3,
      priceBasis: CalculationBasis.Kilogram,
      unitPriceCents: 100,
      freightBasis: CalculationBasis.Sack,
      freightRateCents: 50,
      advancesCents: 500,
      discountsCents: 50,
      paymentMode: PaymentMode.Cash,
      installments: [],
    };
    const purchase = await f.purchaseService.settle(
      f.identity,
      reception.id,
      input,
    );
    expect(
      (await f.purchaseService.settle(f.identity, reception.id, input)).id,
    ).toBe(purchase.id);
    expect(purchase).toMatchObject({
      grossAmountCents: '6000',
      liquidAmountCents: '5400',
    });
    await f.salesService.create(f.identity, saleInput(f));
    await assertNoInventory(f);
    const reversal = {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 4,
      expectedPurchaseVersion: 0,
      reason: 'Anulación QA',
    };
    await f.purchaseService.void(f.identity, purchase.id, reversal);
    await f.purchaseService.void(f.identity, purchase.id, reversal);
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ sourceId: purchase.id }),
    ).toBe(2);
  });
  it('voids a cash sale once, preserving original lines and historical financial effects', async () => {
    const f = await fixture();
    const sale = await f.salesService.create(f.identity, saleInput(f));
    const input = {
      clientOperationId: randomUUID(),
      expectedSaleVersion: 0,
      reason: 'QA',
    };
    await f.salesService.void(f.identity, sale.id, input);
    await f.salesService.void(f.identity, sale.id, input);
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ sourceId: sale.id }),
    ).toBe(2);
    expect(await f.sales.findOneByOrFail({ id: sale.id })).toMatchObject({
      state: SaleState.Voided,
      version: 1,
    });
    await assertNoInventory(f);
  });
  it('creates receivable installments and refuses stale void versions', async () => {
    const f = await fixture();
    const input = saleInput(f);
    input.paymentMode = PaymentMode.Credit;
    input.installments = [{ dueOn: '2026-11-01', amountCents: 224900 }];
    const sale = await f.salesService.create(f.identity, input);
    const account = await f.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({ sourceId: sale.id });
    expect(account.balanceCents).toBe('224900');
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ sourceId: sale.id }),
    ).toBe(0);
    await expect(
      f.salesService.void(f.identity, sale.id, {
        clientOperationId: randomUUID(),
        expectedSaleVersion: 1,
        reason: 'QA',
      }),
    ).rejects.toThrow(ConflictException);
    await f.salesService.void(f.identity, sale.id, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: 0,
      reason: 'QA',
    });
    expect(
      (
        await f.dataSource
          .getRepository(AccountEntity)
          .findOneByOrFail({ id: account.id })
      ).balanceCents,
    ).toBe('0');
    await assertNoInventory(f);
  });
  it('rejects another business variety before committing money or sales', async () => {
    const f = await fixture();
    const other = await fixture();
    const input = saleInput(f);
    input.lines[0]!.varietyId = other.variety.id;
    await expect(f.salesService.create(f.identity, input)).rejects.toThrow(
      NotFoundException,
    );
    expect(await f.sales.countBy({ businessId: f.identity.businessId })).toBe(
      0,
    );
    await assertNoInventory(f);
  });
  it('returns commercial quantities without physical stock and bounds cumulative compensation', async () => {
    const f = await fixture();
    const sale = await f.salesService.create(f.identity, saleInput(f));
    const line = await f.dataSource
      .getRepository(SaleLineEntity)
      .findOneByOrFail({ saleId: sale.id });
    const input = {
      clientOperationId: randomUUID(),
      expectedSaleVersion: 0,
      reason: 'QA',
      freightAdjustmentCents: 0,
      lines: [
        {
          saleLineId: line.id,
          sacks: 5,
          weightKg: '250',
          authorizedGrossCents: 37500,
        },
      ],
    };
    const first = await f.saleReturnsService.create(f.identity, sale.id, input);
    const retry = await f.saleReturnsService.create(f.identity, sale.id, input);
    expect(retry.saleReturn.id).toBe(first.saleReturn.id);
    expect(first.saleReturn.totalRefundCents).toBe('37483');
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ sourceId: first.saleReturn.id }),
    ).toBe(1);
    await expect(
      f.saleReturnsService.create(f.identity, sale.id, {
        ...input,
        clientOperationId: randomUUID(),
        expectedSaleVersion: 1,
        lines: [
          {
            saleLineId: line.id,
            sacks: 26,
            weightKg: '1300',
            authorizedGrossCents: 190000,
          },
        ],
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await expect(
      f.salesService.void(f.identity, sale.id, {
        clientOperationId: randomUUID(),
        expectedSaleVersion: 1,
        reason: 'QA',
      }),
    ).rejects.toThrow(ConflictException);
    await assertNoInventory(f);
  });
  it('records purchase 100 and sale 30 without deriving any remaining merchandise balance', async () => {
    const f = await fixture();
    const receipt = await f.receptionService.create(f.identity, {
      clientOperationId: randomUUID(),
      providerId: f.provider.id,
      expectedVarietyIds: [f.variety.id],
      receivedOn: '2026-10-07',
      driverName: 'QA 100/30',
    });
    for (let index = 0; index < 100; index++)
      await f.weighingService.add(f.identity, receipt.id, {
        clientOperationId: randomUUID(),
        expectedReceptionVersion: index,
        varietyId: f.variety.id,
        grossWeightKg: '10',
        tareKg: '0',
      });
    await f.weighingService.close(f.identity, receipt.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 100,
    });
    await f.purchaseService.settle(f.identity, receipt.id, {
      clientOperationId: randomUUID(),
      expectedReceptionVersion: 101,
      priceBasis: CalculationBasis.Kilogram,
      unitPriceCents: 100,
      advancesCents: 0,
      discountsCents: 0,
      paymentMode: PaymentMode.Cash,
      installments: [],
    });
    const input = saleInput(f);
    input.discountsCents = 0;
    input.lines[0]!.weightKg = '300.000';
    const sale = await f.salesService.create(f.identity, input);
    expect(
      await f.dataSource
        .getRepository(ReceptionSackEntity)
        .countBy({ receptionId: receipt.id }),
    ).toBe(100);
    expect(
      (
        await f.dataSource
          .getRepository(SaleLineEntity)
          .findOneByOrFail({ saleId: sale.id })
      ).sacks,
    ).toBe(30);
    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    const summary = await f.reportsService.commercialSummary(
      f.identity.businessId,
      { from: today, to: today },
    );
    expect(summary).not.toHaveProperty('inventory');
    expect(summary.purchases.liquidAmountCents).toBe('100000');
    expect(summary.sales.totalAmountCents).toBe('45000');
    await assertNoInventory(f);
  });
  it('credits the receivable and latest due installments without cash or stock restoration', async () => {
    const f = await fixture();
    const input = saleInput(f);
    input.paymentMode = PaymentMode.Credit;
    input.installments = [
      { dueOn: '2026-11-01', amountCents: 100000 },
      { dueOn: '2026-12-01', amountCents: 124900 },
    ];
    const sale = await f.salesService.create(f.identity, input);
    const line = await f.dataSource
      .getRepository(SaleLineEntity)
      .findOneByOrFail({ saleId: sale.id });
    const result = await f.saleReturnsService.create(f.identity, sale.id, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: 0,
      reason: 'QA crédito',
      freightAdjustmentCents: 0,
      lines: [
        {
          saleLineId: line.id,
          sacks: 5,
          weightKg: '250',
          authorizedGrossCents: 37500,
        },
      ],
    });
    expect(result.saleReturn).toMatchObject({
      accountCreditCents: '37483',
      cashRefundCents: '0',
    });
    const account = await f.dataSource
      .getRepository(AccountEntity)
      .findOneByOrFail({ sourceId: sale.id });
    expect(account.balanceCents).toBe('187417');
    const quotas = await f.dataSource
      .getRepository(AccountInstallmentEntity)
      .find({ where: { accountId: account.id }, order: { dueOn: 'ASC' } });
    expect(quotas.map((quota) => quota.balanceCents)).toEqual([
      '100000',
      '87417',
    ]);
    expect(
      await f.dataSource
        .getRepository(CashMovementEntity)
        .countBy({ businessId: f.identity.businessId }),
    ).toBe(0);
    await assertNoInventory(f);
  });
  it('filters all history by Lima day and literal participant, including inactive buyers beyond the first hundred rows', async () => {
    const f = await fixture();
    const sale = await f.salesService.create(f.identity, saleInput(f));
    const buyers = f.dataSource.getRepository(BuyerEntity);
    f.buyer.name = 'COMPRADOR 50%_ QA';
    f.buyer.isActive = false;
    await buyers.save(f.buyer);
    await f.sales.update(sale.id, {
      createdAt: new Date('2026-10-07T05:00:00Z'),
    });
    const history = f.sales.create(
      Array.from({ length: 100 }, () =>
        Object.assign({}, sale, {
          id: randomUUID(),
          clientOperationId: randomUUID(),
          createdAt: new Date('2026-10-08T04:59:59Z'),
        }),
      ),
    );
    const before = f.sales.create(
      Object.assign({}, sale, {
        id: randomUUID(),
        clientOperationId: randomUUID(),
        createdAt: new Date('2026-10-07T04:59:59Z'),
      }),
    );
    const after = f.sales.create(
      Object.assign({}, sale, {
        id: randomUUID(),
        clientOperationId: randomUUID(),
        createdAt: new Date('2026-10-08T05:00:00Z'),
      }),
    );
    const otherBuyer = await buyers.save(
      buyers.create({
        businessId: f.identity.businessId,
        name: 'Otro comprador',
        phone: null,
        destinationDepartment: 'Lima',
        creditLimitCents: null,
        isActive: true,
      }),
    );
    const different = f.sales.create(
      Object.assign({}, sale, {
        id: randomUUID(),
        clientOperationId: randomUUID(),
        buyerId: otherBuyer.id,
        createdAt: new Date('2026-10-07T10:00:00Z'),
      }),
    );
    await f.sales.save([...history, before, after, different]);
    const another = await fixture();
    another.buyer.name = f.buyer.name;
    await buyers.save(another.buyer);
    await another.salesService.create(another.identity, saleInput(another));
    const filter = {
      limit: 20,
      offset: 0,
      from: '2026-10-07',
      to: '2026-10-07',
      search: '50%_',
    };
    const first = await f.salesService.list(f.identity.businessId, filter);
    expect(first.total).toBe(101);
    expect(first.items).toHaveLength(20);
    expect(first.items[0]!.buyerName).toBe('COMPRADOR 50%_ QA');
    expect(first.items[0]).not.toHaveProperty('buyer');
    const last = await f.salesService.list(f.identity.businessId, {
      ...filter,
      offset: 100,
    });
    expect(last.total).toBe(101);
    expect(last.items).toHaveLength(1);
    expect(last.items[0]!.id).toBe(sale.id);
    const literal = await f.salesService.list(f.identity.businessId, {
      ...filter,
      search: '%',
    });
    expect(literal.total).toBe(101);
    const absent = await f.salesService.list(f.identity.businessId, {
      ...filter,
      search: '50_QA',
    });
    expect(absent.total).toBe(0);
    expect(
      (await f.salesService.get(f.identity.businessId, sale.id)).sale.buyerName,
    ).toBe('COMPRADOR 50%_ QA');
    await expect(
      f.salesService.list(f.identity.businessId, {
        ...filter,
        from: '2026-10-08',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await f.salesService.void(f.identity, sale.id, {
      clientOperationId: randomUUID(),
      expectedSaleVersion: 0,
      reason: 'Estado histórico QA',
    });
    expect(
      (
        await f.salesService.list(f.identity.businessId, {
          ...filter,
          state: SaleState.Voided,
        })
      ).total,
    ).toBe(1);
    expect(
      (
        await f.salesService.list(f.identity.businessId, {
          ...filter,
          state: SaleState.Confirmed,
        })
      ).total,
    ).toBe(100);
    await assertNoInventory(f);
  });
  it('filters all reception history by civil received date and inactive provider without multiplying varieties', async () => {
    const f = await fixture();
    const providers = f.dataSource.getRepository(ProviderEntity);
    const varieties = f.dataSource.getRepository(PotatoVarietyEntity);
    const extra = await varieties.save(
      varieties.create({
        businessId: f.identity.businessId,
        name: 'Segunda variedad QA',
        isActive: true,
      }),
    );
    const original = await f.receptionService.create(f.identity, {
      clientOperationId: randomUUID(),
      providerId: f.provider.id,
      driverName: 'Historial QA',
      receivedOn: '2026-10-07',
      expectedVarietyIds: [f.variety.id, extra.id],
    });
    await f.receptions.update(original.id, {
      createdAt: new Date('2026-10-09T12:00:00Z'),
    });
    f.provider.name = 'PROVEEDOR 50%_ QA';
    f.provider.isActive = false;
    await providers.save(f.provider);
    const rows = Array.from({ length: 100 }, () =>
      f.receptions.create(
        Object.assign({}, original, {
          id: randomUUID(),
          clientOperationId: randomUUID(),
          createdAt: new Date('2026-10-10T00:00:00Z'),
        }),
      ),
    );
    rows.push(
      f.receptions.create(
        Object.assign({}, original, {
          id: randomUUID(),
          clientOperationId: randomUUID(),
          receivedOn: '2026-10-06',
        }),
      ),
    );
    rows.push(
      f.receptions.create(
        Object.assign({}, original, {
          id: randomUUID(),
          clientOperationId: randomUUID(),
          receivedOn: '2026-10-08',
        }),
      ),
    );
    const otherProvider = await providers.save(
      providers.create({
        businessId: f.identity.businessId,
        name: 'Otro proveedor',
        phone: null,
        isActive: true,
      }),
    );
    rows.push(
      f.receptions.create(
        Object.assign({}, original, {
          id: randomUUID(),
          clientOperationId: randomUUID(),
          providerId: otherProvider.id,
        }),
      ),
    );
    await f.receptions.save(rows);
    const other = await fixture();
    other.provider.name = f.provider.name;
    await providers.save(other.provider);
    await other.receptionService.create(other.identity, {
      clientOperationId: randomUUID(),
      providerId: other.provider.id,
      driverName: 'Otro negocio',
      receivedOn: '2026-10-07',
      expectedVarietyIds: [other.variety.id],
    });
    const filter = {
      limit: 20,
      offset: 0,
      from: '2026-10-07',
      to: '2026-10-07',
      search: '50%_',
    };
    const first = await f.receptionService.list(f.identity.businessId, filter);
    expect(first.total).toBe(101);
    expect(first.items).toHaveLength(20);
    expect(first.items[0]!.providerName).toBe(f.provider.name);
    expect(first.items[0]).not.toHaveProperty('provider');
    expect(first.items[0]!.expectedVarieties).toHaveLength(2);
    const last = await f.receptionService.list(f.identity.businessId, {
      ...filter,
      offset: 100,
    });
    expect(last.items).toHaveLength(1);
    expect(last.items[0]!.id).toBe(original.id);
    expect(
      (
        await f.receptionService.list(f.identity.businessId, {
          ...filter,
          search: '%',
        })
      ).total,
    ).toBe(101);
    expect(
      (
        await f.receptionService.list(f.identity.businessId, {
          ...filter,
          search: '50_QA',
        })
      ).total,
    ).toBe(0);
    expect(
      (await f.receptionService.get(f.identity.businessId, original.id))
        .providerName,
    ).toBe(f.provider.name);
    expect(
      (
        await f.receptionService.list(f.identity.businessId, {
          ...filter,
          providerId: other.provider.id,
        })
      ).total,
    ).toBe(0);
    expect(
      (
        await f.receptionService.list(f.identity.businessId, {
          ...filter,
          state: ReceptionState.Settled,
        })
      ).total,
    ).toBe(0);
    await expect(
      f.receptionService.list(f.identity.businessId, {
        ...filter,
        from: '2026-10-08',
      }),
    ).rejects.toThrow(UnprocessableEntityException);
    await assertNoInventory(f);
  });
}
