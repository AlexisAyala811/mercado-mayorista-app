import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { DataSource, EntityManager, Repository } from 'typeorm';
import type { AuditService } from '../audit/audit.service.js';
import { BuyerEntity } from '../catalog/entities/buyer.entity.js';
import { PotatoVarietyEntity } from '../catalog/entities/potato-variety.entity.js';
import {CommercialCharacteristicEntity} from '../catalog/entities/commercial-characteristic.entity.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { UserRole } from '../identity/entities/user.entity.js';
import {
  InventoryLotEntity,
  InventoryLotState,
} from '../inventory/entities/inventory-lot.entity.js';
import { InventoryMovementEntity } from '../inventory/entities/inventory-movement.entity.js';
import { InventoryLotValuationEntity } from '../inventory/entities/inventory-lot-valuation.entity.js';
import {
  CashMovementEntity,
  CashDirection,
} from '../accounts/entities/cash-movement.entity.js';
import {
  CalculationBasis,
  PaymentMode,
} from '../purchase/entities/purchase-settlement.entity.js';
import { SaleEntity } from './entities/sale.entity.js';
import { SaleLineEntity } from './entities/sale-line.entity.js';
import { SaleLineCostEntity } from './entities/sale-line-cost.entity.js';
import type { CreateSaleDto } from './http/sale.dto.js';
import {SaleLineDto} from './http/sale.dto.js';
import { SalesService } from './sales.service.js';
import { AccountEntity } from '../accounts/entities/account.entity.js';
import { AccountInstallmentEntity } from '../accounts/entities/account-installment.entity.js';

function fixture() {
  const creditQuery = {
    select: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getRawOne: vi.fn().mockResolvedValue({ balance: '1000' }),
  };
  const repository = () => ({
    createQueryBuilder: vi.fn(() => creditQuery),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn((value) => value),
    save: vi.fn(async (value) => ({ id: 'sale', ...value })),
  });
  const sales = repository();
  const buyers = repository();
  buyers.findOne.mockResolvedValue({ id: 'buyer', creditLimitCents: null });
  const lot = {
    id: 'lot',
    version: 4,
    state: InventoryLotState.Available,
    availableSacks: 10,
    availableWeightKg: '100.000',
  };
  const lots = repository();
  lots.findOne.mockResolvedValue(lot);
  const varieties = repository();
  varieties.findOne.mockResolvedValue({ id: 'variety' });
  const lines = repository();
  const movements = repository();
  const cash = repository();
  const accounts = repository();
  const installments = repository();
  const valuations = repository();
  const lineCosts = repository();
  const characteristics=repository();
  characteristics.findOne.mockImplementation(async({where})=>({id:where.id,name:where.kind==='quality'?'Calidad capturada':'Origen capturado'}));
  const repositories = new Map<unknown, ReturnType<typeof repository>>([
    [SaleEntity, sales],
    [PotatoVarietyEntity, varieties],
    [BuyerEntity, buyers],
    [InventoryLotEntity, lots],
    [SaleLineEntity, lines],
    [InventoryMovementEntity, movements],
    [CashMovementEntity, cash],
    [AccountEntity, accounts],
    [AccountInstallmentEntity, installments],
    [InventoryLotValuationEntity, valuations],
    [SaleLineCostEntity, lineCosts],
    [CommercialCharacteristicEntity,characteristics],
  ]);
  const manager = {
    query: vi.fn(),
    getRepository: (entity: unknown) => {
      const result = repositories.get(entity);
      if (!result) throw new Error('Unexpected repository');
      return result;
    },
  } as unknown as EntityManager;
  const dataSource = {
    transaction: async (work: (manager: EntityManager) => Promise<unknown>) =>
      work(manager),
  } as DataSource;
  const audit = { record: vi.fn() };
  const service = new SalesService(
    dataSource,
    audit as unknown as AuditService,
    sales as unknown as Repository<SaleEntity>,
    lines as unknown as Repository<SaleLineEntity>,
  );
  const identity: SessionIdentity = {
    businessId: 'business',
    businessName: 'Mercado',
    userId: 'user',
    username: 'mayorista',
    sessionId: 'session',
    expiresAt: new Date('2099-01-01'),
    role: UserRole.Wholesaler,
  };
  const input: CreateSaleDto = {
    clientOperationId: 'operation',
    buyerId: 'buyer',
    destinationDepartment: 'Lima',
    discountsCents: 0,
    freightIncludedInTotal: false,
    paymentMode: PaymentMode.Cash,
    installments: [],
    lines: [
      {
        varietyId: 'variety',
        sacks: 2,
        weightKg: '20.125',
        priceBasis: CalculationBasis.Kilogram,
        unitPriceCents: 150,
      },
    ],
  };
  return {
    service,
    audit,
    accounts,
    installments,
    creditQuery,
    identity,
    input,
    lot,
    sales,
    buyers,
    varieties,
    lots,
    lines,
    movements,
    cash,
  };
}

