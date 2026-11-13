import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { Reception } from '@/domain/reception/reception';
import { clearInitialPurchaseDraft } from '@/domain/reception/initial-purchase-draft';
import { PurchaseFlowScreen } from '@/features/reception/screens/purchase-flow-screen';
import { getPurchaseSettlement, getReception, getSacks, loadReceptionCatalogs } from '@/services/api/reception-api';

// Spec 011 (RQ-ST13): on the tablet the purchase is one screen. These tests
// follow the operations it queues: the same four of the step by step flow, in
// the same order and with the same identities.
jest.mock('react-native', () => {
  const descriptors = Object.getOwnPropertyDescriptors(jest.requireActual('react-native'));
  delete descriptors.useWindowDimensions;
  return Object.defineProperties({ useWindowDimensions: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 1 })) }, descriptors);
});

const mockEnqueue = jest.fn(); const mockSendQueued = jest.fn(); const mockReplace = jest.fn();
// Stable identities: the flow reloads its catalogs when these change.
const mockInvalidate = jest.fn(); const mockRouter = { replace: mockReplace, back: jest.fn(), canGoBack: () => false }; const mockNavigation = { dispatch: jest.fn() }; const mockOperations: never[] = [];
let mockIdIndex = 0;
const mockIds = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-000000000005'];
const mockSession = { accessToken: 'test-token', expiresAt: '2099-01-01T00:00:00Z', user: { businessId: 'business', userId: 'user', username: 'Mayorista de prueba', role: 'wholesaler', expiresAt: '2099-01-01T00:00:00Z' } };
jest.mock('@/features/sync/sync-queue-provider', () => ({ useSyncQueue: () => ({ enqueue: mockEnqueue, sendQueued: mockSendQueued, operations: mockOperations, isLoadingQueue: false, queueError: null }) }));
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession, invalidateSession: mockInvalidate, isOfflineSession: false }) }));
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useNavigation: () => mockNavigation }));
jest.mock('expo-router/react-navigation', () => ({ usePreventRemove: jest.fn() }));
jest.mock('@/navigation/use-browser-traversal-guard', () => ({ useBrowserTraversalGuard: jest.fn() }));
jest.mock('@/services/api/reception-api', () => ({ getReception: jest.fn(), getSacks: jest.fn(), getPurchaseSettlement: jest.fn(), loadReceptionCatalogs: jest.fn() }));
jest.mock('@/domain/reception/reception', () => ({ ...jest.requireActual('@/domain/reception/reception'), createOperationId: () => mockIds[mockIdIndex++] }));
function mockScreen(screenKind: string) {
  return (props: object) => jest.requireActual('react').createElement('test-control', { ...props, screenKind });
}
jest.mock('@/features/reception/screens/purchase-sheet', () => ({ PurchaseSheet: mockScreen('sheet') }));
jest.mock('@/features/sales/components/lot-dialog', () => ({ LotDialog: mockScreen('lot') }));
jest.mock('@/services/api/catalog-api', () => ({ createCatalogItem: jest.fn() }));
jest.mock('@/features/reception/screens/reception-details-screen', () => ({ ReceptionDetailsScreen: mockScreen('details') }));
jest.mock('@/features/reception/screens/weighing-screen', () => ({ WeighingScreen: mockScreen('weighing') }));
jest.mock('@/features/reception/screens/settlement-screen', () => ({ SettlementScreen: mockScreen('settlement') }));
jest.mock('@/features/reception/screens/purchase-confirmation-screen', () => ({ PurchaseConfirmationScreen: mockScreen('confirmation') }));
jest.mock('@/features/catalog/screens/catalog-workspace', () => ({ OperationReferenceEditor: mockScreen('reference-editor') }));
jest.mock('@/features/catalog/components/characteristic-fields', () => ({ CharacteristicFields: mockScreen('characteristics') }));
jest.mock('@/features/catalog/components/operation-reference-actions', () => ({ OperationReferenceActions: mockScreen('reference-actions') }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, ChoiceDialog: control, ConfirmationDialog: control, FeedbackState: control, LoadingState: control };
});

