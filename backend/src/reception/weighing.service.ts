import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DataSource, IsNull, type EntityManager } from 'typeorm';

import { AuditService } from '../audit/audit.service.js';
import {resolveCommercialSnapshot} from '../catalog/commercial-snapshot.js';
import {
  formatFixedDecimal,
  parseFixedDecimal,
} from '../common/domain/fixed-decimal.js';
import { requireSameOperation } from '../common/domain/operation-replay.js';
import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import {
  ReceptionEntity,
  ReceptionState,
} from './entities/reception.entity.js';
import { ReceptionSackEntity } from './entities/reception-sack.entity.js';
import type {
  AddSackDto,
  CloseWeighingDto,
  CorrectClosedSackDto,
  CorrectSackDto,
  VoidSackDto,
} from './http/weighing.dto.js';

@Injectable()
export class WeighingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  async list(businessId: string, receptionId: string) {
    await this.requireReception(businessId, receptionId);
    return this.dataSource.getRepository(ReceptionSackEntity).find({
      where: { businessId, receptionId, voidedAt: IsNull() },
      order: { sequence: 'ASC' },
    });
  }

  async add(identity: SessionIdentity, receptionId: string, input: AddSackDto) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const sacks = manager.getRepository(ReceptionSackEntity);
      const existing = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(matchesSack(existing, receptionId, null, input));
        return existing;
      }

      const reception = await lockReceptionWithVarieties(
        manager,
        identity.businessId,
        receptionId,
      );
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      requireReceptionVersion(reception, input.expectedReceptionVersion);
      if (
        ![ReceptionState.Draft, ReceptionState.Weighing].includes(
          reception.state,
        )
      ) {
        throw new ConflictException('El pesaje ya no admite nuevos sacos.');
      }
      if (
        !reception.expectedVarieties.some(
          (variety) => variety.id === input.varietyId,
        )
      ) {
        throw new UnprocessableEntityException(
          'La variedad no pertenece a la recepción.',
        );
      }

      const weights = calculateWeights(
        input.grossWeightKg,
        input.tareKg ?? '0',
      );
      const maximum = await sacks
        .createQueryBuilder('sack')
        .select('COALESCE(MAX(sack.sequence), 0)', 'maximum')
        .where('sack.receptionId = :receptionId', { receptionId })
        .getRawOne<{ maximum: string }>();
      const sack = await sacks.save(
        sacks.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          correctionReason: null,
          correctedFromSackId: null,
          ...await resolveCommercialSnapshot(manager,identity.businessId,input),
          createdByUserId: identity.userId,
          grossWeightKg: weights.gross,
          netWeightKg: weights.net,
          receptionId,
          sequence: Number(maximum?.maximum ?? 0) + 1,
          tareKg: weights.tare,
          varietyId: input.varietyId,
          voidOperationId: null,
          voidedAt: null,
        }),
      );
      reception.state = ReceptionState.Weighing;
      reception.version += 1;
      await manager.getRepository(ReceptionEntity).save(reception);
      await this.audit.record(manager, {
        action: 'reception.sack-added',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { sequence: sack.sequence },
        resourceId: sack.id,
        resourceType: 'reception-sack',
      });
      return sack;
    });
  }

  async correct(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: CorrectSackDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const sacks = manager.getRepository(ReceptionSackEntity);
      const existing = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (existing) {
        requireSameOperation(
          matchesSack(existing, receptionId, sackId, input) &&
            existing.correctionReason === null,
        );
        return existing;
      }
      const reception = await lockReceptionWithVarieties(
        manager,
        identity.businessId,
        receptionId,
      );
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      requireReceptionVersion(reception, input.expectedReceptionVersion);
      if (reception.state !== ReceptionState.Weighing) {
        throw new ConflictException(
          'Solo se corrigen sacos antes de cerrar el pesaje.',
        );
      }
      if (
        !reception.expectedVarieties.some(
          (variety) => variety.id === input.varietyId,
        )
      ) {
        throw new UnprocessableEntityException(
          'La variedad no pertenece a la recepción.',
        );
      }
      const original = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          id: sackId,
          receptionId,
          voidedAt: IsNull(),
        },
      });
      if (!original) throw new NotFoundException('Saco no encontrado.');
      const weights = calculateWeights(
        input.grossWeightKg,
        input.tareKg ?? '0',
      );
      original.voidedAt = new Date();
      await sacks.save(original);
      const corrected = await sacks.save(
        sacks.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          correctionReason: null,
          correctedFromSackId: original.id,
          ...await resolveCommercialSnapshot(manager,identity.businessId,input,original),
          createdByUserId: identity.userId,
          grossWeightKg: weights.gross,
          netWeightKg: weights.net,
          receptionId,
          sequence: original.sequence,
          tareKg: weights.tare,
          varietyId: input.varietyId,
          voidOperationId: null,
          voidedAt: null,
        }),
      );
      reception.version += 1;
      await manager.getRepository(ReceptionEntity).save(reception);
      await this.audit.record(manager, {
        action: 'reception.sack-corrected',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          correctedFromSackId: original.id,
          sequence: corrected.sequence,
        },
        resourceId: corrected.id,
        resourceType: 'reception-sack',
      });
      return corrected;
    });
  }

  async voidSack(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: VoidSackDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const sacks = manager.getRepository(ReceptionSackEntity);
      const repeated = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          voidOperationId: input.clientOperationId,
        },
      });
      if (repeated) {
        requireSameOperation(
          repeated.id === sackId && repeated.receptionId === receptionId,
        );
        return repeated;
      }
      const receptionRepository = manager.getRepository(ReceptionEntity);
      const reception = await receptionRepository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: receptionId },
      });
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      requireReceptionVersion(reception, input.expectedReceptionVersion);
      if (reception.state !== ReceptionState.Weighing)
        throw new ConflictException('Solo se retiran sacos antes del cierre.');
      const sack = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          id: sackId,
          receptionId,
          voidedAt: IsNull(),
        },
      });
      if (!sack) throw new NotFoundException('Saco no encontrado.');
      sack.correctionReason = input.reason;
      sack.voidOperationId = input.clientOperationId;
      sack.voidedAt = new Date();
      await sacks.save(sack);
      reception.version += 1;
      await receptionRepository.save(reception);
      await this.audit.record(manager, {
        action: 'reception.sack-voided',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: { reason: input.reason, sequence: sack.sequence },
        resourceId: sack.id,
        resourceType: 'reception-sack',
      });
      return sack;
    });
  }

  async correctClosed(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: CorrectClosedSackDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const sacks = manager.getRepository(ReceptionSackEntity);
      const repeated = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
        },
      });
      if (repeated) {
        requireSameOperation(
          matchesSack(repeated, receptionId, sackId, input) &&
            repeated.correctionReason === input.reason,
        );
        return repeated;
      }
      const receptionRepository = manager.getRepository(ReceptionEntity);
      const reception = await lockReceptionWithVarieties(
        manager,
        identity.businessId,
        receptionId,
      );
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      if (reception.state !== ReceptionState.Weighed) {
        throw new ConflictException(
          'Solo se corrige un pesaje cerrado antes de liquidar la compra.',
        );
      }
      if (reception.version !== input.expectedReceptionVersion) {
        throw new ConflictException({
          code: 'reception-version-conflict',
          currentVersion: reception.version,
          message: 'La recepción cambió.',
        });
      }
      if (
        !reception.expectedVarieties.some(
          (variety) => variety.id === input.varietyId,
        )
      ) {
        throw new UnprocessableEntityException(
          'La variedad no pertenece a la recepción.',
        );
      }
      const original = await sacks.findOne({
        where: {
          businessId: identity.businessId,
          id: sackId,
          receptionId,
          voidedAt: IsNull(),
        },
      });
      if (!original) throw new NotFoundException('Saco no encontrado.');
      const weights = calculateWeights(
        input.grossWeightKg,
        input.tareKg ?? '0',
      );
      original.correctionReason = input.reason;
      original.voidedAt = new Date();
      await sacks.save(original);
      const corrected = await sacks.save(
        sacks.create({
          businessId: identity.businessId,
          clientOperationId: input.clientOperationId,
          correctionReason: input.reason,
          correctedFromSackId: original.id,
          ...await resolveCommercialSnapshot(manager,identity.businessId,input,original),
          createdByUserId: identity.userId,
          grossWeightKg: weights.gross,
          netWeightKg: weights.net,
          receptionId,
          sequence: original.sequence,
          tareKg: weights.tare,
          varietyId: input.varietyId,
          voidOperationId: null,
          voidedAt: null,
        }),
      );
      reception.version += 1;
      await receptionRepository.save(reception);
      await this.audit.record(manager, {
        action: 'reception.closed-sack-corrected',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          correctedFromSackId: original.id,
          reason: input.reason,
          receptionVersion: reception.version,
        },
        resourceId: corrected.id,
        resourceType: 'reception-sack',
      });
      return corrected;
    });
  }

  async close(
    identity: SessionIdentity,
    receptionId: string,
    input: CloseWeighingDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))',
        [identity.businessId, input.clientOperationId],
      );
      const repository = manager.getRepository(ReceptionEntity);
      const reception = await repository.findOne({
        lock: { mode: 'pessimistic_write' },
        where: { businessId: identity.businessId, id: receptionId },
      });
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      if (reception.closeOperationId === input.clientOperationId)
        return reception;
      requireReceptionVersion(reception, input.expectedReceptionVersion);
      if (reception.state !== ReceptionState.Weighing)
        throw new ConflictException('La recepción no puede cerrar el pesaje.');
      const activeSacks = await manager
        .getRepository(ReceptionSackEntity)
        .find({
          where: {
            businessId: identity.businessId,
            receptionId,
            voidedAt: IsNull(),
          },
        });
      if (activeSacks.length === 0)
        throw new UnprocessableEntityException(
          'Debe registrar al menos un saco.',
        );
      const totals = new Map<string, { sacks: number; weight: bigint }>();
      for (const sack of activeSacks) {
        const current = totals.get(sack.varietyId) ?? { sacks: 0, weight: 0n };
        current.sacks += 1;
        current.weight += parseFixedDecimal(sack.netWeightKg, 3, 11);
        totals.set(sack.varietyId, current);
      }
      reception.closeOperationId = input.clientOperationId;
      reception.closedAt = new Date();
      reception.state = ReceptionState.Weighed;
      reception.version += 1;
      const saved = await repository.save(reception);
      await this.audit.record(manager, {
        action: 'reception.weighing-closed',
        actorUserId: identity.userId,
        businessId: identity.businessId,
        details: {
          varietyCount: totals.size,
          sackCount: activeSacks.length,
          totalWeightKg: formatFixedDecimal(
            [...totals.values()].reduce((sum, total) => sum + total.weight, 0n),
            3,
          ),
        },
        resourceId: reception.id,
        resourceType: 'reception',
      });
      return saved;
    });
  }

  private async requireReception(businessId: string, id: string) {
    const exists = await this.dataSource
      .getRepository(ReceptionEntity)
      .exists({ where: { businessId, id } });
    if (!exists) throw new NotFoundException('Recepción no encontrada.');
  }
}