describe('Sale credit limits', () => {
  function creditFixture() {
    const f = fixture();
    f.input.paymentMode = PaymentMode.Credit;
    f.input.installments = [{ dueOn: '2026-10-01', amountCents: 3019 }];
    f.buyers.findOne.mockResolvedValue({
      id: 'buyer',
      creditLimitCents: '4000',
    });
    return f;
  }

  it('includes outstanding debt when rejecting an exceeded limit', async () => {
    const f = creditFixture();
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      'La venta supera el límite',
    );
    expect(f.sales.save).not.toHaveBeenCalled();
    expect(f.creditQuery.where).toHaveBeenCalledWith(
      'account.businessId = :businessId',
      { businessId: 'business' },
    );
  });

  it('does not allow an assistant to authorize the exception', async () => {
    const f = creditFixture();
    f.input.authorizeCreditLimitOverride = true;
    f.identity.role = UserRole.Assistant;
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      ForbiddenException,
    );
    expect(f.accounts.save).not.toHaveBeenCalled();
  });

  it('records the wholesaler credit exception with limit and resulting debt', async () => {
    const f = creditFixture();
    f.input.authorizeCreditLimitOverride = true;
    await f.service.create(f.identity, f.input);
    expect(f.audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'sale.confirmed',
        actorUserId: 'user',
        details: expect.objectContaining({
          creditLimitOverride: {
            buyerId: 'buyer',
            creditLimitCents: '4000',
            previousBalanceCents: '1000',
            resultingBalanceCents: '4019',
          },
        }),
      }),
    );
    expect(f.accounts.create).toHaveBeenCalledWith(
      expect.objectContaining({ balanceCents: '3019' }),
    );
    expect(f.cash.save).not.toHaveBeenCalled();
  });

  it('does not report an exception when the debt exactly matches the limit', async () => {
    const f = creditFixture();
    f.creditQuery.getRawOne.mockResolvedValue({ balance: '981' });
    await f.service.create(f.identity, f.input);
    expect(f.audit.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        details: expect.objectContaining({ creditLimitOverride: null }),
      }),
    );
  });

  it('rejects installments that do not sum to the sale total', async () => {
    const f = creditFixture();
    f.input.installments[0]!.amountCents = 3000;
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      'Los vencimientos deben sumar',
    );
    expect(f.sales.save).not.toHaveBeenCalled();
  });
});

