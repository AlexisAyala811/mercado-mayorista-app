import React, { useEffect } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SyncQueueProvider, useSyncQueue } from '@/features/sync/sync-queue-provider';
import { ApiError, ApiUnavailableError, apiRequest } from '@/services/api/api-client';
import { writeEncryptedQueue } from '@/services/storage/encrypted-queue-storage';

// Spec 010 (T1041): a settlement with lots is kept in the encrypted queue,
// resent with the same operation identity, and a 409 is shown for review
// without retrying (CL-FM16).
const mockSession = { accessToken: 'test-token', user: { businessId: 'business-a', userId: 'user-a' } };
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('@/services/storage/encrypted-queue-storage', () => ({ readEncryptedQueue: jest.fn(async () => []), writeEncryptedQueue: jest.fn(async () => undefined) }));
jest.mock('@/services/api/api-client', () => ({
  apiRequest: jest.fn(),
  ApiError: class ApiError extends Error { status: number; constructor(message: string, status: number) { super(message); this.status = status; } },
  ApiUnavailableError: class ApiUnavailableError extends Error {},
}));
let latest: ReturnType<typeof useSyncQueue>;
function Probe() { const value = useSyncQueue(); useEffect(() => { latest = value; }, [value]); return null; }

const id = '00000000-0000-4000-8000-000000000101';
const body = {
  clientOperationId: id, expectedReceptionVersion: 6, advancesCents: 0, discountsCents: 0, paymentMode: 'cash', installments: [],
  freightBasis: 'sack', freightRateCents: 200, freightChargedTo: 'wholesaler',
  lots: [
    { varietyId: 'v-amarilla', qualityId: null, priceBasis: 'kilogram', unitPriceCents: 180 },
    { varietyId: 'v-canchan', qualityId: 'q-1ra', priceBasis: 'sack', unitPriceCents: 9500, name: 'Selecta' },
  ],
};
const path = '/purchases/receptions/reception-id/settlement';
const posts = () => jest.mocked(apiRequest).mock.calls.filter((call) => call[1]?.method === 'POST');
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); });

it('stores the lots in the encrypted queue and resends the same identity and body', async () => {
  jest.mocked(apiRequest).mockReset()
    .mockRejectedValueOnce(new ApiUnavailableError())
    .mockRejectedValueOnce(new ApiError('Not found', 404))
    .mockResolvedValueOnce({ id: 'central-settlement' });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueProvider><Probe /></SyncQueueProvider>); });
  await act(async () => { await latest.enqueue({ id, type: 'purchase.settle', method: 'POST', path, body }); });
  const stored = jest.mocked(writeEncryptedQueue).mock.calls.at(-1)![1] as { id: string; body: typeof body }[];
  expect(stored.find((operation) => operation.id === id)?.body).toEqual(body);
  await act(async () => { await latest.synchronize(); });
  await act(async () => { await latest.retry(id); await latest.synchronize(); });
  expect(posts().map((call) => [call[0], call[1]?.body])).toEqual([[path, body]]);
  expect(latest.operations[0]).toMatchObject({ id, status: 'confirmed' });
  await act(async () => root.unmount());
});

it('shows a 409 for review and does not retry it on its own', async () => {
  jest.mocked(apiRequest).mockReset().mockImplementation(async (requestPath) => {
    if (requestPath.startsWith('/operations/')) throw new ApiError('Not found', 404);
    throw new ApiError('operation-id-conflict', 409);
  });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueProvider><Probe /></SyncQueueProvider>); });
  await act(async () => { await latest.enqueue({ id, type: 'purchase.settle', method: 'POST', path, body }); });
  await act(async () => { await latest.synchronize(); });
  expect(latest.operations[0]).toMatchObject({ id, status: 'review' });
  const sent = posts().length;
  await act(async () => { await latest.synchronize(); });
  expect(posts()).toHaveLength(sent);
  expect(latest.operations[0]?.body).toEqual(body);
  await act(async () => root.unmount());
});
