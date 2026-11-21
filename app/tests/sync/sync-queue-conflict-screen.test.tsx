// Spec 005: the queue screen offers «Reenviar como nueva» for an identifier
// conflict and sends it only after an explicit confirmation.
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { SyncQueueScreen } from '@/features/sync/sync-queue-screen';

const mockResend = jest.fn(); const mockRetry = jest.fn();
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ isOfflineSession: false, retryBootstrap: jest.fn() }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({
  isLoadingQueue: false, queueError: null, pendingCount: 0,
  operations: [{ id: 'sale-a', type: 'sale.create', status: 'review', conflictCode: 'operation-id-conflict', attempts: 1, createdAt: '2026-11-21T00:00:00Z', message: 'conflicto' }],
  retry: mockRetry, synchronize: jest.fn(), discard: jest.fn(), reloadQueue: jest.fn(), resendAsNew: mockResend,
}) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control };
});

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  mockResend.mockReset().mockResolvedValue(undefined); mockRetry.mockReset();
});

it('offers «Reenviar como nueva» instead of a retry and asks before sending', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueScreen />); });
  expect(root.root.findAll((node) => node.props.label === 'Reintentar')).toHaveLength(0);
  await act(async () => { root.root.findAll((node) => node.props.label === 'Reenviar como nueva')[0].props.onPress(); });
  expect(mockResend).not.toHaveBeenCalled();
  const confirm = root.root.findAll((node) => node.props.actionLabel === 'Sí, reenviar como nueva')[0];
  expect(confirm.props.message).toContain('se duplicaría');
  await act(async () => { confirm.props.onAction(); await Promise.resolve(); });
  expect(mockResend).toHaveBeenCalledWith('sale-a');
  expect(mockRetry).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('lets the user cancel the resend', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SyncQueueScreen />); });
  await act(async () => { root.root.findAll((node) => node.props.label === 'Reenviar como nueva')[0].props.onPress(); });
  await act(async () => { root.root.findAll((node) => node.props.label === 'Cancelar')[0].props.onPress(); });
  expect(root.root.findAll((node) => node.props.actionLabel === 'Sí, reenviar como nueva')).toHaveLength(0);
  expect(mockResend).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});
