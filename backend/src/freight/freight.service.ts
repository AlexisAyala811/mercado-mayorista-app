import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';

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
import {
  FreightEntryEntity,
  FreightEntryState,
} from './entities/freight-entry.entity.js';
import { FreightSettlementEntity } from './entities/freight-settlement.entity.js';
import type { SettleFreightDto } from './http/freight.dto.js';

@Injectable()
export class FreightService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
    @InjectRepository(FreightEntryEntity)
    private readonly entries: Repository<FreightEntryEntity>,
    @InjectRepository(FreightSettlementEntity)
    private readonly settlements: Repository<FreightSettlementEntity>,
  ) {}

  async listEntries(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.entries.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async listSettlements(businessId: string, page: PageQueryDto) {
    const [items, total] = await this.settlements.findAndCount({
      where: { businessId },
      order: { createdAt: 'DESC' },
      skip: page.offset,
      take: page.limit,
    });
    return toPage(items, total, page);
  }

  async settle(identity: SessionIdentity, input: SettleFreightDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const settlementRepository = manager.getRepository(
        FreightSettlementEntity,
      );
      const repeated = await settlementRepository.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      const entryRepository = manager.getRepository(FreightEntryEntity);
      if (repeated) {
        const settled = await entryRepository.find({
          select: { id: true },
          where: { businessId: identity.businessId, settlementId: repeated.id },
        });
        requireSameOperation(
          repeated.settledOn === input.settledOn &&
            sameMembers(
              settled.map((entry) => entry.id),
              input.entryIds,
            ),
        );
        return repeated;
      }
      const entries: FreightEntryEntity[] = [];
      for (const id of [...input.entryIds].sort()) {
        const entry = await entryRepository.findOne({
          lock: { mode: 'pessimistic_write' },
          where: { businessId: identity.businessId, id },
        });
        if (!entry)
          throw new NotFoundException('Registro de flete no encontrado.');
        if (entry.state !== FreightEntryState.Pending)
          throw new ConflictException(
            'Un registro de flete ya no está pendiente.',
          );
        entries.push(entry);
      }
      const total = entries.reduce(
        (sum, entry) => sum + BigInt(entry.amountCents),
        0n,
      );
      const settlement = await settlementRepository.save(
        settlementRepository.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          settledOn: input.settledOn,
          totalAmountCents: total.toString(),
        }),
      );
      for (const entry of entries) {
        entry.settlementId = settlement.id;
        entry.state = FreightEntryState.Settled;
        await entryRepository.save(entry);
      }
      const cash = manager.getRepository(CashMovementEntity);
      await cash.save(
        cash.create({
          amountCents: total.toString(),
          businessId: identity.businessId,
          category: 'freight-settlement',
          clientOperationId: input.clientOperationId,
          createdByUserId: identity.userId,
          direction: CashDirection.Out,
          sourceId: settlement.id,
          sourceType: 'freight-settlement',
        }),
      );
      await this.audit.record(manager, {
        action: 'freight.settled',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          entryCount: entries.length,
          totalAmountCents: total.toString(),
        },
        resourceId: settlement.id,
        resourceType: 'freight-settlement',
      });
      return settlement;
    });
  }
}
