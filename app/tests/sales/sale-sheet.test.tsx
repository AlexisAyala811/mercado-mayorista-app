import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { saleLineGrams, withWeights } from '@/domain/sales/sale';
import { saleConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { SaleFlowScreen } from '@/features/sales/screens/sale-flow-screen';
import { LotDialog } from '@/features/sales/components/lot-dialog';
import { getSale, loadSaleCatalogs } from '@/services/api/sales-api';
import { withChrome } from '../shared/with-chrome';

// Spec 011 (RQ-ST14, CL-ST19): on the tablet the sale is one screen and each
// lot is sent as one line with its sacks and the sum of their weights.
jest.mock('react-native', () => {
  const descriptors = Object.getOwnPropertyDescriptors(jest.requireActual('react-native'));
  delete descriptors.useWindowDimensions;
  return Object.defineProperties({ useWindowDimensions: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })) }, descriptors);
});
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
const mockEnqueue = jest.fn(); const mockSendQueued = jest.fn(); const mockReplace = jest.fn();
let mockId = 0;
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued }) }));
const mockSession = { accessToken: 'test-token', expiresAt: '2099-01-01T00:00:00Z', user: { businessId: 'b', userId: 'u', username: 'Mayorista de prueba', role: 'wholesaler', expiresAt: '2099-01-01T00:00:00Z' } };
const mockInvalidate = jest.fn();
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession, invalidateSession: mockInvalidate }) }));
const mockRouter = { replace: mockReplace, back: jest.fn(), canGoBack: () => true }; const mockNavigation = { dispatch: jest.fn() };
jest.mock('expo-router', () => ({ useNavigation: () => mockNavigation, useRouter: () => mockRouter }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/navigation/use-browser-traversal-guard', () => ({ useBrowserTraversalGuard: jest.fn() }));
jest.mock('@/services/api/sales-api', () => ({ getSale: jest.fn(), loadSaleCatalogs: jest.fn() }));
jest.mock('@/services/receipts/receipt-sharing', () => ({ shareReceipt: jest.fn() }));
jest.mock('@/domain/reception/reception', () => ({ ...jest.requireActual('@/domain/reception/reception'), createOperationId: () => `id-${++mockId}` }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: (props: { children?: React.ReactNode }) => react.createElement('test-screen', props, props.children), ChoiceDialog: control, ConfirmationDialog: control, FeedbackState: control, FormField: control, LoadingState: control, MetricTile: control, ScreenHeader: control, SelectionField: control, StepProgress: control };
});

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks(); mockId = 0;
  mockEnqueue.mockResolvedValue({ status: 'pending' });
  mockSendQueued.mockResolvedValue({ status: 'confirmed', centralReference: 'central-sale' });
  jest.mocked(loadSaleCatalogs).mockResolvedValue({ buyers: [{ id: 'buyer', name: 'Comprador', phone: '999', destinationDepartment: 'Lima', creditLimitCents: null }], vehicles: [], varieties: [{ id: 'canchan', name: 'Canchán' }, { id: 'peruanita', name: 'Peruanita' }] });
  jest.mocked(getSale).mockResolvedValue({ sale: { id: 'central-sale', buyerId: 'buyer', destinationDepartment: 'Lima', grossAmountCents: '30200', freightAmountCents: '0', discountsCents: '0', totalAmountCents: '30200', paymentMode: 'cash', state: 'confirmed', version: 1, createdAt: '2026-11-10T15:00:00Z' }, lines: [] });
});

const press = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]!.props.onPress();
const type = (root: ReactTestRenderer, label: string, value: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0]!.props.onChangeText(value);
const dialog = (root: ReactTestRenderer, title: string) => root.root.findAll((node) => node.props.title === title)[0]!;

const typeDraft = (root: ReactTestRenderer, value: string) => root.root.findAll((node) => String(node.props.accessibilityLabel ?? '').startsWith('Peso del saco') && typeof node.props.onChangeText === 'function')[0]!.props.onChangeText(value);

async function weigh(root: ReactTestRenderer, weights: string[]) {
  for (const weight of weights) {
    await act(async () => { typeDraft(root, weight); });
    await act(async () => { press(root, 'Registrar peso'); });
  }
}

// «Añadir nuevo lote / variedad» (CL-ST22).
async function createLot(root: ReactTestRenderer, varietyId: string, unitPrice = '', plannedSacks = 10) {
  await act(async () => { press(root, 'Añadir lote o variedad'); });
  expect(root.root.findByType(LotDialog).props.visible).toBe(true);
  await act(async () => { root.root.findByType(LotDialog).props.onCreate({ varietyId, qualityId: null, unitPrice, plannedSacks }); });
}

