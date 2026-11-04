import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { SackWeightError } from '../../common/domain/sack-weights.js';
import type { ReceptionState } from '../entities/reception.entity.js';
import { SackWeight } from './sack-weight.js';

// Contracts of the weighing use cases ("RepositorioPesajes",
// "UnidadTrabajoPesaje", "AuditoriaPesaje"). S is the stored sack and R the
// stored reception returned to the caller; the use cases never see TypeORM.

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
  correctionReason: string | null;
  varietyId: string;
  grossWeightKg: string;
  tareKg: string;
  netWeightKg: string;
  qualityId: string | null;
  originId: string | null;
  sequence: number;
};

export type WeighingReception = {
  id: string;
  state: ReceptionState;
  version: number;
  closeOperationId: string | null;
  varietyIds: readonly string[];
};

export type NewSack = {
  businessId: string;
  clientOperationId: string;
  createdByUserId: string;
  receptionId: string;
  varietyId: string;
  qualityId?: string | null;
  originId?: string | null;
  weight: SackWeight;
};

// "with-varieties" also loads the varieties expected by the reception.
export type ReceptionLock = 'with-varieties' | 'reception-only';

export interface WeighingRepository<S extends StoredSack, R> {
  // Serialises retries of the same order within the unit of work.
  lockOperation(businessId: string, clientOperationId: string): Promise<void>;
  findSackByOperation(
    businessId: string,
    clientOperationId: string,
  ): Promise<S | null>;
  findSackByVoidOperation(
    businessId: string,
    voidOperationId: string,
  ): Promise<S | null>;
  // Locks the reception for the rest of the unit of work.
  lockReception(
    businessId: string,
    receptionId: string,
    lock: ReceptionLock,
  ): Promise<WeighingReception | null>;
  findActiveSack(
    businessId: string,
    receptionId: string,
    sackId: string,
  ): Promise<S | null>;
  activeSacks(businessId: string, receptionId: string): Promise<S[]>;
  nextSequence(receptionId: string): Promise<number>;
  addSack(sack: NewSack & { sequence: number }): Promise<S>;
  // Retires the original and stores its replacement with the same sequence;
  // omitted characteristics keep the original's values.
  replaceSack(
    original: S,
    replacement: NewSack & { correctionReason: string | null },
  ): Promise<S>;
  voidSack(sack: S, reason: string, voidOperationId: string): Promise<S>;
  markWeighing(reception: WeighingReception): Promise<void>;
  // Returns the new reception version.
  bumpVersion(reception: WeighingReception): Promise<number>;
  closeReception(
    reception: WeighingReception,
    closeOperationId: string,
  ): Promise<R>;
  storedReception(reception: WeighingReception): R;
}

export type WeighingAuditEvent = {
  action:
    | 'reception.sack-added'
    | 'reception.sack-corrected'
    | 'reception.sack-voided'
    | 'reception.closed-sack-corrected'
    | 'reception.weighing-closed';
  actorUserId: string;
  businessId: string;
  details: Record<string, unknown>;
  resourceId: string;
  resourceType: 'reception-sack' | 'reception';
};

export interface WeighingAudit {
  record(event: WeighingAuditEvent): Promise<void>;
}

// Everything done inside `run` is confirmed together or not at all.
export interface WeighingUnitOfWork<S extends StoredSack, R> {
  run<T>(
    work: (ports: {
      repository: WeighingRepository<S, R>;
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

export function requireReception(
  reception: WeighingReception | null,
): asserts reception is WeighingReception {
  if (!reception) throw new NotFoundException('Recepción no encontrada.');
}

export function requireReceptionVersion(
  reception: { version: number },
  expectedVersion: number,
  message = 'La recepción cambió; revise sus datos.',
) {
  if (reception.version !== expectedVersion) {
    throw new ConflictException({
      code: 'reception-version-conflict',
      currentVersion: reception.version,
      message,
    });
  }
}

export function requireExpectedVariety(
  reception: WeighingReception,
  varietyId: string,
) {
  if (!reception.varietyIds.includes(varietyId))
    throw new UnprocessableEntityException(
      'La variedad no pertenece a la recepción.',
    );
}

export function requireSack<S>(sack: S | null): asserts sack is S {
  if (!sack) throw new NotFoundException('Saco no encontrado.');
}
