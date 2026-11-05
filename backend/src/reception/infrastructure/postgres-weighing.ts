import { IsNull, type DataSource, type EntityManager } from 'typeorm';

import type { AuditService } from '../../audit/audit.service.js';
import { resolveCommercialSnapshot } from '../../catalog/commercial-snapshot.js';
import type {
  NewSack,
  ReceptionLock,
  WeighingAudit,
  WeighingAuditEvent,
  WeighingReception,
  WeighingRepository,
  WeighingUnitOfWork,
} from '../application/weighing-ports.js';
import {
  ReceptionEntity,
  ReceptionState,
} from '../entities/reception.entity.js';
import { ReceptionSackEntity } from '../entities/reception-sack.entity.js';

// PostgreSQL adapters: one database transaction is the unit of work, so the
// sacks, the reception version and the audit event are confirmed together.
export class PostgresWeighingUnitOfWork implements WeighingUnitOfWork<
  ReceptionSackEntity,
  ReceptionEntity
> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  run<T>(
    work: (ports: {
      repository: WeighingRepository<ReceptionSackEntity, ReceptionEntity>;
      audit: WeighingAudit;
    }) => Promise<T>,
  ) {
    return this.dataSource.transaction((manager) =>
      work({
        audit: new PostgresWeighingAudit(manager, this.auditService),
        repository: new PostgresWeighingRepository(manager),
      }),
    );
  }
}

export class PostgresWeighingRepository implements WeighingRepository<
  ReceptionSackEntity,
  ReceptionEntity
> {
  private readonly locked = new Map<string, ReceptionEntity>();

  constructor(private readonly manager: EntityManager) {}

  private get sacks() {
    return this.manager.getRepository(ReceptionSackEntity);
  }

  async lockOperation(businessId: string, clientOperationId: string) {
    await this.manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [businessId, clientOperationId],
    );
  }

  findSackByOperation(businessId: string, clientOperationId: string) {
    return this.sacks.findOne({ where: { businessId, clientOperationId } });
  }

  findSackByVoidOperation(businessId: string, voidOperationId: string) {
    return this.sacks.findOne({ where: { businessId, voidOperationId } });
  }

  async lockReception(
    businessId: string,
    receptionId: string,
    lock: ReceptionLock,
  ): Promise<WeighingReception | null> {
    const reception =
      lock === 'with-varieties'
        ? await lockReceptionWithVarieties(
            this.manager,
            businessId,
            receptionId,
          )
        : await this.manager.getRepository(ReceptionEntity).findOne({
            lock: { mode: 'pessimistic_write' },
            where: { businessId, id: receptionId },
          });
    if (!reception) return null;
    this.locked.set(reception.id, reception);
    return {
      closeOperationId: reception.closeOperationId,
      id: reception.id,
      state: reception.state,
      varietyIds:
        reception.expectedVarieties?.map((variety) => variety.id) ?? [],
      version: reception.version,
    };
  }

  findActiveSack(businessId: string, receptionId: string, sackId: string) {
    return this.sacks.findOne({
      where: { businessId, id: sackId, receptionId, voidedAt: IsNull() },
    });
  }

  activeSacks(businessId: string, receptionId: string) {
    return this.sacks.find({
      where: { businessId, receptionId, voidedAt: IsNull() },
    });
  }

  async nextSequence(receptionId: string) {
    const maximum = await this.sacks
      .createQueryBuilder('sack')
      .select('COALESCE(MAX(sack.sequence), 0)', 'maximum')
      .where('sack.receptionId = :receptionId', { receptionId })
      .getRawOne<{ maximum: string }>();
    return Number(maximum?.maximum ?? 0) + 1;
  }

  async addSack(sack: NewSack & { sequence: number }) {
    return this.sacks.save(
      this.sacks.create({
        ...this.sackFields(sack),
        correctionReason: null,
        correctedFromSackId: null,
        ...(await resolveCommercialSnapshot(this.manager, sack.businessId, {
          originId: sack.originId,
          qualityId: sack.qualityId,
        })),
        sequence: sack.sequence,
      }),
    );
  }

  async replaceSack(
    original: ReceptionSackEntity,
    replacement: NewSack & { correctionReason: string | null },
  ) {
    if (replacement.correctionReason !== null)
      original.correctionReason = replacement.correctionReason;
    original.voidedAt = new Date();
    await this.sacks.save(original);
    return this.sacks.save(
      this.sacks.create({
        ...this.sackFields(replacement),
        correctionReason: replacement.correctionReason,
        correctedFromSackId: original.id,
        ...(await resolveCommercialSnapshot(
          this.manager,
          replacement.businessId,
          { originId: replacement.originId, qualityId: replacement.qualityId },
          original,
        )),
        sequence: original.sequence,
      }),
    );
  }

  async voidSack(
    sack: ReceptionSackEntity,
    reason: string,
    voidOperationId: string,
  ) {
    sack.correctionReason = reason;
    sack.voidOperationId = voidOperationId;
    sack.voidedAt = new Date();
    return this.sacks.save(sack);
  }

  async markWeighing(reception: WeighingReception) {
    const entity = this.lockedEntity(reception);
    entity.state = ReceptionState.Weighing;
    entity.version += 1;
    await this.manager.getRepository(ReceptionEntity).save(entity);
  }

  async bumpVersion(reception: WeighingReception) {
    const entity = this.lockedEntity(reception);
    entity.version += 1;
    await this.manager.getRepository(ReceptionEntity).save(entity);
    return entity.version;
  }

  closeReception(reception: WeighingReception, closeOperationId: string) {
    const entity = this.lockedEntity(reception);
    entity.closeOperationId = closeOperationId;
    entity.closedAt = new Date();
    entity.state = ReceptionState.Weighed;
    entity.version += 1;
    return this.manager.getRepository(ReceptionEntity).save(entity);
  }

  storedReception(reception: WeighingReception) {
    return this.lockedEntity(reception);
  }

  private lockedEntity(reception: WeighingReception) {
    const entity = this.locked.get(reception.id);
    if (!entity)
      throw new Error('The reception was not locked in this unit of work.');
    return entity;
  }

  private sackFields(sack: NewSack) {
    return {
      businessId: sack.businessId,
      clientOperationId: sack.clientOperationId,
      createdByUserId: sack.createdByUserId,
      grossWeightKg: sack.weight.gross,
      netWeightKg: sack.weight.net,
      receptionId: sack.receptionId,
      tareKg: sack.weight.tare,
      varietyId: sack.varietyId,
      voidOperationId: null,
      voidedAt: null,
    };
  }
}

class PostgresWeighingAudit implements WeighingAudit {
  constructor(
    private readonly manager: EntityManager,
    private readonly auditService: AuditService,
  ) {}

  record(event: WeighingAuditEvent) {
    return this.auditService.record(this.manager, event);
  }
}

export function lockReceptionWithVarieties(
  manager: EntityManager,
  businessId: string,
  receptionId: string,
) {
  return manager
    .getRepository(ReceptionEntity)
    .createQueryBuilder('reception')
    .innerJoinAndSelect('reception.expectedVarieties', 'expectedVariety')
    .where('reception.businessId = :businessId', { businessId })
    .andWhere('reception.id = :receptionId', { receptionId })
    .setLock('pessimistic_write', undefined, ['reception'])
    .getOne();
}