const reception: Reception = { id: 'reception-id', providerId: 'provider-id', providerPhone: null, vehicleId: null, driverName: 'Conductor', receivedOn: '2026-11-09', state: 'draft', version: 0, expectedVarieties: [{ id: 'variety-id', name: 'Papa' }] };
const sack = { id: 'sack-id', sequence: 1, varietyId: 'variety-id', grossWeightKg: '100.000', tareKg: '0.000', netWeightKg: '100.000' };

beforeEach(() => {
  clearInitialPurchaseDraft();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks(); mockIdIndex = 0;
  mockEnqueue.mockResolvedValue({ status: 'pending' });
  mockSendQueued.mockImplementation(async (id: string) => ({ id, status: 'confirmed', centralReference: id === mockIds[0] ? 'reception-id' : id === mockIds[1] ? 'sack-id' : 'central-purchase' }));
  jest.mocked(loadReceptionCatalogs).mockResolvedValue({ providers: [{ id: 'provider-id', name: 'Proveedor', phone: null }], vehicles: [], varieties: [{ id: 'variety-id', name: 'Papa' }] });
  jest.mocked(getReception).mockReset().mockResolvedValueOnce(reception).mockResolvedValueOnce({ ...reception, state: 'weighing', version: 1 }).mockResolvedValue({ ...reception, state: 'weighed', version: 2 });
  jest.mocked(getSacks).mockResolvedValue([sack]);
  jest.mocked(getPurchaseSettlement).mockResolvedValue({ id: 'central-purchase', grossAmountCents: '25000', freightAmountCents: '0', advancesCents: '0', discountsCents: '0', liquidAmountCents: '25000', paymentMode: 'cash', state: 'confirmed', version: 1 });
});

const sheet = (root: ReactTestRenderer) => root.root.findAll((node) => node.props.screenKind === 'sheet')[0]!;
const lot = (root: ReactTestRenderer) => root.root.findAll((node) => node.props.screenKind === 'lot')[0]!;
const dialog = (root: ReactTestRenderer, title: string) => root.root.findAll((node) => node.props.title === title)[0]!;
const queued = () => mockEnqueue.mock.calls.map((call) => ({ id: call[0].id, type: call[0].type, path: call[0].path }));

async function open() {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseFlowScreen />); });
  return root;
}
async function fillDetails(root: ReactTestRenderer) {
  await act(async () => { sheet(root).props.onSelectProvider(); });
  await act(async () => { dialog(root, 'Seleccionar proveedor').props.onSelect({ id: 'provider-id', label: 'Proveedor' }); });
  await act(async () => { sheet(root).props.onChangeDetail('driverName', 'Conductor'); });
  await act(async () => { sheet(root).props.onAddVariety(); });
  await act(async () => { lot(root).props.onCreate({ varietyId: 'variety-id', qualityId: null, originId: null, unitPrice: '', plannedSacks: 10 }); });
}
async function addSack(root: ReactTestRenderer, gross = '100') {
  await act(async () => { sheet(root).props.onGrossChange(gross); });
  await act(async () => { sheet(root).props.onSaveSack(); await Promise.resolve(); });
}