it('sums the weighed sacks into each line and sends the same sale as the form', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  expect(root.root.findAll((node) => node.props.testID === 'sale-sheet')).not.toHaveLength(0);
  await act(async () => { root.root.findAll((node) => node.props.label === 'Nombre del cliente / comprador')[0]!.props.onPress(); });
  await act(async () => { dialog(root, 'Seleccionar comprador').props.onSelect({ id: 'buyer' }); });
  expect(root.root.findAll((node) => node.props.label === 'N.° celular')[0]!.props.value).toBe('999');
  await createLot(root, 'canchan');
  await weigh(root, ['50', '51', '49']);
  // A sack is corrected from the grid.
  await act(async () => { press(root, 'Saco 2: 51 kilos'); });
  await act(async () => { type(root, 'Corregir peso del saco 2 (kg)', '52'); });
  await act(async () => { press(root, 'Guardar corrección'); });
  await act(async () => { type(root, 'Precio por kilogramo, lote A (S/)', '2.00'); });
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote A: S/ 302.00')).not.toHaveLength(0);
  // The same variety cannot get a second lot without another quality or origin.
  await createLot(root, 'canchan');
  expect(root.root.findAll((node) => node.props.message === 'Esta variedad ya tiene un lote con esa calidad; cambia la calidad o la procedencia para añadir otro.')).not.toHaveLength(0);
  await act(async () => { root.root.findByType(LotDialog).props.onCancel(); });
  await act(async () => { press(root, 'Guardar venta'); });
  expect(dialog(root, '¿Confirmar la venta?').props.visible).toBe(true);
  await act(async () => { dialog(root, '¿Confirmar la venta?').props.onConfirm(); await Promise.resolve(); });
  expect(mockEnqueue).toHaveBeenCalledTimes(1);
  expect(mockEnqueue.mock.calls[0]![0].body).toMatchObject({ buyerId: 'buyer', destinationDepartment: 'Lima', lines: [{ varietyId: 'canchan', priceBasis: 'kilogram', sacks: 3, unitPriceCents: 200, weightKg: '151' }] });
  expect(root.root.findAll((node) => node.props.testID === 'confirmation-card')).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('blocks saving while a lot has no sacks and lets the empty lot be removed', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await act(async () => { root.root.findAll((node) => node.props.label === 'Nombre del cliente / comprador')[0]!.props.onPress(); });
  await act(async () => { dialog(root, 'Seleccionar comprador').props.onSelect({ id: 'buyer' }); });
  await createLot(root, 'peruanita');
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Guardar venta' && node.props.onPress)[0]!.props.disabled).toBe(true);
  await act(async () => { press(root, 'Quitar lote A'); });
  expect(root.root.findAll((node) => String(node.props.testID ?? '').startsWith('sale-lot-'))).toHaveLength(0);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('starts the lot with its price and numbered empty cells, and adds one more cell', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await createLot(root, 'canchan', '1.45', 5);
  const cells = () => root.root.findAll((node) => typeof node.type === 'string' && /^sale-sack-(draft|empty-\d+)$/.test(String(node.props.testID ?? ''))).map((node) => node.props.testID);
  expect(cells()).toEqual(['sale-sack-draft', 'sale-sack-empty-2', 'sale-sack-empty-3', 'sale-sack-empty-4', 'sale-sack-empty-5']);
  expect(root.root.findAll((node) => node.props.children?.join?.('') === '0 de 5 sacos registrados')).not.toHaveLength(0);
  await weigh(root, ['50', '52']);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote A: S/ 147.90')).not.toHaveLength(0);
  expect(cells()).toEqual(['sale-sack-draft', 'sale-sack-empty-4', 'sale-sack-empty-5']);
  await act(async () => { press(root, 'Añadir 1 saco'); });
  expect(cells()).toContain('sale-sack-empty-6');
  await act(async () => root.unmount());
});

it('keeps sacks and weight equal to the weighed sacks and sums the card facts', () => {
  const line = withWeights({ id: 'l', varietyId: 'v', priceBasis: 'sack', sacks: '0', weightKg: '0', unitPrice: '80' }, ['50', '49']);
  expect(line).toMatchObject({ sacks: '2', weightKg: '99' });
  expect(saleLineGrams(line)).toBe(99000n);
  const summary = saleConfirmationSummary({ totalAmountCents: '16000', paymentMode: 'credit', freightAmountCents: '500', discountsCents: '0', createdAt: '2026-11-10T15:00:00Z' }, [{ varietyId: 'v', sacks: 2, weightKg: '99.000', priceBasis: 'sack', unitPriceCents: '8000' }], () => 'Canchán');
  expect(summary.facts).toEqual([{ label: 'Variedades', value: 'Canchán' }, { label: 'Total sacos / peso', value: '2 sacos · 99 kg' }, { label: 'Precio de venta', value: 'S/ 80.00 / saco' }]);
  expect(summary.notes).toEqual([{ label: 'Flete / estiba', value: 'S/ 5.00' }, { label: 'Descuentos', value: 'S/ 0.00' }, { label: 'Pago', value: 'Crédito' }, { label: 'Emisión', value: '2026-11-10' }]);
  expect(summary).toMatchObject({ total: 'S/ 160.00', totalLabel: 'Total neto a cobrar' });
});
