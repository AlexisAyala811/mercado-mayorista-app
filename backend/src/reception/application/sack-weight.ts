import { calculateSackWeights } from '../../common/domain/sack-weights.js';

// The weight of one sack as the business states it ("PesoSaco"). Values are
// normalised to three decimals, so 52.5 and 52.500 describe the same sack.
export class SackWeight {
  private constructor(
    readonly gross: string,
    readonly tare: string,
    readonly net: string,
  ) {}

  static of(grossInput: string, tareInput?: string) {
    const { gross, tare, net } = calculateSackWeights(grossInput, tareInput);
    return new SackWeight(gross, tare, net);
  }

  sameAs(stored: { grossWeightKg: string; tareKg: string }) {
    return stored.grossWeightKg === this.gross && stored.tareKg === this.tare;
  }
}
