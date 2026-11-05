import type { Reception, ReceptionSack } from './reception';
import type { SyncOperation } from '@/domain/sync/sync-operation';
import {isCommercialSnapshot} from '@/domain/catalog/commercial-characteristic';

export type LocalReceptionRecovery =
  | { kind: 'central'; receptionId: string }
  | { kind: 'blocked'; message: string }
  | { kind: 'open'; reception: Reception; sacks: ReceptionSack[]; context: NonNullable<SyncOperation['receptionContext']> };

const blocked = (): LocalReceptionRecovery => ({ kind: 'blocked', message: 'La recepción guardada requiere revisar sus operaciones antes de continuar. Conserva los datos y comprueba la sincronización.' });
const record = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
const weight = (value: unknown): value is string => typeof value === 'string' && /^\d+(?:\.\d{1,3})?$/.test(value);

export function recoverLocalReception(operations: readonly SyncOperation[], creationId: string, preferCentral = true): LocalReceptionRecovery {
  const create = operations.find((operation) => operation.id === creationId && operation.type === 'reception.create');
  if (!create) return blocked();
  const references = new Set([`@${creationId}`, ...(create.centralReference ? [create.centralReference] : [])]);
  const related = operations.filter((operation) => {
    if (operation.id === creationId) return true;
    const match = /^\/(?:purchases\/)?receptions\/([^/]+)(?:\/|$)/.exec(operation.path);
    return Boolean(match && references.has(match[1]));
  });
  if (preferCentral && related.every((operation) => operation.status === 'confirmed') && create.centralReference) {
    return { kind: 'central', receptionId: create.centralReference };
  }
  if (related.some((operation) => !['pending', 'confirmed'].includes(operation.status))) return blocked();
  if (related.some((operation) => !['reception.create', 'reception.sack-add', 'reception.sack-correct', 'reception.close'].includes(operation.type))) return blocked();
  const body = record(create.body);
  const context = create.receptionContext;
  if (!body || !context || typeof body.providerId !== 'string' || typeof body.driverName !== 'string' || typeof body.receivedOn !== 'string' || !Array.isArray(body.expectedVarietyIds) || !body.expectedVarietyIds.length) return blocked();
  const expectedIds = body.expectedVarietyIds.filter((id): id is string => typeof id === 'string');
  if (expectedIds.length !== body.expectedVarietyIds.length || new Set(expectedIds).size !== expectedIds.length || related[0]?.id !== creationId) return blocked();
  const varieties = context.varieties.filter((variety) => expectedIds.includes(variety.id));
  if (varieties.length !== expectedIds.length) return blocked();
  const reception: Reception = { id: `local:${creationId}`, providerId: body.providerId, providerPhone: typeof body.providerPhone === 'string' ? body.providerPhone : null, vehicleId: typeof body.vehicleId === 'string' ? body.vehicleId : null, driverName: body.driverName, receivedOn: body.receivedOn, expectedVarieties: varieties, state: 'draft', version: 0 };
  const sacks: ReceptionSack[] = [];
  const aliases = new Map<string, ReceptionSack>();
  for (const operation of related) {
    if (operation.id === creationId) continue;
    const input = record(operation.body);
    if (!input || input.expectedReceptionVersion !== reception.version) return blocked();
    if (operation.type === 'reception.close') {
      if (reception.state === 'weighed' || sacks.length === 0) return blocked();
      reception.state = 'weighed'; reception.version += 1; continue;
    }
    if (reception.state === 'weighed' || typeof input.varietyId !== 'string' || !varieties.some((variety) => variety.id === input.varietyId) || !weight(input.grossWeightKg) || !weight(input.tareKg ?? '0')) return blocked();
    const gross = Number(input.grossWeightKg); const tare = Number(input.tareKg ?? '0');
    if (!Number.isFinite(gross) || !Number.isFinite(tare) || gross <= tare) return blocked();
    const target = operation.type === 'reception.sack-correct' ? operation.path.split('/').at(-1) : undefined;
    const previous = target ? aliases.get(target) : undefined;
    if (target && !previous) return blocked();
    const characteristics=operation.sackCharacteristics;
    if(characteristics&&(!isCommercialSnapshot(characteristics)||characteristics.qualityId!==(input.qualityId??null)||characteristics.originId!==(input.originId??null)))return blocked();
    if(!characteristics&&(input.qualityId||input.originId))return blocked();
    const row: ReceptionSack = previous ?? { id: '', sequence: sacks.length + 1, varietyId: '', grossWeightKg: '', tareKg: '', netWeightKg: '' };
    Object.assign(row, { id: operation.status === 'confirmed' && operation.centralReference ? operation.centralReference : `local:${operation.id}`, varietyId: input.varietyId, grossWeightKg: gross.toFixed(3), tareKg: tare.toFixed(3), netWeightKg: (gross - tare).toFixed(3) });
    if (!previous) sacks.push(row);
    Object.assign(row,characteristics??{
      qualityId:input.qualityId===undefined?previous?.qualityId??null:null,qualityName:input.qualityId===undefined?previous?.qualityName??null:null,
      originId:input.originId===undefined?previous?.originId??null:null,originName:input.originId===undefined?previous?.originName??null:null,
    });
    aliases.set(`@${operation.id}`, row);
    if (operation.centralReference) aliases.set(operation.centralReference, row);
    reception.state = 'weighing'; reception.version += 1;
  }
  return { kind: 'open', reception, sacks, context };
}
