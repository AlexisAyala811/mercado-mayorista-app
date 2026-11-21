// Spec 005: 409 operation-id-conflict in the encrypted queue. The operation is
// not sent again nor recovered from the central record under its identifier,
// and it is sent with a new identifier only after the user confirms it.
import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { operationIdConflict, resendWithNewIdentity, type SyncOperation } from '@/domain/sync/sync-operation';
import { idConflictMessage, SyncQueueProvider, useSyncQueue } from '@/features/sync/sync-queue-provider';
import { ApiError, apiRequest } from '@/services/api/api-client';

// One session object: a new one per render would reload the queue forever.
const mockSession = { accessToken: 'test-token', user: { businessId: 'business-a', userId: 'user-a' } };
jest.mock('@/features/auth/session/session-provider', () => ({
  useSession: () => ({ session: mockSession }),
}));
jest.mock('@/services/storage/encrypted-queue-storage', () => ({
  readEncryptedQueue: jest.fn(async () => []),
  writeEncryptedQueue: jest.fn(async () => undefined),
}));
jest.mock('@/services/api/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error {
    status: number;
    code?: string;
    constructor(message: string, status: number, code?: string) { super(message); this.status = status; this.code = code; }
  },
  ApiUnavailableError: class ApiUnavailableError extends Error {},
}));

let latest: ReturnType<typeof useSyncQueue>;
function Probe() { const value = useSyncQueue(); useEffect(() => { latest = value; }, [value]); return null; }
const missing = () => new ApiError('Missing', 404);
const conflict = () => new ApiError('Operation id reused', 409, operationIdConflict);

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.useRealTimers();
  jest.mocked(apiRequest).mockReset();
});

async function queueInConflict() {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueProvider><Probe /></SyncQueueProvider>); });
  jest.mocked(apiRequest).mockRejectedValueOnce(missing()).mockRejectedValueOnce(conflict());
  await act(async () => { await latest.enqueue({ id: 'sale-a', body: { clientOperationId: 'sale-a', buyerId: 'buyer' }, method: 'POST', path: '/sales', type: 'sale.create' }); });
  await act(async () => { await latest.sendQueued('sale-a'); });
  return root;
}

it('keeps an identifier conflict in review with its code and an explanation', async () => {
  const root = await queueInConflict();
  expect(latest.operations[0]).toMatchObject({ status: 'review', conflictCode: operationIdConflict, message: idConflictMessage, attempts: 1 });
  await act(async () => { root.unmount(); });
});

it('neither resends nor recovers the conflicting identifier on retry or synchronization', async () => {
  const root = await queueInConflict();
  const calls = jest.mocked(apiRequest).mock.calls.length;
  await act(async () => { await latest.retry('sale-a'); await latest.synchronize(); });
  expect(jest.mocked(apiRequest).mock.calls).toHaveLength(calls);
  expect(latest.operations[0].status).toBe('review');
  await act(async () => { root.unmount(); });
});

it('resends with a new identifier in path order and keeps the original as discarded evidence', async () => {
  const root = await queueInConflict();
  jest.mocked(apiRequest).mockRejectedValueOnce(missing()).mockResolvedValueOnce({ id: 'central-sale' });
  let sent!: SyncOperation;
  await act(async () => { sent = await latest.resendAsNew('sale-a'); });
  expect(sent.id).not.toBe('sale-a');
  expect(sent).toMatchObject({ status: 'confirmed', centralReference: 'central-sale', attempts: 1 });
  expect(apiRequest).toHaveBeenLastCalledWith('/sales', { body: { clientOperationId: sent.id, buyerId: 'buyer' }, method: 'POST', token: 'test-token' });
  expect(latest.operations.map((item) => [item.id === 'sale-a' ? 'original' : 'copy', item.status])).toEqual([['original', 'discarded'], ['copy', 'confirmed']]);
  await act(async () => { root.unmount(); });
});

it('discards a conflict without looking up the central record under its identifier', async () => {
  const root = await queueInConflict();
  const calls = jest.mocked(apiRequest).mock.calls.length;
  await act(async () => { await latest.discard('sale-a', 'Ya estaba registrada'); });
  expect(jest.mocked(apiRequest).mock.calls).toHaveLength(calls);
  expect(latest.operations[0]).toMatchObject({ status: 'discarded', message: 'Descartada localmente: Ya estaba registrada' });
  await act(async () => { root.unmount(); });
});

it('treats any other 409 as a review that can still be retried', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueProvider><Probe /></SyncQueueProvider>); });
  jest.mocked(apiRequest).mockRejectedValueOnce(missing()).mockRejectedValueOnce(new ApiError('Version changed', 409, 'version-conflict'));
  await act(async () => { await latest.enqueue({ id: 'payment-a', body: { clientOperationId: 'payment-a' }, method: 'POST', path: '/accounts/a/payments', type: 'account.payment' }); });
  await act(async () => { await latest.sendQueued('payment-a'); });
  expect(latest.operations[0]).toMatchObject({ status: 'review', message: 'Version changed' });
  expect(latest.operations[0].conflictCode).toBeUndefined();
  await expect(latest.resendAsNew('payment-a')).rejects.toThrow('Solo se reenvía como nueva');
  await act(async () => { root.unmount(); });
});

describe('resendWithNewIdentity', () => {
  const base = { businessId: 'b', userId: 'u', attempts: 2, createdAt: '2026-11-21T00:00:00Z', updatedAt: '2026-11-21T00:00:00Z' };
  const reception: SyncOperation = { ...base, id: 'old', type: 'reception.create', path: '/receptions', method: 'POST', body: { clientOperationId: 'old' }, status: 'review', conflictCode: operationIdConflict, message: idConflictMessage };
  const sack: SyncOperation = { ...base, id: 'sack', type: 'reception.sack-add', path: '/receptions/@old/sacks', method: 'POST', body: { clientOperationId: 'sack' }, status: 'pending' };

  it('points operations that waited on the original to the copy', () => {
    const next = resendWithNewIdentity([reception, sack], 'old', 'new');
    expect(next.map((item) => item.id)).toEqual(['old', 'new', 'sack']);
    expect(next[0].status).toBe('discarded');
    expect(next[1]).toMatchObject({ body: { clientOperationId: 'new' }, attempts: 0, status: 'pending' });
    expect(next[1].conflictCode).toBeUndefined();
    expect(next[2].path).toBe('/receptions/@new/sacks');
  });

  it('refuses operations that are not in an identifier conflict', () => {
    expect(() => resendWithNewIdentity([sack], 'sack', 'new')).toThrow('Solo se reenvía como nueva');
  });
});
