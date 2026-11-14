import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { saleLineGrams, withWeights } from '@/domain/sales/sale';
import { saleConfirmationSummary } from '@/domain/shared/confirmation-summary';
import { SaleFlowScreen } from '@/features/sales/screens/sale-flow-screen';
import { LotDialog } from '@/features/sales/components/lot-dialog';
import { DateDialog } from '@/features/sales/components/date-dialog';
import { formatLocalDateInput } from '@/domain/shared/date';
import { Keyboard } from 'react-native';
import { getSale, loadSaleCatalogs } from '@/services/api/sales-api';
import { createCatalogItem } from '@/services/api/catalog-api';
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
jest.mock('@/services/api/catalog-api', () => ({ createCatalogItem: jest.fn(), updateCatalogItem: jest.fn() }));
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

// Each cell is typed directly, as in the mockup (CL-ST22).
async function weigh(root: ReactTestRenderer, weights: string[], first = 1) {
  for (const [offset, weight] of weights.entries()) {
    await act(async () => { type(root, `Peso del saco ${first + offset} (kg)`, weight); });
  }
}
const cells = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && /^sale-sack-\d+$/.test(String(node.props.testID ?? ''))).length;
const badge = (root: ReactTestRenderer, text: string) => root.root.findAll((node) => typeof node.type === 'string' && [node.props.children].flat().join('') === text);

// CL-ST23: the buyer is typed in its box and picked from the matches.
async function pickBuyer(root: ReactTestRenderer) {
  await act(async () => { root.root.findAll((node) => node.props.label === 'Nombre del cliente / comprador' && typeof node.props.onChangeText === 'function')[0]!.props.onChangeText('Compr'); });
  await act(async () => { press(root, 'Elegir Comprador'); });
}

// «Añadir nuevo lote / variedad» (CL-ST22).
async function createLot(root: ReactTestRenderer, varietyId: string, unitPrice = '', plannedSacks = 10) {
  await act(async () => { press(root, 'Añadir lote o variedad'); });
  expect(root.root.findByType(LotDialog).props.visible).toBe(true);
  await act(async () => { root.root.findByType(LotDialog).props.onCreate({ varietyId, qualityId: null, originId: null, unitPrice, plannedSacks }); });
}

