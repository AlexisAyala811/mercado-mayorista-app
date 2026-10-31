import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { requireSameOperation } from '../../common/domain/operation-replay.js';
import { SackWeightError } from '../../common/domain/sack-weights.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { ReceptionState } from '../entities/reception.entity.js';
import { SackWeight } from './sack-weight.js';

// Use case "RegistrarPesoCasoUso": registers one weighed sack. It depends only
// on the small contracts below; the composition root supplies the adapters.

export type SackOrder = {
  clientOperationId: string;
  expectedReceptionVersion: number;
  varietyId: string;
  qualityId?: string | null;
  originId?: string | null;
  grossWeightKg: string;
  tareKg?: string;
};

export type StoredSack = {
  id: string;
  receptionId: string;
  correctedFromSackId: string | null;
  varietyId: string;
  grossWeightKg: string;
  tareKg: string;
  qualityId: string | null;
  originId: string | null;
  sequence: number;
};

export type WeighingReception = {
  id: string;
  state: ReceptionState;
  version: number;
  varietyIds: readonly string[];
};

export type NewSack = {
  businessId: string;
  clientOperationId: string;
  createdByUserId: string;
  receptionId: string;
  sequence: number;
  varietyId: string;
  qualityId?: string | null;
  originId?: string | null;
  weight: SackWeight;
};

export interface WeighingRepository<S extends StoredSack> {
  // Serialises retries of the same order within the unit of work.
  lockOperation(businessId: string, clientOperationId: string): Promise<void>;
  findSackByOperation(
    businessId: string,
    clientOperationId: string,
  ): Promise<S | null>;
  // Locks the reception for the rest of the unit of work.
  lockReception(
    businessId: string,
    receptionId: string,
  ): Promise<WeighingReception | null>;
  nextSequence(receptionId: string): Promise<number>;
  addSack(sack: NewSack): Promise<S>;
  markWeighing(reception: WeighingReception): Promise<void>;
}

export interface WeighingAudit {
  sackAdded(event: {
    businessId: string;
    actorUserId: string;
    sackId: string;
    sequence: number;
  }): Promise<void>;
}

// Everything done inside `run` is confirmed together or not at all.
export interface WeighingUnitOfWork<S extends StoredSack> {
  run<T>(
    work: (ports: {
      repository: WeighingRepository<S>;
      audit: WeighingAudit;
    }) => Promise<T>,
  ): Promise<T>;
}

export function weightOf(grossWeightKg: string, tareKg?: string) {
  try {
    return SackWeight.of(grossWeightKg, tareKg);
  } catch (error) {
    if (error instanceof SackWeightError)
      throw new UnprocessableEntityException(error.message);
    throw error;
  }
}

// A retried order must describe the stored sack; an omitted characteristic on
// a correction keeps the original sack's value.
export function matchesSackOrder(
  sack: StoredSack,
  receptionId: string,
  correctedFromSackId: string | null,
  order: SackOrder,
) {
  const sameCharacteristic = (
    stored: string | null,
    requested?: string | null,
  ) =>
    (requested === undefined && correctedFromSackId !== null) ||
    stored === (requested ?? null);
  return (
    sack.receptionId === receptionId &&
    sack.correctedFromSackId === correctedFromSackId &&
    sack.varietyId === order.varietyId &&
    weightOf(order.grossWeightKg, order.tareKg).sameAs(sack) &&
    sameCharacteristic(sack.qualityId, order.qualityId) &&
    sameCharacteristic(sack.originId, order.originId)
  );
}

export function requireReceptionVersion(
  reception: { version: number },
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

export class RegisterSackWeight<S extends StoredSack> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S>) {}

  execute(identity: SessionIdentity, receptionId: string, order: SackOrder) {
    return this.unitOfWork.run(async ({ repository, audit }) => {
      const { businessId } = identity;
      await repository.lockOperation(businessId, order.clientOperationId);
      const existing = await repository.findSackByOperation(
        businessId,
        order.clientOperationId,
      );
      if (existing) {
        requireSameOperation(
          matchesSackOrder(existing, receptionId, null, order),
        );
        return existing;
      }

      const reception = await repository.lockReception(businessId, receptionId);
      if (!reception) throw new NotFoundException('Recepción no encontrada.');
      requireReceptionVersion(reception, order.expectedReceptionVersion);
      if (
        ![ReceptionState.Draft, ReceptionState.Weighing].includes(
          reception.state,
        )
      )
        throw new ConflictException('El pesaje ya no admite nuevos sacos.');
      if (!reception.varietyIds.includes(order.varietyId))
        throw new UnprocessableEntityException(
          'La variedad no pertenece a la recepción.',
        );

      const weight = weightOf(order.grossWeightKg, order.tareKg);
      const sack = await repository.addSack({
        businessId,
        clientOperationId: order.clientOperationId,
        createdByUserId: identity.userId,
        originId: order.originId,
        qualityId: order.qualityId,
        receptionId,
        sequence: await repository.nextSequence(receptionId),
        varietyId: order.varietyId,
        weight,
      });
      await repository.markWeighing(reception);
      await audit.sackAdded({
        actorUserId: identity.userId,
        businessId,
        sackId: sack.id,
        sequence: sack.sequence,
      });
      return sack;
    });
  }
}
