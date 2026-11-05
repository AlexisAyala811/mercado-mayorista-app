import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { FlatList, Modal, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { TabletSettlementWorkspace } from '@/features/reception/screens/tablet-settlement-workspace';
import { SettlementScreen, type SettlementDraft } from '@/features/reception/screens/settlement-screen';
import { calculatePurchasePreview, emptyLotDraft, groupPurchaseLots } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';

jest.mock('react-native', () => {
  const descriptors = Object.getOwnPropertyDescriptors(jest.requireActual('react-native'));
  delete descriptors.useWindowDimensions;
  return Object.defineProperties({ useWindowDimensions: jest.fn(() => ({ width: 1280, height: 800, scale: 1, fontScale: 2 })) }, descriptors);
});

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('@/ui/components/use-keyboard-scroll-focus', () => ({ useKeyboardScrollFocus: () => ({ keyboardInset: 0 }) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, AppButton: control, AppCard: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control, StepProgress: control };
});

// Load React Native's lazy component modules before timing user interactions.
void [FlatList, Modal, ScrollView, Text, View];
const mounted: ReactTestRenderer[] = [];
afterEach(async () => { await act(async () => { for (const root of mounted.splice(0)) root.unmount(); }); });

const mockSubmit = jest.fn();
const initial: SettlementDraft = { advances: '0', discounts: '0', freightBasis: 'none', freightRate: '0', freightChargedTo: 'provider', installments: [], paymentMode: 'cash', lots: {} };
const sacks: ReceptionSack[] = [{ id: 'sack', sequence: 1, varietyId: 'variety', grossWeightKg: '51', tareKg: '1', netWeightKg: '50' }];
const lots = groupPurchaseLots(sacks, () => 'Papa')!;
function Harness({ compact = false }: { compact?: boolean } = {}) {
  const Workspace = compact ? SettlementScreen : TabletSettlementWorkspace;
  const [values, setValues] = useState(initial);
  return <Workspace sacks={sacks} lots={lots} preview={calculatePurchasePreview(lots, values)} onChangeLot={(key, field, value) => setValues(current => ({ ...current, lots: { ...current.lots, [key]: { ...(current.lots[key] ?? emptyLotDraft), [field]: value } } }))} sackEntries={[{ id: 'sack', sequence: 1, varietyName: 'Papa', weightDisplay: '50.000 kg' }]} values={values} onSubmit={mockSubmit} onChange={(field, value) => setValues(current => ({ ...current, [field]: value }))} onAddInstallment={() => setValues(current => ({ ...current, installments: [...current.installments, { id: 'installment', dueOn: '', amount: '' }] }))} onChangeInstallment={(id, field, value) => setValues(current => ({ ...current, installments: current.installments.map(item => item.id === id ? { ...item, [field]: value } : item) }))} onRemoveInstallment={(id) => setValues(current => ({ ...current, installments: current.installments.filter(item => item.id !== id) }))} />;
}
beforeEach(() => { mockSubmit.mockClear(); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
const control = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.props.label === label)[0];

it('keeps compact settlement money guarded and removes an invalidated preview at enlarged text size', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness compact />); mounted.push(root); });
  expect(useWindowDimensions()).toMatchObject({ width: 1280, fontScale: 2 });
  expect(root.root.findAllByType(TabletSettlementWorkspace)).toHaveLength(0);
  expect(control(root, 'Confirmar liquidación').props.disabled).toBe(true);
  await act(async () => { control(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 125.00')).not.toHaveLength(0);
  expect(control(root, 'Confirmar liquidación').props.disabled).toBe(false);
  await act(async () => { control(root, 'Otros descuentos (S/)').props.onChangeText('126'); });
  expect(control(root, 'Confirmar liquidación').props.disabled).toBe(true);
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 125.00')).toHaveLength(0);
  expect(mockSubmit).not.toHaveBeenCalled();
});

it('opens immutable sack detail and returns to the same compact settlement draft without submitting', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness compact />); mounted.push(root); });
  await act(async () => { control(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
  await act(async () => { control(root, 'Ver pesaje cerrado (1 saco)').props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  const detail = root.root.findByType(FlatList);
  expect(detail.props.data).toEqual([{ id: 'sack', sequence: 1, varietyName: 'Papa', weightDisplay: '50.000 kg' }]);
  expect(detail.props.renderItem({ item: detail.props.data[0] }).props).toMatchObject({ title: 'Saco 1 · Papa', description: '50.000 kg' });
  await act(async () => { control(root, 'Volver a liquidación').props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(false);
  expect(control(root, 'Precio por kilogramo, lote A (S/)').props.value).toBe('2.50');
  expect(mockSubmit).not.toHaveBeenCalled();
});

it('recalculates provisional money for kilogram/sack bases without submitting during edits', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness />); mounted.push(root); });
  expect(control(root, 'Confirmar liquidación').props.disabled).toBe(true);
  await act(async () => { control(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 125.00')).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Lote A: por saco')[0].props.onPress(); });
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 2.50')).not.toHaveLength(0);
  expect(mockSubmit).not.toHaveBeenCalled();
  await act(async () => { control(root, 'Confirmar liquidación').props.onPress(); });
  expect(mockSubmit).toHaveBeenCalledTimes(1);
});

it('removes a stale preview and blocks confirmation when deductions exceed gross', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness />); mounted.push(root); });
  await act(async () => { control(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
  await act(async () => { control(root, 'Otros descuentos (S/)').props.onChangeText('126'); });
  expect(control(root, 'Confirmar liquidación').props.disabled).toBe(true);
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 125.00')).toHaveLength(0);
  expect(mockSubmit).not.toHaveBeenCalled();
});

it('edits credit installments through the same controlled draft and returns to the summary', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness />); mounted.push(root); });
  await act(async () => { control(root, 'Forma de pago: Contado').props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  await act(async () => { control(root, 'Crédito').props.onPress(); });
  await act(async () => { control(root, 'Agregar cuota').props.onPress(); });
  await act(async () => { control(root, 'Vence el').props.onChangeText('2030-03-01'); control(root, 'Importe (S/)').props.onChangeText('125'); });
  await act(async () => { control(root, 'Volver al resumen').props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(false);
  expect(control(root, 'Forma de pago: Crédito · 1 cuota')).toBeDefined();
  expect(root.root.findByType(TabletSettlementWorkspace).props.values.installments[0]).toEqual({ id: 'installment', dueOn: '2030-03-01', amount: '125' });
  expect(mockSubmit).not.toHaveBeenCalled();
});

it('shows freight paid by the wholesaler as information without deducting it', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(<Harness />); mounted.push(root); });
  expect(root.root.findAll(node => node.props.accessibilityRole === 'header' && node.props.children === 'Lote A · Papa · Calidad no informada')).not.toHaveLength(0);
  await act(async () => { control(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Flete: por saco')[0].props.onPress(); });
  await act(async () => { control(root, 'Tarifa de flete (S/)').props.onChangeText('5'); });
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 120.00')).not.toHaveLength(0);
  await act(async () => { control(root, 'Lo paga el Mayorista').props.onPress(); });
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Flete a cargo del Mayorista (informativo): S/ 5.00')).not.toHaveLength(0);
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Total líquido provisional: S/ 125.00')).not.toHaveLength(0);
  expect(mockSubmit).not.toHaveBeenCalled();
});
