import { recoverLocalReception } from '@/domain/reception/local-reception-recovery';
import type { SyncOperation } from '@/domain/sync/sync-operation';

export const localCreate: SyncOperation = {
  id: 'creation', businessId: 'business', userId: 'user', type: 'reception.create', path: '/receptions', method: 'POST', status: 'pending', attempts: 0, createdAt: '2026-10-06T00:00:00Z', updatedAt: '2026-10-06T00:00:00Z',
  body: { clientOperationId: 'creation', providerId: 'provider', driverName: 'Conductor QA', receivedOn: '2026-10-06', expectedVarietyIds: ['variety'] },
  receptionContext: { providerName: 'Proveedor QA', vehiclePlate: '', varieties: [{ id: 'variety', name: 'Canchán QA' }] },
};
const add: SyncOperation = { ...localCreate, receptionContext: undefined, id: 'sack', type: 'reception.sack-add', path: '/receptions/@creation/sacks', body: { expectedReceptionVersion: 0, varietyId: 'variety', grossWeightKg: '12.125', tareKg: '0.125' } };
const correct: SyncOperation = { ...add, id: 'correction', method: 'PATCH', type: 'reception.sack-correct', path: '/receptions/@creation/sacks/@sack', body: { expectedReceptionVersion: 1, varietyId: 'variety', grossWeightKg: '13.500', tareKg: '0.500' } };

it('recovers the encrypted captured labels and keeps them through an older correction without characteristic fields',()=>{
  const snapshot={qualityId:'11111111-1111-4111-8111-111111111111',qualityName:'Calidad capturada',originId:null,originName:null};
  const captured={...add,body:{...add.body as object,qualityId:snapshot.qualityId,originId:null},sackCharacteristics:snapshot};
  const result=recoverLocalReception([localCreate,captured,correct],'creation',false);
  expect(result).toMatchObject({kind:'open',sacks:[{...snapshot,netWeightKg:'13.000'}]});
});
it('does not invent a label when stored references and capture metadata disagree or are missing',()=>{
  const captured={...add,body:{...add.body as object,qualityId:'11111111-1111-4111-8111-111111111111'}};
  expect(recoverLocalReception([localCreate,captured],'creation',false).kind).toBe('blocked');
  expect(recoverLocalReception([localCreate,{...captured,sackCharacteristics:{qualityId:null,qualityName:null,originId:null,originName:null}}],'creation',false).kind).toBe('blocked');
});

it('recovers captured data and names from durable operations without central confirmation', () => {
  const recovered = recoverLocalReception([localCreate, add], 'creation');
  expect(recovered).toMatchObject({ kind: 'open', reception: { id: 'local:creation', state: 'weighing', version: 1 }, context: localCreate.receptionContext, sacks: [{ id: 'local:sack', sequence: 1, netWeightKg: '12.000' }] });
});

it('keeps chained corrections attached to one sack and restores closure at the correct version', () => {
  const nextCorrection = { ...correct, id: 'correction-two', path: '/receptions/@creation/sacks/@correction', body: { ...correct.body as object, expectedReceptionVersion: 2, grossWeightKg: '14.500', tareKg: '0.500' } };
  const close = { ...add, id: 'close', type: 'reception.close', path: '/receptions/@creation/close-weighing', body: { expectedReceptionVersion: 3 } };
  expect(recoverLocalReception([localCreate, add, correct, nextCorrection, close], 'creation')).toMatchObject({ kind: 'open', reception: { state: 'weighed', version: 4 }, sacks: [{ id: 'local:correction-two', sequence: 1, netWeightKg: '14.000' }] });
});

it('resolves partially confirmed central references while keeping later edits provisional', () => {
  const createConfirmed = { ...localCreate, status: 'confirmed' as const, centralReference: 'central-reception' };
  const sackConfirmed = { ...add, status: 'confirmed' as const, path: '/receptions/central-reception/sacks', centralReference: 'central-sack' };
  const correction = { ...correct, path: '/receptions/central-reception/sacks/central-sack' };
  expect(recoverLocalReception([createConfirmed, sackConfirmed, correction], 'creation')).toMatchObject({ kind: 'open', reception: { id: 'local:creation', version: 2 }, sacks: [{ id: 'local:correction', netWeightKg: '13.000' }] });
});

it('routes a fully confirmed older queue to the central identity without requiring new metadata', () => {
  expect(recoverLocalReception([{ ...localCreate, status: 'confirmed', centralReference: 'central-reception', receptionContext: undefined }], 'creation')).toEqual({ kind: 'central', receptionId: 'central-reception' });
});

it('can recover the last locally known confirmed capture provisionally when offline', () => {
  expect(recoverLocalReception([{ ...localCreate, status: 'confirmed', centralReference: 'central-reception' }, { ...add, status: 'confirmed', centralReference: 'central-sack' }], 'creation', false)).toMatchObject({ kind: 'open', reception: { id: 'local:creation', state: 'weighing', version: 1 }, sacks: [{ id: 'central-sack', netWeightKg: '12.000' }] });
});

it.each(['rejected', 'review', 'syncing', 'discarded'] as const)('refuses editable recovery with a %s operation', status => {
  expect(recoverLocalReception([localCreate, { ...add, status }], 'creation').kind).toBe('blocked');
});

it('does not offer another settlement when one is already stored for sending', () => {
  expect(recoverLocalReception([localCreate, add, { ...add, id: 'settlement', type: 'purchase.settle', path: '/purchases/receptions/@creation/settlement', body: { expectedReceptionVersion: 1 } }], 'creation').kind).toBe('blocked');
});

it('fails closed for missing context, out-of-order versions and corrections without an original sack', () => {
  expect(recoverLocalReception([{ ...localCreate, receptionContext: undefined }, add], 'creation').kind).toBe('blocked');
  expect(recoverLocalReception([localCreate, { ...add, body: { ...add.body as object, expectedReceptionVersion: 5 } }], 'creation').kind).toBe('blocked');
  expect(recoverLocalReception([localCreate, { ...correct, body: { ...correct.body as object, expectedReceptionVersion: 0 } }], 'creation').kind).toBe('blocked');
});

it('isolates another reception and rejects edits after closure', () => {
  const close = { ...add, id: 'close', type: 'reception.close', path: '/receptions/@creation/close-weighing', body: { expectedReceptionVersion: 1 } };
  expect(recoverLocalReception([localCreate, add, { ...correct, path: '/receptions/other/sacks/@sack' }], 'creation')).toMatchObject({ kind: 'open', reception: { version: 1 } });
  expect(recoverLocalReception([localCreate, add, close, { ...correct, body: { ...correct.body as object, expectedReceptionVersion: 2 } }], 'creation').kind).toBe('blocked');
});
