import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';

import {
  formatFixedDecimal,
  parseFixedDecimal,
} from '../../common/domain/fixed-decimal.js';
import type { SessionIdentity } from '../../identity/application/ports/session-identity-reader.js';
import { ReceptionState } from '../entities/reception.entity.js';
import {
  requireReception,
  requireReceptionVersion,
  type StoredSack,
  type WeighingUnitOfWork,
} from './weighing-ports.js';

export type CloseWeighingOrder = {
  clientOperationId: string;
  expectedReceptionVersion: number;
};

// Closes the weighing with at least one active sack and audits the totals by
// variety; totals are per shipment, never warehouse stock.
export class CloseWeighing<S extends StoredSack, R> {
  constructor(private readonly unitOfWork: WeighingUnitOfWork<S, R>) {}

  execute(
    identity: SessionIdentity,
    receptionId: string,
    order: CloseWeighingOrder,
  ) {
    return this.unitOfWork.run(async ({ repository, audit }) => {
      const { businessId } = identity;
      await repository.lockOperation(businessId, order.clientOperationId);
      const reception = await repository.lockReception(
        businessId,
        receptionId,
        'reception-only',
      );
      requireReception(reception);
      if (reception.closeOperationId === order.clientOperationId)
        return repository.storedReception(reception);
      requireReceptionVersion(reception, order.expectedReceptionVersion);
      if (reception.state !== ReceptionState.Weighing)
        throw new ConflictException('La recepción no puede cerrar el pesaje.');
      const sacks = await repository.activeSacks(businessId, receptionId);
      if (sacks.length === 0)
        throw new UnprocessableEntityException(
          'Debe registrar al menos un saco.',
        );

      const varieties = new Set(sacks.map((sack) => sack.varietyId));
      const totalWeight = sacks.reduce(
        (sum, sack) => sum + parseFixedDecimal(sack.netWeightKg, 3, 11),
        0n,
      );
      const closed = await repository.closeReception(
        reception,
        order.clientOperationId,
      );
      await audit.record({
        action: 'reception.weighing-closed',
        actorUserId: identity.userId,
        businessId,
        details: {
          varietyCount: varieties.size,
          sackCount: sacks.length,
          totalWeightKg: formatFixedDecimal(totalWeight, 3),
        },
        resourceId: reception.id,
        resourceType: 'reception',
      });
      return closed;
    });
  }
}
