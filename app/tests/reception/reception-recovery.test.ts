import { hasUnresolvedReceptionWrites } from '@/domain/reception/reception-recovery';
import type { SyncOperation } from '@/domain/sync/sync-operation';

const operation: SyncOperation = {
  id: 'create-operation', businessId: 'business', userId: 'user',
  type: 'reception.create', path: '/receptions', method: 'POST', body: {},
  status: 'confirmed', attempts: 1, createdAt: '2026-10-06', updatedAt: '2026-10-06',
  centralReference: 'existing-reception',
};

it.each(['pending', 'syncing', 'rejected', 'review'] as const)('blocks %s writes using the central or resolved local identity', (status) => {
  const write = { ...operation, id: 'sack-operation', type: 'reception.sack-add', status, path: '/receptions/existing-reception/sacks' };
  expect(hasUnresolvedReceptionWrites([write], 'existing-reception')).toBe(true);
  expect(hasUnresolvedReceptionWrites([operation, { ...write, path: '/purchases/receptions/@create-operation/settlement' }], 'existing-reception')).toBe(true);
});

it('does not block confirmed, discarded or unrelated operations', () => {
  const write = { ...operation, type: 'reception.close', path: '/receptions/existing-reception/close-weighing' };
  expect(hasUnresolvedReceptionWrites([write, { ...write, status: 'discarded' }], 'existing-reception')).toBe(false);
  expect(hasUnresolvedReceptionWrites([{ ...write, status: 'pending', path: '/receptions/other-reception/sacks' }], 'existing-reception')).toBe(false);
});
