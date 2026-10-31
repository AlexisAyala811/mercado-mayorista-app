import type { DataSource, EntityManager } from 'typeorm';

import type { AuditService } from '../../audit/audit.service.js';
import { resolveCommercialSnapshot } from '../../catalog/commercial-snapshot.js';
import type {
  NewSack,
  WeighingAudit,
  WeighingReception,
  WeighingRepository,
  WeighingUnitOfWork,
} from '../application/register-sack-weight.js';
import {
  ReceptionEntity,
  ReceptionState,
} from '../entities/reception.entity.js';
import { ReceptionSackEntity } from '../entities/reception-sack.entity.js';

// PostgreSQL adapters: one database transaction is the unit of work, so the
// sack, the reception version and the audit event are confirmed together.
export class PostgresWeighingUnitOfWork implements WeighingUnitOfWork<ReceptionSackEntity> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
  ) {}

  run<T>(
    work: (ports: {
      repository: WeighingRepository<ReceptionSackEntity>;
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

export class PostgresWeighingRepository implements WeighingRepository<ReceptionSackEntity> {
  private readonly locked = new Map<string, ReceptionEntity>();

  constructor(private readonly manager: EntityManager) {}

  async lockOperation(businessId: string, clientOperationId: string) {
    await this.manager.query(
      'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
      [businessId, clientOperationId],
    );
  }

  findSackByOperation(businessId: string, clientOperationId: string) {
    return this.manager
      .getRepository(ReceptionSackEntity)
      .findOne({ where: { businessId, clientOperationId } });
  }

  async lockReception(
    businessId: string,
    receptionId: string,
  ): Promise<WeighingReception | null> {
    const reception = await lockReceptionWithVarieties(
      this.manager,
      businessId,
      receptionId,
    );
    if (!reception) return null;
    this.locked.set(reception.id, reception);
    return {
      id: reception.id,
      state: reception.state,
      varietyIds: reception.expectedVarieties.map((variety) => variety.id),
      version: reception.version,
    };
  }

  async nextSequence(receptionId: string) {
    const maximum = await this.manager
      .getRepository(ReceptionSackEntity)
      .createQueryBuilder('sack')
      .select('COALESCE(MAX(sack.sequence), 0)', 'maximum')
      .where('sack.receptionId = :receptionId', { receptionId })
      .getRawOne<{ maximum: string }>();
    return Number(maximum?.maximum ?? 0) + 1;
  }

  async addSack(sack: NewSack) {
    const sacks = this.manager.getRepository(ReceptionSackEntity);
    return sacks.save(
      sacks.create({
        businessId: sack.businessId,
        clientOperationId: sack.clientOperationId,
        correctionReason: null,
        correctedFromSackId: null,
        ...(await resolveCommercialSnapshot(this.manager, sack.businessId, {
          originId: sack.originId,
          qualityId: sack.qualityId,
        })),
        createdByUserId: sack.createdByUserId,
        grossWeightKg: sack.weight.gross,
        netWeightKg: sack.weight.net,
        receptionId: sack.receptionId,
        sequence: sack.sequence,
        tareKg: sack.weight.tare,
        varietyId: sack.varietyId,
        voidOperationId: null,
        voidedAt: null,
      }),
    );
  }

  async markWeighing(reception: WeighingReception) {
    const entity = this.locked.get(reception.id);
    if (!entity)
      throw new Error('The reception was not locked in this unit of work.');
    entity.state = ReceptionState.Weighing;
    entity.version += 1;
    await this.manager.getRepository(ReceptionEntity).save(entity);
  }
}

class PostgresWeighingAudit implements WeighingAudit {
  constructor(
    private readonly manager: EntityManager,
    private readonly auditService: AuditService,
  ) {}

  sackAdded(event: {
    businessId: string;
    actorUserId: string;
    sackId: string;
    sequence: number;
  }) {
    return this.auditService.record(this.manager, {
      action: 'reception.sack-added',
      actorUserId: event.actorUserId,
      businessId: event.businessId,
      details: { sequence: event.sequence },
      resourceId: event.sackId,
      resourceType: 'reception-sack',
    });
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