it('shows one screen for the whole purchase and creates nothing until the first sack', async () => {
  const root = await open();
  expect(root.root.findAll((node) => ['details', 'weighing', 'settlement'].includes(node.props.screenKind))).toHaveLength(0);
  // CL-ST28: «Lote A» of the first variety is there from the start.
  expect(sheet(root).props).toMatchObject({ detailsLocked: false, weighingLocked: false, varieties: [{ id: 'variety-id', name: 'Papa' }], sacks: [] });
  await fillDetails(root);
  expect(sheet(root).props.varieties).toEqual([{ id: 'variety-id', name: 'Papa' }]);
  expect(sheet(root).props.activeVarietyId).toBe('variety-id');
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('creates the reception with the data typed above when the first sack is added, then the sack', async () => {
  const root = await open();
  await fillDetails(root);
  await addSack(root);
  expect(queued()).toEqual([
    { id: mockIds[0], type: 'reception.create', path: '/receptions' },
    { id: mockIds[1], type: 'reception.sack-add', path: '/receptions/reception-id/sacks' },
  ]);
  expect(mockEnqueue.mock.calls[0]![0].body).toMatchObject({ driverName: 'Conductor', expectedVarietyIds: ['variety-id'], providerId: 'provider-id' });
  expect(mockEnqueue.mock.calls[1]![0].body).toMatchObject({ expectedReceptionVersion: 0, grossWeightKg: '100', tareKg: '0', varietyId: 'variety-id' });
  expect(sheet(root).props).toMatchObject({ detailsLocked: true, gross: '', onAddVariety: undefined, onClear: undefined });
  expect(sheet(root).props.sacks).toEqual([expect.objectContaining({ id: 'sack-id', netDisplay: '100', sequence: 1 })]);
  await act(async () => { root.unmount(); });
});

it('rejects a bad weight or missing data before creating the reception', async () => {
  const root = await open();
  await fillDetails(root);
  await addSack(root, '50.5');
  expect(sheet(root).props.errorMessage).toBe('Ingresa el bruto y la tara en kilos enteros, sin decimales.');
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { sheet(root).props.onChangeDetail('driverName', ''); });
  await addSack(root, '50');
  expect(sheet(root).props.errorMessage).toBe('Completa fecha, proveedor, conductor y al menos una variedad.');
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('closes the weighing and settles in that order when the purchase is saved', async () => {
  const root = await open();
  await fillDetails(root);
  await addSack(root);
  // A weight still being typed must be added or cancelled first.
  await act(async () => { sheet(root).props.onGrossChange('51'); });
  await act(async () => { sheet(root).props.onSave(); });
  expect(sheet(root).props.errorMessage).toBe('Añade o cancela el peso que estás escribiendo antes de guardar la compra.');
  await act(async () => { sheet(root).props.onGrossChange(''); });
  // Without a price nothing is asked to the server.
  await act(async () => { sheet(root).props.onSave(); });
  expect(dialog(root, '¿Guardar la compra?').props.visible).toBe(false);
  await act(async () => { sheet(root).props.onChangeLot(sheet(root).props.lots[0].key, 'unitPrice', '2.50'); });
  await act(async () => { sheet(root).props.onSave(); });
  expect(dialog(root, '¿Guardar la compra?').props).toMatchObject({ confirmLabel: 'Guardar compra', visible: true });
  expect(dialog(root, '¿Guardar la compra?').props.message).toContain('Se cerrará el pesaje');
  expect(queued()).toHaveLength(2);
  await act(async () => { dialog(root, '¿Guardar la compra?').props.onConfirm(); await Promise.resolve(); });
  expect(queued().slice(2)).toEqual([
    { id: mockIds[2], type: 'reception.close', path: '/receptions/reception-id/close-weighing' },
    { id: mockIds[3], type: 'purchase.settle', path: '/purchases/receptions/reception-id/settlement' },
  ]);
  expect(mockEnqueue.mock.calls[2]![0].body).toEqual({ clientOperationId: mockIds[2], expectedReceptionVersion: 1 });
  expect(mockEnqueue.mock.calls[3]![0].body).toMatchObject({ clientOperationId: mockIds[3], expectedReceptionVersion: 2, paymentMode: 'cash', lots: [{ varietyId: 'variety-id', qualityId: null, priceBasis: 'kilogram', unitPriceCents: 250 }] });
  expect(getPurchaseSettlement).toHaveBeenCalledWith('test-token', 'reception-id');
  expect(root.root.findAll((node) => node.props.screenKind === 'confirmation')).not.toHaveLength(0);
  expect(mockReplace).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('does not settle when the weighing could not be closed', async () => {
  const root = await open();
  await fillDetails(root);
  await addSack(root);
  await act(async () => { sheet(root).props.onChangeLot(sheet(root).props.lots[0].key, 'unitPrice', '2.50'); });
  await act(async () => { sheet(root).props.onSave(); });
  mockEnqueue.mockRejectedValueOnce(new Error('Storage full'));
  await act(async () => { dialog(root, '¿Guardar la compra?').props.onConfirm(); await Promise.resolve(); });
  expect(queued().map((item) => item.type)).toEqual(['reception.create', 'reception.sack-add', 'reception.close']);
  expect(sheet(root).props).toMatchObject({ errorMessage: 'Storage full', weighingLocked: false });
  expect(root.root.findAll((node) => node.props.screenKind === 'confirmation')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it('keeps the whole purchase on the local identity when there is no connection', async () => {
  mockSendQueued.mockResolvedValueOnce({ id: mockIds[0], status: 'pending' });
  const root = await open();
  await fillDetails(root);
  await addSack(root);
  await act(async () => { sheet(root).props.onChangeLot(sheet(root).props.lots[0].key, 'unitPrice', '2.50'); });
  await act(async () => { sheet(root).props.onSave(); });
  await act(async () => { dialog(root, '¿Guardar la compra?').props.onConfirm(); await Promise.resolve(); });
  expect(queued()).toEqual([
    { id: mockIds[0], type: 'reception.create', path: '/receptions' },
    { id: mockIds[1], type: 'reception.sack-add', path: `/receptions/@${mockIds[0]}/sacks` },
    { id: mockIds[2], type: 'reception.close', path: `/receptions/@${mockIds[0]}/close-weighing` },
    { id: mockIds[3], type: 'purchase.settle', path: `/purchases/receptions/@${mockIds[0]}/settlement` },
  ]);
  expect(mockSendQueued).toHaveBeenCalledTimes(1);
  expect(mockReplace).toHaveBeenCalledWith('/sync-queue');
  expect(root.root.findAll((node) => node.props.screenKind === 'confirmation')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it('opens a closed weighing with the detail locked and only settles it', async () => {
  jest.mocked(getReception).mockReset().mockResolvedValue({ ...reception, id: 'saved-reception', state: 'weighed', version: 7 });
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseFlowScreen initialReceptionId="saved-reception" />); });
  expect(sheet(root).props).toMatchObject({ detailsLocked: true, weighingLocked: true });
  await act(async () => { sheet(root).props.onChangeLot(sheet(root).props.lots[0].key, 'unitPrice', '2.50'); });
  await act(async () => { sheet(root).props.onSave(); });
  expect(dialog(root, '¿Guardar la compra?').props.message).not.toContain('Se cerrará el pesaje');
  await act(async () => { dialog(root, '¿Guardar la compra?').props.onConfirm(); await Promise.resolve(); });
  expect(queued()).toEqual([{ id: mockIds[0], type: 'purchase.settle', path: '/purchases/receptions/saved-reception/settlement' }]);
  expect(mockEnqueue.mock.calls[0]![0].body.expectedReceptionVersion).toBe(7);
  await act(async () => { root.unmount(); });
});

it('clears the form before the reception exists', async () => {
  const root = await open();
  await fillDetails(root);
  await act(async () => { sheet(root).props.onClear(); });
  expect(sheet(root).props).toMatchObject({ varieties: [{ id: 'variety-id', name: 'Papa' }], details: expect.objectContaining({ driverName: '', providerName: '' }) });
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('adds the lot from the lot window with its price and writes a new variety (CL-ST27)', async () => {
  const { createCatalogItem } = jest.requireMock('@/services/api/catalog-api');
  createCatalogItem.mockReset().mockResolvedValue({ id: 'huayro', name: 'Huayro' });
  const root = await open();
  await act(async () => { sheet(root).props.onAddVariety(); });
  expect(lot(root).props).toMatchObject({ visible: true, askPlanned: false });
  await act(async () => { expect(await lot(root).props.onCreateChoice('variety', ' papa ')).toEqual({ id: 'variety-id', label: 'Papa' }); });
  expect(createCatalogItem).not.toHaveBeenCalled();
  await act(async () => { expect(await lot(root).props.onCreateChoice('variety', 'Huayro')).toEqual({ id: 'huayro', label: 'Huayro' }); });
  expect(createCatalogItem).toHaveBeenCalledWith('test-token', 'varieties', { name: 'Huayro' });
  await act(async () => { lot(root).props.onCreate({ varietyId: 'huayro', qualityId: null, originId: null, unitPrice: '1.50', plannedSacks: 10 }); });
  expect(lot(root).props.visible).toBe(false);
  expect(sheet(root).props.varieties).toEqual([{ id: 'huayro', name: 'Huayro' }, { id: 'variety-id', name: 'Papa' }]);
  expect(sheet(root).props.values.lots['huayro|']).toMatchObject({ unitPrice: '1.50' });
  expect(mockEnqueue).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('quick load registers ten sacks of 50 kg one after another (CL-ST27)', async () => {
  const root = await open();
  await fillDetails(root);
  jest.mocked(getReception).mockReset().mockImplementation(async () => ({ ...reception, state: 'weighing', version: jest.mocked(getReception).mock.calls.length }));
  await act(async () => { await sheet(root).props.onQuickLoad(); await new Promise((resolve) => setTimeout(resolve, 0)); });
  const adds = mockEnqueue.mock.calls.filter((call) => call[0].type === 'reception.sack-add');
  expect(adds).toHaveLength(10);
  expect(adds.every((call) => call[0].body.grossWeightKg === adds[0]![0].body.grossWeightKg && Number(call[0].body.grossWeightKg) === 50)).toBe(true);
  expect(adds.map((call) => call[0].body.expectedReceptionVersion)).toEqual([...adds.keys()].map((index) => index + 1));
  await act(async () => { root.unmount(); });
});

describe('purchase equal to the sale (CL-ST28)', () => {
  it('registers a typed provider with the first sack and suggests the known ones', async () => {
    const { createCatalogItem } = jest.requireMock('@/services/api/catalog-api');
    createCatalogItem.mockReset().mockResolvedValue({ id: 'provider-new', name: 'Comunidad Nueva', phone: '988' });
    const root = await open();
    await act(async () => { sheet(root).props.onProviderNameChange('prov'); });
    expect(sheet(root).props.providerSuggestions).toEqual([{ id: 'provider-id', label: 'Proveedor' }]);
    await act(async () => { sheet(root).props.onProviderNameChange('Comunidad Nueva'); });
    await act(async () => { sheet(root).props.onChangeDetail('providerPhone', '988'); });
    expect(sheet(root).props.providerNotice).toBe('Proveedor nuevo: se registrará al añadir el primer saco.');
    await act(async () => { sheet(root).props.onChangeDetail('driverName', 'Conductor'); });
    await addSack(root);
    expect(createCatalogItem).toHaveBeenCalledWith('test-token', 'providers', { name: 'Comunidad Nueva', phone: '988' });
    expect(mockEnqueue.mock.calls[0]![0].body).toMatchObject({ providerId: 'provider-new', expectedVarietyIds: ['variety-id'] });
    await act(async () => { root.unmount(); });
  });

  it('voids a weighed sack with its reason instead of deleting it', async () => {
    const root = await open();
    await fillDetails(root);
    await addSack(root);
    jest.mocked(getReception).mockResolvedValue({ ...reception, state: 'weighing', version: 2 });
    jest.mocked(getSacks).mockResolvedValue([{ ...sack, voidedAt: '2026-11-12T10:00:00Z' }] as never);
    await act(async () => { sheet(root).props.onVoidSack('sack-id'); });
    const confirm = dialog(root, '¿Anular el saco?');
    expect(confirm.props.visible).toBe(true);
    await act(async () => { confirm.props.onConfirm(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    const voided = mockEnqueue.mock.calls.find((call) => call[0].type === 'reception.sack-void')![0];
    expect(voided).toMatchObject({ method: 'POST', path: '/receptions/reception-id/sacks/sack-id/void', body: { reason: 'Saco retirado al pesar la compra' } });
    expect(sheet(root).props.sacks).toEqual([]);
    expect(sheet(root).props.nextSequence).toBe(2);
    await act(async () => { root.unmount(); });
  });

  it('edits the lot from ✎ and treats a freight rate of 0 as no freight', async () => {
    const root = await open();
    await fillDetails(root);
    await act(async () => { sheet(root).props.onEditLot(); });
    expect(lot(root).props).toMatchObject({ visible: true, lockVariety: false, initial: { varietyId: 'variety-id', unitPrice: '' } });
    await act(async () => { lot(root).props.onCreate({ varietyId: 'variety-id', qualityId: null, originId: null, unitPrice: '2.00', plannedSacks: 10 }); });
    expect(sheet(root).props.values.lots['variety-id|']).toMatchObject({ unitPrice: '2.00' });
    await addSack(root);
    await act(async () => { sheet(root).props.onChange('freightBasis', 'sack'); });
    expect(sheet(root).props.preview).toMatchObject({ kind: 'ready', freightCents: '0' });
    await act(async () => { sheet(root).props.onChange('freightRate', '1.00'); });
    expect(sheet(root).props.preview).toMatchObject({ kind: 'ready', freightCents: '100' });
    // Once the reception exists the variety of the lot is fixed.
    await act(async () => { sheet(root).props.onEditLot(); });
    expect(lot(root).props.lockVariety).toBe(true);
    await act(async () => { root.unmount(); });
  });
});

describe('found in the purchase simulation (CL-ST29)', () => {
  it('keeps the weight typed while the previous sack is saving and saves it right after', async () => {
    const root = await open();
    await fillDetails(root);
    await act(async () => { sheet(root).props.onGrossChange('52'); });
    let first!: Promise<void>;
    act(() => { first = sheet(root).props.onSaveSack(); });
    await act(async () => { sheet(root).props.onGrossChange('53'); });
    await act(async () => { sheet(root).props.onSaveSack(); });
    await act(async () => { await first; await new Promise((resolve) => setTimeout(resolve, 0)); });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
    const adds = mockEnqueue.mock.calls.filter((call) => call[0].type === 'reception.sack-add').map((call) => call[0].body.grossWeightKg);
    expect(adds).toEqual(['52', '53']);
    expect(sheet(root).props.gross).toBe('');
    await act(async () => { root.unmount(); });
  });

  it('labels the lots as the server does, before and after the reception exists', async () => {
    jest.mocked(loadReceptionCatalogs).mockResolvedValue({ providers: [{ id: 'provider-id', name: 'Proveedor', phone: null }], vehicles: [], varieties: [{ id: 'a-first', name: 'Amarilla' }, { id: 'variety-id', name: 'Papa' }] });
    jest.mocked(getReception).mockReset().mockResolvedValue({ ...reception, expectedVarieties: [{ id: 'a-first', name: 'Amarilla' }, { id: 'variety-id', name: 'Papa' }] });
    const root = await open();
    await act(async () => { sheet(root).props.onSelectProvider(); });
    await act(async () => { dialog(root, 'Seleccionar proveedor').props.onSelect({ id: 'provider-id', label: 'Proveedor' }); });
    await act(async () => { sheet(root).props.onChangeDetail('driverName', 'Conductor'); });
    await act(async () => { sheet(root).props.onEditLot(); });
    await act(async () => { lot(root).props.onCreate({ varietyId: 'variety-id', qualityId: null, originId: null, unitPrice: '', plannedSacks: 10 }); });
    await act(async () => { sheet(root).props.onAddVariety(); });
    await act(async () => { lot(root).props.onCreate({ varietyId: 'a-first', qualityId: null, originId: null, unitPrice: '', plannedSacks: 10 }); });
    expect(sheet(root).props.varieties.map((item: { id: string }) => item.id)).toEqual(['a-first', 'variety-id']);
    await act(async () => { sheet(root).props.onSelectVariety('variety-id'); });
    await addSack(root);
    expect(sheet(root).props.varieties.map((item: { id: string }) => item.id)).toEqual(['a-first', 'variety-id']);
    await act(async () => { root.unmount(); });
  });
});