function requireReceptionVersion(
  reception: ReceptionEntity,
  expectedVersion: number,
) {
  if (reception.version !== expectedVersion) {
    throw new ConflictException({
      code: 'reception-version-conflict',
      currentVersion: reception.version,
      message: 'La recepción cambió; revise sus datos.',
    });
  }
}

function lockReceptionWithVarieties(
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

function matchesSack(
  sack: ReceptionSackEntity,
  receptionId: string,
  correctedFromSackId: string | null,
  input: AddSackDto,
) {
  const weights = calculateWeights(input.grossWeightKg, input.tareKg ?? '0');
  // An omitted characteristic on a correction keeps the original sack's value.
  const sameCharacteristic = (stored: string | null, requested?: string | null) =>
    (requested === undefined && correctedFromSackId !== null) ||
    stored === (requested ?? null);
  return (
    sack.receptionId === receptionId &&
    sack.correctedFromSackId === correctedFromSackId &&
    sack.varietyId === input.varietyId &&
    sack.grossWeightKg === weights.gross &&
    sack.tareKg === weights.tare &&
    sameCharacteristic(sack.qualityId, input.qualityId) &&
    sameCharacteristic(sack.originId, input.originId)
  );
}

function calculateWeights(grossInput: string, tareInput: string) {
  let gross: bigint;
  let tare: bigint;
  try {
    gross = parseFixedDecimal(grossInput, 3, 9);
    tare = parseFixedDecimal(tareInput, 3, 9);
  } catch {
    throw new UnprocessableEntityException(
      'El peso debe tener hasta tres decimales.',
    );
  }
  if (gross <= 0n || tare < 0n || tare >= gross) {
    throw new UnprocessableEntityException(
      'El peso neto debe ser mayor que cero.',
    );
  }
  return {
    gross: formatFixedDecimal(gross, 3),
    net: formatFixedDecimal(gross - tare, 3),
    tare: formatFixedDecimal(tare, 3),
  };
}
