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

// Corrects a sack of a closed weighing before the purchase is settled; the
// reason stays on both the retired sack and its replacement.
export class CorrectClosedSackWeight<S extends StoredSack, R> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S, R>) {}

  execute(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    order: SackOrder & { reason: string },
  ) {
    return this.unitOfWork.run(async ({ repository, audit }) => {
      const { businessId } = identity;
      await repository.lockOperation(businessId, order.clientOperationId);
      const repeated = await repository.findSackByOperation(
        businessId,
        order.clientOperationId,
      );
      if (repeated) {
        requireSameOperation(
          matchesSackOrder(repeated, receptionId, sackId, order) &&
            repeated.correctionReason === order.reason,
        );
        return repeated;
      }

      const reception = await repository.lockReception(
        businessId,
        receptionId,
        'with-varieties',
      );
      requireReception(reception);
      if (reception.state !== ReceptionState.Weighed)
        throw new ConflictException(
          'Solo se corrige un pesaje cerrado antes de liquidar la compra.',
        );
      requireReceptionVersion(
        reception,
        order.expectedReceptionVersion,
        'La recepción cambió.',
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
        correctionReason: order.reason,
        createdByUserId: identity.userId,
        originId: order.originId,
        qualityId: order.qualityId,
        receptionId,
        varietyId: order.varietyId,
        weight: weightOf(order.grossWeightKg, order.tareKg),
      });
      const receptionVersion = await repository.bumpVersion(reception);
      await audit.record({
        action: 'reception.closed-sack-corrected',
        actorUserId: identity.userId,
        businessId,
        details: {
          correctedFromSackId: original.id,
          reason: order.reason,
          receptionVersion,
        },
        resourceId: corrected.id,
        resourceType: 'reception-sack',
      });
      return corrected;
    });
  }
}
