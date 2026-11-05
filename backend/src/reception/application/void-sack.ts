import { ConflictException } from '@nestjs/common';

import { requireSameOperation } from '../../common/domain/operation-replay.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { ReceptionState } from '../entities/reception.entity.js';
import {
  requireReception,
  requireReceptionVersion,
  requireSack,
  type StoredSack,
  type WeighingUnitOfWork,
} from './weighing-ports.js';

export type VoidSackOrder = {
  clientOperationId: string;
  expectedReceptionVersion: number;
  reason: string;
};

// Withdraws a sack before the weighing is closed; the sack is kept with its
// reason instead of being deleted.
export class VoidSack<S extends StoredSack, R> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S, R>) {}

  execute(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    order: VoidSackOrder,
  ) {
    return this.unitOfWork.run(async ({ repository, audit }) => {
      const { businessId } = identity;
      await repository.lockOperation(businessId, order.clientOperationId);
      const repeated = await repository.findSackByVoidOperation(
        businessId,
        order.clientOperationId,
      );
      if (repeated) {
        requireSameOperation(
          repeated.id === sackId && repeated.receptionId === receptionId,
        );
        return repeated;
      }

      const reception = await repository.lockReception(
        businessId,
        receptionId,
        'reception-only',
      );
      requireReception(reception);
      requireReceptionVersion(reception, order.expectedReceptionVersion);
      if (reception.state !== ReceptionState.Weighing)
        throw new ConflictException('Solo se retiran sacos antes del cierre.');
      const sack = await repository.findActiveSack(
        businessId,
        receptionId,
        sackId,
      );
      requireSack(sack);

      const voided = await repository.voidSack(
        sack,
        order.reason,
        order.clientOperationId,
      );
      await repository.bumpVersion(reception);
      await audit.record({
        action: 'reception.sack-voided',
        actorUserId: identity.userId,
        businessId,
        details: { reason: order.reason, sequence: voided.sequence },
        resourceId: voided.id,
        resourceType: 'reception-sack',
      });
      return voided;
    });
  }
}
