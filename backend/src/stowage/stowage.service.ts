import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, type Repository } from 'typeorm';

import {
  CashDirection,
  CashMovementEntity,
} from '../accounts/entities/cash-movement.entity.js';
import { AuditService } from '../audit/audit.service.js';
import {
  requireSameOperation,
  sameMembers,
} from '../common/domain/operation-replay.js';
import { toPage, type PageQueryDto } from '../common/http/page-query.dto.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { PurchaseSettlementEntity } from '../purchase/entities/purchase-settlement.entity.js';
import { SaleEntity } from '../sales/entities/sale.entity.js';
import {
  StowageEntryEntity,
  StowageEntryState,
  StowageOperationType,
} from './entities/stowage-entry.entity.js';
import { StowageSettlementEntity } from './entities/stowage-settlement.entity.js';
import { WorkGroupEntity } from './entities/work-group.entity.js';
import type {
  CreateStowageEntryDto,
  CreateWorkGroupDto,
  SettleStowageDto,
} from './http/stowage.dto.js';

@Injectable()
export class StowageService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(WorkGroupEntity)
    private readonly groups: Repository<WorkGroupEntity>,
    @InjectRepository(StowageEntryEntity)
    private readonly entries: Repository<StowageEntryEntity>,
  ) {}

  async listGroups(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.groups.findAndCount({
      where: { businessId, isActive: true },
      order: { name: 'ASC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createGroup(identity: SessionIdentity, input: CreateWorkGroupDto) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const repository = manager.getRepository(WorkGroupEntity);
        const group = await repository.save(
          repository.create({
            businessId: identity.businessId,
            isActive: true,
            name: input.name,
          }),
        );
        await this.audit.record(manager, {
          action: 'work-group.created',
          actorUserId: identity.userId,
          businessId: identity.businessId,
          resourceId: group.id,
          resourceType: 'work-group',
        });
        return group;
      });
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === '23505'
      ) {
        throw new ConflictException(
          'Ya existe un grupo activo con ese nombre.',
        );
      }
      throw error;
    }
  }

  async deactivateGroup(identity: SessionIdentity, id: string) {
    await this.dataSource.transaction(async (manager) => {
      const result = await manager
        .getRepository(WorkGroupEntity)
        .update(
          { businessId: identity.businessId, id, isActive: true },
          { isActive: false },
        );
      if (!result.affected)
        throw new NotFoundException('Grupo de trabajadores no encontrado.');
      await this.audit.record(manager, {
        action: 'work-group.deactivated',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: id,
        resourceType: 'work-group',
      });
    });
  }

  async listEntries(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.entries.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async createEntry(identity: SessionIdentity, input: CreateStowageEntryDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const repository = manager.getRepository(StowageEntryEntity);
      const existing = await repository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(
          existing.workGroupId === input.workGroupId &&
            existing.operationType === input.operationType &&
            existing.operationId === input.operationId &&
            existing.activity === input.activity &&
            existing.amountCents === String(input.amountCents) &&
            existing.occurredOn === input.occurredOn,
        );
        return existing;
      }
      const group = await manager.getRepository(WorkGroupEntity).exists({
        where: {
          businessId: identity.businessId,
          id: input.workGroupId,
          isActive: true,
        },
      });
      if (!group)
        throw new NotFoundException('Grupo de trabajadores no encontrado.');
      const operationExists =
        input.operationType === StowageOperationType.Purchase
          ? await manager.getRepository(PurchaseSettlementEntity).exists({
              where: { businessId: identity.businessId, id: input.operationId },
            })
          : await manager.getRepository(SaleEntity).exists({
              where: {
                businessId: identity.businessId,
                id: input.operationId,
              },
            });
      if (!operationExists)
        throw new NotFoundException('Operación de origen no encontrada.');
      const entry = await repository.save(
        repository.create({
          activity: input.activity,
          amountCents: String(input.amountCents),
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          occurredOn: input.occurredOn,
          operationId: input.operationId,
          operationType: input.operationType,
          settlementId: null,
          state: StowageEntryState.Pending,
          workGroupId: input.workGroupId,
        }),
      );
      await this.audit.record(manager, {
        action: 'stowage.entry-created',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        resourceId: entry.id,
        resourceType: 'stowage-entry',
      });
      return entry;
    });
  }

  async settle(identity: SessionIdentity, input: SettleStowageDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const settlements = manager.getRepository(StowageSettlementEntity);
      const existing = await settlements.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      const repository = manager.getRepository(StowageEntryEntity);
      if (existing) {
        const settled = await repository.find({
          select: { id: true },
          where: { businessId: identity.businessId, settlementId: existing.id },
        });
        requireSameOperation(
          existing.settledOn === input.settledOn &&
            sameMembers(
              settled.map((entry) => entry.id),
              input.entryIds,
            ),
        );
        return existing;
      }
      const entries: StowageEntryEntity[] = [];
      for (const id of [...input.entryIds].sort()) {
        const entry = await repository.findOne({
          lock: { mode: 'pessimistic_write' },
          where: { businessId: identity.businessId, id },
        });
        if (!entry)
          throw new NotFoundException('Registro de estiba no encontrado.');
        if (entry.state !== StowageEntryState.Pending)
          throw new ConflictException(
            'Un registro de estiba ya fue liquidado.',
          );
        entries.push(entry);
      }
      const total = entries.reduce(
        (sum, entry) => sum + BigInt(entry.amountCents),
        0n,
      );
      const settlement = await settlements.save(
        settlements.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          settledOn: input.settledOn,
          totalAmountCents: total.toString(),
        }),
      );
      for (const entry of entries) {
        entry.settlementId = settlement.id;
        entry.state = StowageEntryState.Settled;
        await repository.save(entry);
      }
      const cash = manager.getRepository(CashMovementEntity);
      await cash.save(
        cash.create({
          amountCents: total.toString(),
          businessId: identity.businessId,
          category: 'stowage-settlement',
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          direction: CashDirection.Out,
          sourceId: settlement.id,
          sourceType: 'stowage-settlement',
        }),
      );
      await this.audit.record(manager, {
        action: 'stowage.settled',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          entryCount: entries.length,
          totalAmountCents: total.toString(),
        },
        resourceId: settlement.id,
        resourceType: 'stowage-settlement',
      });
      return settlement;
    });
  }
}
