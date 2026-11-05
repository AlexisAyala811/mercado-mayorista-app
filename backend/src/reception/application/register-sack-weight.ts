import { ConflictException } from '@nestjs/common';

import { requireSameOperation } from '../../common/domain/operation-replay.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { ReceptionState } from '../entities/reception.entity.js';
import {
  matchesSackOrder,
  requireExpectedVariety,
  requireReception,
  requireReceptionVersion,
  weightOf,
  type SackOrder,
  type StoredSack,
  type WeighingUnitOfWork,
} from './weighing-ports.js';

// Use case "RegistrarPesoCasoUso": registers one weighed sack.
export class RegisterSackWeight<S extends StoredSack, R> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S, R>) {}

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

      const reception = await repository.lockReception(
        businessId,
        receptionId,
        'with-varieties',
      );
      requireReception(reception);
      requireReceptionVersion(reception, order.expectedReceptionVersion);
      if (
        ![ReceptionState.Draft, ReceptionState.Weighing].includes(
          reception.state,
        )
      )
        throw new ConflictException('El pesaje ya no admite nuevos sacos.');
      requireExpectedVariety(reception, order.varietyId);

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
      await audit.record({
        action: 'reception.sack-added',
        actorUserId: identity.userId,
        businessId,
        details: { sequence: sack.sequence },
        resourceId: sack.id,
        resourceType: 'reception-sack',
      });
      return sack;
    });
  }
}
