import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PurchaseHistoryScreen } from '@/features/reception/screens/purchase-history-screen';
import { getPurchasePaymentStatus, listReceptions } from '@/services/api/reception-api';
import { paymentStatusView, receptionsWithPayment } from '@/domain/reception/payment-status';
import type { Reception } from '@/domain/reception/reception';

jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ enqueue: jest.fn(), sendQueued: jest.fn() }) }));
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { accessToken: 'test-token', user: { role: 'wholesaler' } } }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/api/reception-api', () => ({ getPurchasePaymentStatus: jest.fn(), getPurchaseSettlement: jest.fn(), getReception: jest.fn(), getSacks: jest.fn(), listReceptions: jest.fn() }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ConfirmationDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, MetricTile: control, ScreenHeader: control };
});

const base: Reception = { id: 'cash', providerId: 'p', providerPhone: null, vehicleId: null, driverName: 'Conductor', receivedOn: '2026-11-05', state: 'settled', version: 4, expectedVarieties: [] };
const receptions: Reception[] = [base, { ...base, id: 'credit' }, { ...base, id: 'voided', state: 'voided' }, { ...base, id: 'open', state: 'weighing' }];
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  jest.mocked(listReceptions).mockResolvedValue({ items: receptions, total: 4, limit: 20, offset: 0 });
});
const badges = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Estado de pago')).map((node) => node.props.accessibilityLabel as string);
const texts = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string').map((node) => node.props.children as string);

it('shows paid, debt with its balance and voided from the server for settled receptions only', async () => {
  jest.mocked(getPurchasePaymentStatus).mockResolvedValue([
    { receptionId: 'cash', settlementId: 's1', state: 'paid', balanceCents: '0' },
    { receptionId: 'credit', settlementId: 's2', state: 'debt', balanceCents: '1250050' },
    { receptionId: 'voided', settlementId: 's3', state: 'voided', balanceCents: '0' },
  ]);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  expect(getPurchasePaymentStatus).toHaveBeenCalledWith('test-token', ['cash', 'credit', 'voided']);
  expect(badges(root)).toEqual(['Estado de pago: Pagada', 'Estado de pago: Con deuda, Saldo S/ 12500.50', 'Estado de pago: Anulada']);
  await act(async () => root.unmount());
});

it('keeps the list usable and says so when the state cannot be read', async () => {
  jest.mocked(getPurchasePaymentStatus).mockRejectedValue(new Error('Sin conexión'));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  expect(badges(root)).toHaveLength(0);
  expect(texts(root).filter((text) => text === 'Estado de pago no disponible sin conexión.')).toHaveLength(3);
  expect(root.root.findAll((node) => typeof node.type === 'string' && node.props.label === 'Abrir detalle')).toHaveLength(4);
  await act(async () => root.unmount());
});

it('does not ask the server when no reception of the page is settled', async () => {
  jest.mocked(listReceptions).mockResolvedValue({ items: [{ ...base, state: 'weighed' }], total: 1, limit: 20, offset: 0 });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  expect(getPurchasePaymentStatus).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('labels each state with text, not only colour', () => {
  expect(paymentStatusView({ state: 'debt', balanceCents: '500' })).toEqual({ label: 'Con deuda', detail: 'Saldo S/ 5.00', tone: 'danger' });
  expect(paymentStatusView({ state: 'paid', balanceCents: '0' })).toEqual({ label: 'Pagada', tone: 'success' });
  expect(receptionsWithPayment(receptions)).toEqual(['cash', 'credit', 'voided']);
});
