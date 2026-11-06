import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PurchaseHistoryScreen } from '@/features/reception/screens/purchase-history-screen';
import { getPurchasePaymentStatus, getPurchaseSettlement, getReception, getSacks, listReceptions } from '@/services/api/reception-api';
import type { PurchaseSettlement, Reception } from '@/domain/reception/reception';

const mockEnqueue = jest.fn();
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: jest.fn() }) }));
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { accessToken: 'test-token', user: { role: 'wholesaler' } } }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/services/api/reception-api', () => ({ getPurchasePaymentStatus: jest.fn(), getPurchaseSettlement: jest.fn(), getReception: jest.fn(), getSacks: jest.fn(), listReceptions: jest.fn() }));
jest.mock('@/domain/reception/reception', () => ({ ...jest.requireActual('@/domain/reception/reception'), createOperationId: () => 'detail-operation' }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ConfirmationDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, MetricTile: control, ScreenHeader: control };
});

const reception: Reception = { id: 'reception-id', providerId: 'p', providerPhone: null, vehicleId: null, driverName: 'Conductor', receivedOn: '2026-11-05', state: 'settled', version: 6, expectedVarieties: [] };
const settlement: PurchaseSettlement = {
  id: 'purchase-id', grossAmountCents: '31250', freightAmountCents: '1500', advancesCents: '1000', discountsCents: '250', liquidAmountCents: '30000',
  paymentMode: 'credit', state: 'confirmed', version: 2, freightChargedTo: 'wholesaler',
  lots: [
    { letter: 'A', name: null, varietyName: 'Amarilla', qualityName: null, sacks: 1, netWeightKg: '45.000', priceBasis: 'kilogram', unitPriceCents: '250', amountCents: '11250' },
    { letter: 'B', name: 'Selecta', varietyName: 'Canchán', qualityName: '1ra', sacks: 2, netWeightKg: '100.000', priceBasis: 'sack', unitPriceCents: '10000', amountCents: '20000' },
  ],
};
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  jest.mocked(listReceptions).mockResolvedValue({ items: [reception], total: 1, limit: 20, offset: 0 });
  jest.mocked(getPurchasePaymentStatus).mockResolvedValue([]);
  jest.mocked(getReception).mockResolvedValue(reception);
  jest.mocked(getSacks).mockResolvedValue([{ id: 'sack-id', sequence: 1, varietyId: 'v', grossWeightKg: '51.400', tareKg: '1.000', netWeightKg: '50.400' }]);
  jest.mocked(getPurchaseSettlement).mockResolvedValue(settlement);
});
const host = (root: ReactTestRenderer, predicate: (props: Record<string, unknown>) => boolean) => root.root.findAll((node) => typeof node.type === 'string' && predicate(node.props));
const texts = (root: ReactTestRenderer) => host(root, (props) => typeof props.children === 'string').map((node) => node.props.children as string);

async function openDetail() {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseHistoryScreen />); });
  await act(async () => { host(root, (props) => props.label === 'Abrir detalle')[0]!.props.onPress(); await Promise.resolve(); });
  return root;
}

it('shows each lot of the settlement and who assumed the freight in the purchase detail', async () => {
  const root = await openDetail();
  expect(texts(root)).toEqual(expect.arrayContaining(['Lote A · Amarilla · Calidad no informada', 'Lote B · Selecta · Canchán · 1ra']));
  expect(host(root, (props) => props.accessibilityLabel === 'Importe del lote B: S/ 200.00')).toHaveLength(1);
  expect(host(root, (props) => props.label === 'Flete a cargo del Mayorista')).toHaveLength(1);
  expect(host(root, (props) => props.label === 'Adelantos y descuentos' && props.value === 'S/ 12.50')).toHaveLength(1);
  expect(host(root, (props) => props.title === 'Liquidación')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('rounds sack weights on screen and captures corrections in whole kilograms', async () => {
  jest.mocked(getReception).mockResolvedValue({ ...reception, state: 'weighing' });
  jest.mocked(getPurchaseSettlement).mockRejectedValue(new Error('sin liquidación'));
  const root = await openDetail();
  expect(host(root, (props) => Array.isArray(props.children) && (props.children as unknown[]).join('').includes('50 kg netos'))).not.toHaveLength(0);
  await act(async () => { host(root, (props) => props.label === 'Corregir')[0]!.props.onPress(); });
  const field = (label: string) => host(root, (props) => props.label === label)[0]!;
  expect(field('Peso bruto (kg)').props).toMatchObject({ value: '51', keyboardType: 'number-pad' });
  await act(async () => { field('Motivo').props.onChangeText('Peso mal leído'); field('Peso bruto (kg)').props.onChangeText('52,5'); });
  await act(async () => { field('Revisar corrección').props.onPress(); });
  await act(async () => { host(root, (props) => props.visible === true && typeof props.onConfirm === 'function')[0]?.props.onConfirm(); await Promise.resolve(); });
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
