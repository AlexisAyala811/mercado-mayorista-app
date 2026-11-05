import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SyncQueueScreen } from '@/features/sync/sync-queue-screen';
import type { SyncOperation } from '@/domain/sync/sync-operation';

jest.mock('@/features/auth/session/session-provider',()=>({useSession:()=>({isOfflineSession:false,retryBootstrap:jest.fn()})}));
const mockPush = jest.fn();
let mockOperations: SyncOperation[] = [];
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn(), push: mockPush }) }));
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ operations: mockOperations, isLoadingQueue: false, queueError: null, pendingCount: 1, retry: jest.fn(), synchronize: jest.fn(), discard: jest.fn(), reloadQueue: jest.fn() }) }));
jest.mock('@/ui/components', () => { const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props); return { AppButton: control, AppCard: control, AppScreen: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control }; });
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mockPush.mockClear();
  mockOperations = [{ id: 'creation', type: 'reception.create', path: '/receptions', method: 'POST', businessId: 'business', userId: 'user', status: 'pending', attempts: 0, createdAt: '2026-10-06', updatedAt: '2026-10-06', body: { providerId: 'provider', driverName: 'Conductor QA', receivedOn: '2026-10-06', expectedVarietyIds: ['variety'] }, receptionContext: { providerName: 'Proveedor QA', vehiclePlate: '', varieties: [{ id: 'variety', name: 'Papa' }] } }];
});

it('offers continuation of a saved local reception without synchronizing it first', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueScreen />); });
  await act(async () => { root.root.findAll(node => node.props.label === 'Continuar pesaje local')[0].props.onPress(); });
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/purchase-flow', params: { receptionId: 'local:creation' } });
  await act(async () => { root.unmount(); });
});

it('does not expose continuation after a stored settlement or rejected creation', async () => {
  mockOperations[0].status = 'rejected';
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueScreen />); });
  expect(root.root.findAll(node => typeof node.props.label === 'string' && node.props.label.startsWith('Continuar'))).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it('offers a confirmed saved copy without claiming that its operations are still pending', async () => {
  mockOperations[0].status = 'confirmed'; mockOperations[0].centralReference = 'central-reception';
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueScreen />); });
  expect(root.root.findAll(node => node.props.label === 'Continuar recepción guardada')).not.toHaveLength(0);
  expect(root.root.findAll(node => node.props.title === 'Recepción local abierta')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});
