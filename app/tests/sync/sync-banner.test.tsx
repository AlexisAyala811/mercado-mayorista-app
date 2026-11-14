import { act, create } from 'react-test-renderer';
import { useSyncStatus, type SyncStatus } from '@/features/sync/use-sync-status';

const mockQueue = { isLoadingQueue: false, queueError: null as string | null, operations: [] as { status: string }[], pendingCount: 0 };
let mockOffline = false;
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { user: { userId: 'test' } }, isOfflineSession: mockOffline }) }));
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => mockQueue }));

function read() {
  let status: SyncStatus | null = null;
  function Probe() { status = useSyncStatus(); return null; }
  act(() => { create(<Probe />); });
  return status as SyncStatus | null;
}

// Spec 011 (CL-ST18): the state shown in the Stitch header.
it('announces a queue read failure instead of reporting synchronized data', () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mockQueue.queueError = 'Cannot decrypt';
  expect(read()).toMatchObject({ tone: 'warning', title: 'No se pudieron recuperar los pendientes', accessibilityLabel: 'No se pudo recuperar la sincronización' });
  mockQueue.queueError = null;
  mockQueue.pendingCount = 2;
  mockOffline = true;
  expect(read()).toMatchObject({ tone: 'pending', title: 'Sin conexión', detail: '2 pendientes' });
  mockOffline = false;
  mockQueue.operations = [{ status: 'rejected' }];
  expect(read()).toMatchObject({ tone: 'warning', detail: '1 por revisar' });
  mockQueue.operations = [];
  mockQueue.pendingCount = 0;
  expect(read()).toMatchObject({ tone: 'ok', title: 'En línea', detail: 'Sincronizado' });
});