it('sums the weighed sacks into each line and sends the same sale as the form', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  expect(root.root.findAll((node) => node.props.testID === 'sale-sheet')).not.toHaveLength(0);
  await pickBuyer(root);
  expect(root.root.findAll((node) => node.props.label === 'N.° celular')[0]!.props.value).toBe('999');
  await createLot(root, 'canchan');
  await weigh(root, ['50', '51', '49']);
  // A sack is corrected in its own cell.
  await act(async () => { type(root, 'Peso del saco 2 (kg)', '52'); });
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
  await pickBuyer(root);
  // CL-ST23: the sheet opens with «Lote A» of the first variety and 10 empty cells.
  expect(root.root.findAll((node) => typeof node.type === 'string' && node.props.testID === 'sale-lot-A')).toHaveLength(1);
  expect(cells(root)).toBe(10);
  await createLot(root, 'peruanita');
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Guardar venta' && node.props.onPress)[0]!.props.disabled).toBe(true);
  await act(async () => { press(root, 'Quitar lote B'); });
  expect(root.root.findAll((node) => typeof node.type === 'string' && /^sale-lot-[A-Z]$/.test(String(node.props.testID ?? '')))).toHaveLength(1);
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('starts the lot with its price and empty cells, types, clears with × and loads 10 sacks of 50 kg', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await createLot(root, 'peruanita', '1.45', 10);
  expect(cells(root)).toBe(10);
  expect(badge(root, '0 de 10 sacos registrados')).not.toHaveLength(0);
  await weigh(root, ['50', '52']);
  await act(async () => { type(root, 'Peso del saco 7 (kg)', '49'); });
  expect(badge(root, '3 de 10 sacos registrados')).not.toHaveLength(0);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote B: S/ 218.95')).not.toHaveLength(0);
  // Decimals are not kept: the cell holds whole kilograms only.
  await act(async () => { type(root, 'Peso del saco 3 (kg)', '50.5'); });
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Peso del saco 3 (kg)' && typeof node.props.onChangeText === 'function')[0]!.props.value).toBe('505');
  await act(async () => { press(root, 'Limpiar saco 3'); });
  await act(async () => { press(root, 'Limpiar saco 7'); });
  expect(badge(root, '2 de 10 sacos registrados')).not.toHaveLength(0);
  expect(cells(root)).toBe(10);
  // «+ Añadir 1 saco» adds an empty cell; «×» on an extra cell removes it.
  await act(async () => { press(root, 'Añadir 1 saco'); });
  expect(cells(root)).toBe(11);
  await act(async () => { press(root, 'Limpiar saco 11'); });
  expect(cells(root)).toBe(10);
  // Quick load fills the 8 empty cells and adds 2 more, all at 50 kg.
  await act(async () => { press(root, 'Carga rápida de 10 sacos a 50 kilos'); });
  expect(cells(root)).toBe(12);
  expect(badge(root, '12 de 12 sacos registrados')).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('registers a new buyer typed in the sheet before sending the sale, and keeps RUC and date on the tablet', async () => {
  jest.mocked(createCatalogItem).mockResolvedValue({ id: 'new-buyer', name: 'Mercado Nuevo', phone: '988', destinationDepartment: 'Junín', creditLimitCents: null });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  const field = (label: string) => root.root.findAll((node) => node.props.label === label && typeof node.props.onChangeText === 'function')[0]!;
  await act(async () => { field('Nombre del cliente / comprador').props.onChangeText('Mercado Nuevo'); });
  expect(root.root.findAll((node) => String(node.props.accessibilityLabel ?? '').startsWith('Elegir '))).toHaveLength(0);
  await act(async () => { field('N.° celular').props.onChangeText('988'); field('RUC / DNI').props.onChangeText('20608945123'); field('Destino').props.onChangeText('Junín'); });
  expect(root.root.findAll((node) => typeof node.props.children === 'string' && node.props.children.includes('Comprador nuevo: se registrará al guardar la venta.'))).not.toHaveLength(0);
  await createLot(root, 'canchan', '2.00');
  await weigh(root, ['50']);
  await act(async () => { press(root, 'Guardar venta'); });
  await act(async () => { dialog(root, '¿Confirmar la venta?').props.onConfirm(); await Promise.resolve(); });
  expect(createCatalogItem).toHaveBeenCalledWith('test-token', 'buyers', { name: 'Mercado Nuevo', phone: '988', destinationDepartment: 'Junín' });
  expect(mockEnqueue.mock.calls[0]![0].body).toMatchObject({ buyerId: 'new-buyer', destinationDepartment: 'Junín' });
  expect(JSON.stringify(mockEnqueue.mock.calls[0]![0].body)).not.toContain('20608945123');
  await act(async () => root.unmount());
});

it('asks before removing a lot with weighed sacks and sends no freight while the rate is 0 (CL-ST23)', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await pickBuyer(root);
  await weigh(root, ['50']);
  await act(async () => { type(root, 'Precio por kilogramo, lote A (S/)', '2.00'); });
  expect(root.root.findAll((node) => String(node.props.accessibilityLabel ?? '').startsWith('Lote A: por'))).toHaveLength(0);
  await act(async () => { press(root, 'Guardar venta'); });
  await act(async () => { dialog(root, '¿Confirmar la venta?').props.onConfirm(); await Promise.resolve(); });
  expect(mockEnqueue.mock.calls[0]![0].body.freightBasis).toBeUndefined();
  await act(async () => root.unmount());
  let second!: ReactTestRenderer;
  await act(async () => { second = create(withChrome(<SaleFlowScreen />)); });
  await weigh(second, ['50']);
  await act(async () => { press(second, 'Quitar lote A'); });
  expect(dialog(second, '¿Quitar el lote?').props.visible).toBe(true);
  await act(async () => { dialog(second, '¿Quitar el lote?').props.onConfirm(); });
  // The last lot gives way to a fresh initial lot, as the mockup keeps one.
  expect(badge(second, '0 de 10 sacos registrados')).not.toHaveLength(0);
  await act(async () => second.unmount());
});

it('moves through the cells with ✓, closes the keyboard on the last one and picks the date (CL-ST25)', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  const input = (n: number) => root.root.findAll((node) => node.props.accessibilityLabel === `Peso del saco ${n} (kg)` && typeof node.props.onSubmitEditing === 'function')[0]!;
  expect(input(1).props).toMatchObject({ returnKeyType: 'next', submitBehavior: 'submit', autoCorrect: false });
  expect(input(10).props).toMatchObject({ returnKeyType: 'done', submitBehavior: 'blurAndSubmit' });
  const dismiss = jest.spyOn(Keyboard, 'dismiss');
  await act(async () => { input(10).props.onSubmitEditing(); });
  expect(dismiss).toHaveBeenCalled();
  dismiss.mockRestore();
  // The date is chosen with a tap: «Mañana» or a day of the calendar.
  const today = new Date();
  await act(async () => { press(root, `Fecha despacho: ${formatLocalDateInput(today)}`); });
  expect(root.root.findAllByType(DateDialog)).toHaveLength(1);
  await act(async () => { root.root.findAll((node) => node.props.accessibilityRole === 'button' && typeof node.props.onPress === 'function' && [node.props.children].flat().some((child: any) => child?.props?.children === 'Mañana'))[0]!.props.onPress(); });
  const tomorrow = formatLocalDateInput(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1));
  expect(root.root.findAllByType(DateDialog)).toHaveLength(0);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === `Fecha despacho: ${tomorrow}`)).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('writes a variety that is not in the list and reuses one that is (CL-ST26)', async () => {
  jest.mocked(createCatalogItem).mockClear();
  jest.mocked(createCatalogItem).mockResolvedValue({ id: 'huayro', name: 'Huayro' });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await act(async () => { press(root, 'Añadir lote o variedad'); });
  const write = root.root.findByType(LotDialog).props.onCreateChoice;
  expect(write).toEqual(expect.any(Function));
  await act(async () => { expect(await write('variety', ' peruanita ')).toEqual({ id: 'peruanita', label: 'Peruanita' }); });
  expect(createCatalogItem).not.toHaveBeenCalled();
  await act(async () => { expect(await write('variety', 'Huayro')).toEqual({ id: 'huayro', label: 'Huayro' }); });
  expect(createCatalogItem).toHaveBeenCalledWith('test-token', 'varieties', { name: 'Huayro' });
  // The new variety is in the list from now on, for this lot and the next ones.
  expect(root.root.findByType(LotDialog).props.varieties).toContainEqual({ id: 'huayro', label: 'Huayro' });
  await act(async () => root.unmount());
});

it('edits variety and price of the active lot from ✎ (CL-ST23)', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(withChrome(<SaleFlowScreen />)); });
  await act(async () => { press(root, 'Editar o cambiar variedad y calidad'); });
  const lotDialog = root.root.findByType(LotDialog);
  expect(lotDialog.props.initial).toMatchObject({ varietyId: 'canchan', unitPrice: '' });
  await act(async () => { lotDialog.props.onCreate({ varietyId: 'peruanita', qualityId: null, originId: null, unitPrice: '1.80', plannedSacks: 10 }); });
  await weigh(root, ['50']);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Lote A: Peruanita, 1 saco')).not.toHaveLength(0);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote A: S/ 90.00')).not.toHaveLength(0);
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
