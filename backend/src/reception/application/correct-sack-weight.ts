import { ConflictException } from '@nestjs/common';

import { requireSameOperation } from '../../common/domain/operation-replay.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { ReceptionState } from '../entities/reception.entity.js';
import {
  matchesSackOrder,
  requireExpectedVariety,
  requireReception,
  requireReceptionVersion,
  requireSack,
  weightOf,
  type SackOrder,
  type StoredSack,
  type WeighingUnitOfWork,
} from './weighing-ports.js';

// Corrects a sack while the weighing is open: the original is retired and a
// replacement keeps its sequence.
export class CorrectSackWeight<S extends StoredSack, R> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S, R>) {}

  execute(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    order: SackOrder,
  ) {
    return this.unitOfWork.run(async ({ repository, audit }) => {
      const { businessId } = identity;
      await repository.lockOperation(businessId, order.clientOperationId);
      const existing = await repository.findSackByOperation(
        businessId,
        order.clientOperationId,
      );
      if (existing) {
        requireSameOperation(
          matchesSackOrder(existing, receptionId, sackId, order) &&
            existing.correctionReason === null,
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
      if (reception.state !== ReceptionState.Weighing)
        throw new ConflictException(
          'Solo se corrigen sacos antes de cerrar el pesaje.',
        );
      requireExpectedVariety(reception, order.varietyId);
      const original = await repository.findActiveSack(
        businessId,
        receptionId,
        sackId,
      );
      requireSack(original);

      const corrected = await repository.replaceSack(original, {
        businessId,
        clientOperationId: order.clientOperationId,
        correctionReason: null,
        createdByUserId: identity.userId,
        originId: order.originId,
        qualityId: order.qualityId,
        receptionId,
        varietyId: order.varietyId,
        weight: weightOf(order.grossWeightKg, order.tareKg),
      });
      await repository.bumpVersion(reception);
      await audit.record({
        action: 'reception.sack-corrected',
        actorUserId: identity.userId,
        businessId,
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
}
