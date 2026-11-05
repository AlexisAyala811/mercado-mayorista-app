import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, IsNull } from 'typeorm';

import type { SessionIdentity } from '../identity/application/ports/session-identity-reader.js';
import { WeighingUseCases } from './application/weighing-use-cases.js';
import { ReceptionEntity } from './entities/reception.entity.js';
import { ReceptionSackEntity } from './entities/reception-sack.entity.js';
import type {
  AddSackDto,
  CloseWeighingDto,
  CorrectClosedSackDto,
  CorrectSackDto,
  VoidSackDto,
} from './http/weighing.dto.js';

// Entry point of the weighing operations for the controller: it reads sacks
// and delegates every write to its use case.
@Injectable()
export class WeighingService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly useCases: WeighingUseCases<
      ReceptionSackEntity,
      ReceptionEntity
    >,
  ) {}

  async list(businessId: string, receptionId: string) {
    await this.requireReception(businessId, receptionId);
    return this.dataSource.getRepository(ReceptionSackEntity).find({
      where: { businessId, receptionId, voidedAt: IsNull() },
      order: { sequence: 'ASC' },
    });
  }

  add(identity: SessionIdentity, receptionId: string, input: AddSackDto) {
    return this.useCases.register.execute(identity, receptionId, input);
  }

  correct(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: CorrectSackDto,
  ) {
    return this.useCases.correct.execute(identity, receptionId, sackId, input);
  }

  voidSack(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: VoidSackDto,
  ) {
    return this.useCases.void.execute(identity, receptionId, sackId, input);
  }

  correctClosed(
    identity: SessionIdentity,
    receptionId: string,
    sackId: string,
    input: CorrectClosedSackDto,
  ) {
    return this.useCases.correctClosed.execute(
      identity,
      receptionId,
      sackId,
      input,
    );
  }

  close(
    identity: SessionIdentity,
    receptionId: string,
    input: CloseWeighingDto,
  ) {
    return this.useCases.close.execute(identity, receptionId, input);
  }

  private async requireReception(businessId: string, id: string) {
    const exists = await this.dataSource
      .getRepository(ReceptionEntity)
      .exists({ where: { businessId, id } });
    if (!exists) throw new NotFoundException('Recepción no encontrada.');
  }
}
