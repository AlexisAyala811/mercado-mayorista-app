import { CloseWeighing } from './close-weighing.js';
import { CorrectClosedSackWeight } from './correct-closed-sack-weight.js';
import { CorrectSackWeight } from './correct-sack-weight.js';
import { RegisterSackWeight } from './register-sack-weight.js';
import { VoidSack } from './void-sack.js';
import type { StoredSack, WeighingUnitOfWork } from './weighing-ports.js';

// The weighing use cases built on one unit of work, so every operation shares
// the same transaction, locking and audit adapters.
export class WeighingUseCases<S extends StoredSack, R> {
  readonly register: RegisterSackWeight<S, R>;
  readonly correct: CorrectSackWeight<S, R>;
  readonly correctClosed: CorrectClosedSackWeight<S, R>;
  readonly void: VoidSack<S, R>;
  readonly close: CloseWeighing<S, R>;

  constructor(unitOfWork: WeighingUnitOfWork<S, R>) {
    this.register = new RegisterSackWeight(unitOfWork);
    this.correct = new CorrectSackWeight(unitOfWork);
    this.correctClosed = new CorrectClosedSackWeight(unitOfWork);
    this.void = new VoidSack(unitOfWork);
    this.close = new CloseWeighing(unitOfWork);
  }
}