describe('Sale confirmation', () => {
  it('keeps separate characteristics for two lines of the same variety without inventory effects',async()=>{
    const f=fixture();f.input.lines.push(Object.assign(new SaleLineDto(),f.input.lines[0],{qualityId:'quality-a',originId:'origin-a'}));
    const result=await f.service.create(f.identity,f.input);
    expect(result.grossAmountCents).toBe('6038');
    expect(f.lines.save).toHaveBeenCalledTimes(2);
    expect(f.lines.save).toHaveBeenNthCalledWith(1,expect.objectContaining({varietyId:'variety',qualityId:null,originId:null}));
    expect(f.lines.save).toHaveBeenNthCalledWith(2,expect.objectContaining({varietyId:'variety',qualityId:'quality-a',qualityName:'Calidad capturada',originId:'origin-a',originName:'Origen capturado'}));
    expect(f.lots.save).not.toHaveBeenCalled();expect(f.movements.save).not.toHaveBeenCalled();
  });
  it('records the operation and rounded cash collection without stock access', async () => {
    const f = fixture();
    const result = await f.service.create(f.identity, f.input);
    expect(result.totalAmountCents).toBe('3019');
    expect(f.cash.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: '3019',
        direction: CashDirection.In,
      }),
    );
    expect(f.lines.create).toHaveBeenCalledWith(
      expect.objectContaining({
        varietyId: 'variety',
        lotId: null,
        lotVersion: null,
        weightKg: '20.125',
        sacks: 2,
      }),
    );
    expect(f.lots.findOne).not.toHaveBeenCalled();
    expect(f.lots.save).not.toHaveBeenCalled();
    expect(f.movements.save).not.toHaveBeenCalled();
    expect(f.varieties.findOne).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_read' },
      where: { businessId: 'business', id: 'variety', isActive: true },
    });
  });
  it('rejects varieties outside the active business catalogue before financial effects', async () => {
    const f = fixture();
    f.varieties.findOne.mockResolvedValue(null);
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      NotFoundException,
    );
    expect(f.sales.save).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
  });
  it.each([
    { sacks: 11, weightKg: '20.000' },
    { sacks: 2, weightKg: '101.000' },
    { sacks: 10, weightKg: '20.000' },
  ])(
    'accepts independent operation quantities %j without checking old availability',
    async (quantities) => {
      const f = fixture();
      Object.assign(f.input.lines[0]!, quantities);
      await f.service.create(f.identity, f.input);
      expect(f.lines.create).toHaveBeenCalledWith(
        expect.objectContaining({
          sacks: quantities.sacks,
          weightKg: quantities.weightKg,
        }),
      );
      expect(f.lots.findOne).not.toHaveBeenCalled();
      expect(f.movements.save).not.toHaveBeenCalled();
    },
  );
  it.each([
    { sacks: 0, weightKg: '1' },
    { sacks: 1, weightKg: '0' },
  ])('rejects nonpositive operation quantities %j', async (quantities) => {
    const f = fixture();
    Object.assign(f.input.lines[0]!, quantities);
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(f.sales.save).not.toHaveBeenCalled();
  });
  it('rejects repeated varieties before persisting effects', async () => {
    const f = fixture();
    f.input.lines.push(
      Object.assign(
        new (f.input.lines[0]!.constructor as typeof Object)(),
        f.input.lines[0]!,
      ),
    );
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      'La combinación de variedad, calidad y procedencia no puede repetirse',
    );
    expect(f.sales.save).not.toHaveBeenCalled();
  });

  function confirmedRetryFixture() {
    const f = fixture();
    const confirmed = {
      id: 'confirmed',
      buyerId: 'buyer',
      destinationDepartment: 'Lima',
      discountsCents: '0',
      freightBasis: null,
      freightIncludedInTotal: false,
      freightRateCents: null,
      paymentMode: PaymentMode.Cash,
      vehicleId: null,
    };
    f.sales.findOne.mockResolvedValue(confirmed);
    Object.assign(f.lines, {
      find: vi.fn().mockResolvedValue([
        {
          originId: null,
          priceBasis: CalculationBasis.Kilogram,
          qualityId: null,
          sacks: 2,
          unitPriceCents: '150',
          varietyId: 'variety',
          weightKg: '20.125',
        },
      ]),
    });
    return { ...f, confirmed };
  }

  it('returns a confirmed retry without repeating financial effects', async () => {
    const f = confirmedRetryFixture();
    await expect(f.service.create(f.identity, f.input)).resolves.toBe(
      f.confirmed,
    );
    expect(f.lots.findOne).not.toHaveBeenCalled();
    expect(f.cash.save).not.toHaveBeenCalled();
  });

  it('rejects an operation identifier reused for a different sale', async () => {
    const f = confirmedRetryFixture();
    f.input.lines[0]!.unitPriceCents = 151;
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      ConflictException,
    );
    f.input.lines[0]!.unitPriceCents = 150;
    f.input.buyerId = 'other-buyer';
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      ConflictException,
    );
    expect(f.cash.save).not.toHaveBeenCalled();
    expect(f.sales.save).not.toHaveBeenCalled();
  });

  it('requires the buyer to belong to the authenticated business', async () => {
    const f = fixture();
    f.buyers.findOne.mockResolvedValue(null);
    await expect(f.service.create(f.identity, f.input)).rejects.toThrow(
      NotFoundException,
    );
    expect(f.buyers.findOne).toHaveBeenCalledWith({
      lock: { mode: 'pessimistic_write' },
      where: { businessId: 'business', id: 'buyer', isActive: true },
    });
    expect(f.sales.save).not.toHaveBeenCalled();
  });
});
