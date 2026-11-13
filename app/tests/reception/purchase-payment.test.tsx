import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { HistoryCard } from '@/domain/shared/history-cards';
import { PurchasePaymentDialog } from '@/features/reception/components/purchase-payment-dialog';
import { listAccounts } from '@/services/api/operations-api';

const mockEnqueue = jest.fn();
const mockSendQueued = jest.fn();
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued }) }));
jest.mock('@/services/api/operations-api', () => ({ listAccounts: jest.fn() }));
jest.mock('@/domain/reception/reception', () => ({ ...jest.requireActual('@/domain/reception/reception'), createOperationId: () => 'payment-operation' }));
jest.mock('@/features/reception/screens/purchase-sheet', () => ({ SheetInput: (props: object) => jest.requireActual('react').createElement('sheet-input', props) }));
jest.mock('@/ui/components/symbol', () => ({ SymbolView: () => null }));

const card: HistoryCard = { balanceCents: '146400', date: '2026-11-07', id: 'abcdef1234567890', paidCents: '150000', party: 'Faustino Quispe', sacks: 45, sourceId: 'settlement-1', state: 'debt', totalCents: '296400', varieties: ['Yungay'], weightKg: '2280.000' };
const account = { id: 'account-1', kind: 'payable' as const, state: 'open' as const, sourceType: 'purchase', sourceId: 'settlement-1', initialAmountCents: '296400', balanceCents: '146400', version: 3, createdAt: '2026-11-07T10:00:00Z' };

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  mockEnqueue.mockResolvedValue({ id: 'payment-operation', status: 'pending' });
  mockSendQueued.mockResolvedValue({ id: 'payment-operation', status: 'confirmed' });
  jest.mocked(listAccounts).mockResolvedValue({ items: [account], limit: 100, offset: 0, total: 1 });
});

const press = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]!.props.onPress();
async function open(overrides: Partial<React.ComponentProps<typeof PurchasePaymentDialog>> = {}) {
  const onPaid = jest.fn(); const onPending = jest.fn(); const onClose = jest.fn();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchasePaymentDialog card={card} onClose={onClose} onPaid={onPaid} onPending={onPending} token="test-token" {...overrides} />); });
  return { onClose, onPaid, onPending, root };
}

// Spec 011, CL-ST30: «Abonar / Liquidar» of «Ver compras».
it('prefills the whole balance and registers the payment as the account payment of Deudas', async () => {
  const { onPaid, root } = await open();
  const input = root.root.findAll((node) => node.props.accessibilityLabel === 'Monto a cancelar o abonar (S/)')[0]!;
  expect(input.props.value).toBe('1464.00');
  await act(async () => { input.props.onChangeText('1000'); });
  await act(async () => { press(root, 'Registrar pago'); });
  expect(mockEnqueue).toHaveBeenCalledWith({ body: { amountCents: 100000, clientOperationId: 'payment-operation', expectedAccountVersion: 3 }, id: 'payment-operation', method: 'POST', path: '/accounts/account-1/payments', type: 'account.payment' });
  expect(onPaid).toHaveBeenCalledWith(expect.stringContaining('S/ 1,000.00'));
  await act(async () => root.unmount());
});

it('rejects an amount above the balance and goes to the queue when the server does not confirm', async () => {
  const { onPaid, onPending, root } = await open();
  const input = root.root.findAll((node) => node.props.accessibilityLabel === 'Monto a cancelar o abonar (S/)')[0]!;
  await act(async () => { input.props.onChangeText('9999'); });
  await act(async () => { press(root, 'Registrar pago'); });
  expect(mockEnqueue).not.toHaveBeenCalled();
  expect(root.root.findAll((node) => node.props.accessibilityLiveRegion === 'polite' && String(node.props.children).length > 0)).not.toHaveLength(0);
  mockSendQueued.mockResolvedValue({ id: 'payment-operation', status: 'pending' });
  await act(async () => { input.props.onChangeText('100'); });
  await act(async () => { press(root, 'Registrar pago'); });
  expect(onPending).toHaveBeenCalledTimes(1);
  expect(onPaid).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('says so when the purchase has no open account', async () => {
  jest.mocked(listAccounts).mockResolvedValue({ items: [], limit: 100, offset: 0, total: 0 });
  const { root } = await open();
  expect(root.root.findAll((node) => String(node.props.children).includes('No se encontró la cuenta por pagar'))).not.toHaveLength(0);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Registrar pago')[0]!.props.disabled).toBe(true);
  await act(async () => root.unmount());
});
