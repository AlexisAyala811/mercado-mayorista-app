import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';

import { AuditService } from '../audit/audit.service.js';
import {
  formatFixedDecimal,
  parseFixedDecimal,
  parseSignedFixedDecimal,
} from '../common/domain/fixed-decimal.js';
import { toPage, type PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { SaleEntity, SaleState } from '../sales/entities/sale.entity.js';
import { SaleLineEntity } from '../sales/entities/sale-line.entity.js';
import {
  InventoryLotEntity,
  InventoryLotState,
} from './entities/inventory-lot.entity.js';
import {
  InventoryMovementEntity,
  InventoryMovementType,
} from './entities/inventory-movement.entity.js';
import {
  InventoryAdjustmentKind,
  type AdjustInventoryDto,
} from './http/adjust-inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(InventoryLotEntity)
    private readonly lots: Repository<InventoryLotEntity>,
    @InjectRepository(InventoryMovementEntity)
    private readonly movements: Repository<InventoryMovementEntity>,
  ) {}

  async listLots(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.lots.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async getLot(businessId: string, id: string) {
    const lot = await this.lots.findOne({ where: { businessId, id } });
    if (!lot) throw new NotFoundException('Lote no encontrado.');
    return lot;
  }

  async listMovements(businessId: string, lotId: string, page: PageQueryDto) {
    await this.getLot(businessId, lotId);
    const [items, total] = await this.movements.findAndCount({
      where: { businessId, lotId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async adjust(
    identity: SessionIdentity,
    lotId: string,
    input: AdjustInventoryDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const movementRepository = manager.getRepository(InventoryMovementEntity);
      const existing = await movementRepository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          lotId,
          type: movementType(input.kind),
        },
      });
      if (existing) return existing;

      let weightDelta: bigint;
      try {
        weightDelta = parseSignedFixedDecimal(input.weightDeltaKg, 3, 11);
      } catch {
        throw new UnprocessableEntityException(
          'El ajuste de peso admite hasta tres decimales.',
        );
      }
      if (input.sackDelta === 0 && weightDelta === 0n) {
        throw new UnprocessableEntityException(
          'El ajuste debe modificar sacos o peso.',
        );
      }
      // Returns lock the sale before the lot, matching the sale-void lock order.
      const sourceSale = await validateKind(
        manager,
        identity.businessId,
        lotId,
        input,
        weightDelta,
      );
      const lotRepository = manager.getRepository(InventoryLotEntity);
      const lot = await lotRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: lotId },
      });
      if (!lot) throw new NotFoundException('Lote no encontrado.');
      if (
        lot.state === InventoryLotState.Blocked ||
        lot.state === InventoryLotState.Voided
      ) {
        throw new ConflictException(
          'El lote no admite ajustes en su estado actual.',
        );
      }
      if (lot.version !== input.expectedVersion) {
        throw new ConflictException({
          code: 'inventory-version-conflict',
          currentVersion: lot.version,
          message: 'El lote cambió; revise su disponibilidad.',
        });
      }

      const sacks = lot.availableSacks + input.sackDelta;
      const weight =
        parseFixedDecimal(lot.availableWeightKg, 3, 11) + weightDelta;
      if (sacks < 0 || weight < 0n)
        throw new UnprocessableEntityException(
          'El ajuste deja existencias negativas.',
        );
      if (
        sacks > lot.initialSacks ||
        weight > parseFixedDecimal(lot.initialWeightKg, 3, 11)
      ) {
        throw new UnprocessableEntityException(
          'El ajuste supera la existencia inicial del lote.',
        );
      }
      if ((sacks === 0) !== (weight === 0n)) {
        throw new UnprocessableEntityException(
          'Un lote agotado debe quedar sin sacos y sin peso.',
        );
      }

      lot.availableSacks = sacks;
      lot.availableWeightKg = formatFixedDecimal(weight, 3);
      lot.state =
        sacks === 0 ? InventoryLotState.Depleted : InventoryLotState.Available;
      lot.version += 1;
      await lotRepository.save(lot);
      const movement = await movementRepository.save(
        movementRepository.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          lotId,
          reason: input.reason,
          sackDelta: input.sackDelta,
          sourceId: input.sourceSaleId ?? lot.id,
          sourceType:
            input.kind === InventoryAdjustmentKind.Return
              ? 'sale-return'
              : 'inventory-adjustment',
          type: movementType(input.kind),
          weightDeltaKg: formatFixedDecimal(weightDelta, 3),
        }),
      );
      if (sourceSale) {
        sourceSale.version += 1;
        await manager.getRepository(SaleEntity).save(sourceSale);
      }
      await this.audit.record(manager, {
        action: `inventory.${input.kind}`,
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          lotVersion: lot.version,
          reason: input.reason,
          sackDelta: input.sackDelta,
          weightDeltaKg: movement.weightDeltaKg,
        },
        resourceId: lot.id,
        resourceType: 'inventory-lot',
      });
      return movement;
    });
  }
}

function movementType(kind: InventoryAdjustmentKind) {
  if (kind === InventoryAdjustmentKind.Loss)
    return InventoryMovementType.LossOut;
  if (kind === InventoryAdjustmentKind.Return)
    return InventoryMovementType.ReturnIn;
  return InventoryMovementType.Adjustment;
}

async function validateKind(
  manager: import('typeorm').EntityManager,
  businessId: string,
  lotId: string,
  input: AdjustInventoryDto,
  weightDelta: bigint,
) {
  if (
    input.kind === InventoryAdjustmentKind.Loss &&
    (input.sackDelta > 0 || weightDelta > 0n)
  ) {
    throw new UnprocessableEntityException(
      'Una merma solo puede reducir sacos o peso.',
    );
  }
  if (input.kind === InventoryAdjustmentKind.Return) {
    if (input.sackDelta < 0 || weightDelta < 0n) {
      throw new UnprocessableEntityException(
        'Una devolución solo puede reingresar sacos o peso.',
      );
    }
    if (!input.sourceSaleId)
      throw new UnprocessableEntityException(
        'La devolución debe identificar la venta de origen.',
      );
    const sale = await manager.getRepository(SaleEntity).findOne({
      lock: { mode: 'pessimistic_write' },
      where: { businessId, id: input.sourceSaleId, state: SaleState.Confirmed },
    });
    if (!sale) throw new NotFoundException('Venta de origen no encontrada.');
    const line = await manager
      .getRepository(SaleLineEntity)
      .findOne({ where: { lotId, saleId: sale.id } });
    if (!line)
      throw new UnprocessableEntityException(
        'El lote no pertenece a la venta indicada.',
      );
    const previousReturns = await manager
      .getRepository(InventoryMovementEntity)
      .find({
        where: {
          businessId,
          lotId,
          sourceId: sale.id,
          sourceType: 'sale-return',
          type: InventoryMovementType.ReturnIn,
        },
      });
    const returnedSacks = previousReturns.reduce(
      (sum, movement) => sum + movement.sackDelta,
      0,
    );
    const returnedWeight = previousReturns.reduce(
      (sum, movement) => sum + parseFixedDecimal(movement.weightDeltaKg, 3, 11),
      0n,
    );
    if (
      returnedSacks + input.sackDelta > line.sacks ||
      returnedWeight + weightDelta > parseFixedDecimal(line.weightKg, 3, 11)
    ) {
      throw new UnprocessableEntityException(
        'La devolución supera lo vendido para ese lote.',
      );
    }
    return sale;
  } else if (input.sourceSaleId) {
    throw new UnprocessableEntityException(
      'La venta de origen solo corresponde a una devolución.',
    );
  }
  return null;
}
