import React, { useState } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { calculatePurchasePreview, emptyLotDraft, groupPurchaseLots } from '@/domain/reception/purchase-preview';
import type { ReceptionSack } from '@/domain/reception/reception';
import { PurchaseSheet, sheetColumns, sheetRowHeight, type PurchaseSheetProps, type SheetSack } from '@/features/reception/screens/purchase-sheet';
import type { SettlementDraft } from '@/features/reception/screens/settlement-screen';

const mockBottomNav = jest.fn();
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/ui/navigation/app-chrome', () => ({ useBottomNav: (options: object) => mockBottomNav(options) }));
jest.mock('@/ui/navigation/app-header', () => ({ AppHeader: (props: object) => jest.requireActual('react').createElement('test-header', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: { children?: React.ReactNode }) => react.createElement('test-control', props, props.children);
  return { AppButton: control, AppCard: control, AppScreen: control, FeedbackState: control, FormField: control, SelectionField: control };
});

// Spec 011 (RQ-ST13, CL-ST11, CL-ST17): the purchase on one screen.
const initial: SettlementDraft = { advances: '0', discounts: '0', freightBasis: 'none', freightRate: '0', freightChargedTo: 'provider', installments: [], paymentMode: 'cash', lots: {} };
const one: ReceptionSack[] = [{ id: 'sack', sequence: 1, varietyId: 'v1', grossWeightKg: '51', tareKg: '1', netWeightKg: '50' }];
const cells = (count: number, varietyId = 'v1', start = 1): SheetSack[] =>
  Array.from({ length: count }, (_, index) => ({ id: `sack-${start + index}`, sequence: start + index, varietyId, netDisplay: '50', detail: 'Bruto 50 kg, tara 0 kg.' }));

const handlers = {
  onAddVariety: jest.fn(), onBack: jest.fn(), onCancelEdit: jest.fn(), onChangeDetail: jest.fn(), onClear: jest.fn(), onEditSack: jest.fn(), onGoHome: jest.fn(),
  onGrossChange: jest.fn(), onSave: jest.fn(), onSaveSack: jest.fn(), onSelectProvider: jest.fn(), onSelectVariety: jest.fn(), onSelectVehicle: jest.fn(), onTareChange: jest.fn(),
};

function Harness(overrides: Partial<PurchaseSheetProps>) {
  const [values, setValues] = useState(initial);
  const lots = groupPurchaseLots(one, () => 'Canchán')!;
  return (
    <PurchaseSheet
      details={{ date: '2026-11-09', driverName: 'Pedro', expectedVarieties: 'Canchán', providerName: 'Aurelio', providerPhone: '', vehiclePlate: '' }}
      detailsLocked
      varieties={[{ id: 'v1', name: 'Canchán' }, { id: 'v2', name: 'Peruanita' }]}
      activeVarietyId="v1"
      sacks={cells(1)}
      weighingLocked={false}
      gross=""
      tare="0"
      editingSequence={null}
      lots={lots}
      values={values}
      preview={calculatePurchasePreview(lots, values)}
      onChange={(field, value) => setValues((current) => ({ ...current, [field]: value }))}
      onChangeLot={(key, field, value) => setValues((current) => ({ ...current, lots: { ...current.lots, [key]: { ...(current.lots[key] ?? emptyLotDraft), [field]: value } } }))}
      onAddInstallment={() => setValues((current) => ({ ...current, installments: [...current.installments, { id: 'installment', dueOn: '', amount: '' }] }))}
      onChangeInstallment={(id, field, value) => setValues((current) => ({ ...current, installments: current.installments.map((item) => (item.id === id ? { ...item, [field]: value } : item)) }))}
      onRemoveInstallment={(id) => setValues((current) => ({ ...current, installments: current.installments.filter((item) => item.id !== id) }))}
      {...handlers}
      {...overrides}
    />
  );
}

const mounted: ReactTestRenderer[] = [];
beforeEach(() => {
  jest.clearAllMocks();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});
afterEach(async () => { await act(async () => { for (const root of mounted.splice(0)) root.unmount(); }); });

async function render(overrides: Partial<PurchaseSheetProps> = {}) {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<Harness {...overrides} />); mounted.push(root); });
  return root;
}
const button = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]!;
const input = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onChangeText === 'function')[0]!;
const control = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.label === label)[0]!;
const labelled = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => typeof node.type === 'string' && node.props.accessibilityLabel === label);
const drawnSacks = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && /^sack-\d+$/.test(String(node.props.testID ?? ''))).map((node) => Number(String(node.props.testID).slice(5)));
const nextAction = () => mockBottomNav.mock.calls.at(-1)![0].next as { label: string; disabled: boolean; onPress: () => void };

describe('grid of sacks', () => {
  it('keeps 250 sacks fluid: five per row, fixed rows and only the visible ones drawn', async () => {
    const root = await render({ sacks: cells(250) });
    const drawn = drawnSacks(root);
    expect(drawn.slice(0, sheetColumns)).toEqual([1, 2, 3, 4, 5]);
    expect(drawn.length).toBeGreaterThan(0);
    expect(drawn.length).toBeLessThan(100);
    // The spacers keep the height of the 50 rows of sacks plus the row of the next one.
    const grid = root.root.findAll((node) => node.props.testID === 'sack-grid' && typeof node.props.onScroll === 'function')[0]!;
    const spacers = grid.findAll((node) => typeof node.type === 'string' && typeof node.props.style?.height === 'number' && node.props.children === undefined);
    const drawnRows = drawn.length / sheetColumns;
    expect(spacers.reduce((total, node) => total + node.props.style.height, 0)).toBe((51 - drawnRows) * sheetRowHeight);
    expect(labelled(root, 'Lote A: Canchán, 250 sacos')).not.toHaveLength(0);
    // Scrolling moves the window.
    await act(async () => { grid.props.onScroll({ nativeEvent: { contentOffset: { y: 40 * sheetRowHeight } } }); });
    expect(drawnSacks(root)).toContain(201);
    expect(drawnSacks(root)).not.toContain(1);
  });

  it('jumps to the typed sack, marks it and changes the lot when the sack is in another one', async () => {
    const root = await render({ sacks: [...cells(250), ...cells(3, 'v2', 251)] });
    await act(async () => { input(root, 'Número del saco').props.onChangeText('200'); });
    await act(async () => { button(root, 'Ir al saco').props.onPress(); });
    expect(drawnSacks(root)).toContain(200);
    await act(async () => { input(root, 'Número del saco').props.onChangeText('252'); });
    await act(async () => { input(root, 'Número del saco').props.onSubmitEditing(); });
    expect(handlers.onSelectVariety).toHaveBeenCalledWith('v2');
    await act(async () => { input(root, 'Número del saco').props.onChangeText('300'); });
    await act(async () => { button(root, 'Ir al saco').props.onPress(); });
    expect(root.root.findAll((node) => node.props.children === 'No hay un saco 300 vigente.')).not.toHaveLength(0);
    expect(handlers.onSelectVariety).toHaveBeenCalledTimes(1);
  });

  it('shows the gross weight in the cell and corrects it in place with the tare of the capture bar', async () => {
    const root = await render({ sacks: cells(7).map((sack) => ({ ...sack, grossDisplay: '51' })) });
    // CL-ST20: the cell shows the gross weight as typed, like the mockup.
    expect(root.root.findAll((node) => typeof node.type === 'string' && node.props.children === '51')).toHaveLength(7);
    const cell = button(root, 'Saco 7: 50 kilos netos. Bruto 50 kg, tara 0 kg.');
    await act(async () => { cell.props.onPress(); });
    expect(handlers.onEditSack).toHaveBeenCalledWith('sack-7');
    await act(async () => { root.update(<Harness sacks={cells(7)} editingSequence={7} gross="51" tare="1" />); });
    expect(root.root.findAll((node) => node.props.children === 'Guardar corrección del saco 7')).not.toHaveLength(0);
    await act(async () => { button(root, 'Guardar corrección').props.onPress(); });
    expect(handlers.onSaveSack).toHaveBeenCalledTimes(1);
    await act(async () => { button(root, 'Cancelar corrección').props.onPress(); });
    expect(handlers.onCancelEdit).toHaveBeenCalledTimes(1);
  });

  it('does not add a sack without a weight or a variety, and locks the detail once the weighing is closed', async () => {
    const root = await render();
    expect(button(root, 'Añadir saco').props.disabled).toBe(true);
    await act(async () => { root.update(<Harness gross="52" />); });
    expect(button(root, 'Añadir saco').props.disabled).toBe(false);
    await act(async () => { input(root, 'Peso bruto (kg)').props.onSubmitEditing(); });
    expect(handlers.onSaveSack).toHaveBeenCalledTimes(1);
    await act(async () => { root.update(<Harness gross="52" varieties={[]} sacks={[]} />); });
    expect(button(root, 'Añadir saco').props.disabled).toBe(true);
    await act(async () => { root.update(<Harness weighingLocked />); });
    expect(root.root.findAll((node) => node.props.testID === 'sheet-capture')).toHaveLength(0);
    expect(button(root, 'Saco 1: 50 kilos netos. Bruto 50 kg, tara 0 kg.').props.disabled).toBe(true);
  });
});

describe('lots, freight and settlement on the same screen', () => {
  it('recalculates provisional money for kilogram and sack bases and saves only when it is ready', async () => {
    const root = await render();
    expect(nextAction()).toMatchObject({ label: 'Guardar compra', disabled: true });
    expect(button(root, 'Guardar compra').props.disabled).toBe(true);
    await act(async () => { input(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
    expect(labelled(root, 'Importe del lote A: S/ 125.00')).not.toHaveLength(0);
    expect(labelled(root, 'Total neto a liquidar: S/ 125.00')).not.toHaveLength(0);
    await act(async () => { button(root, 'Lote A: por saco').props.onPress(); });
    expect(labelled(root, 'Total neto a liquidar: S/ 2.50')).not.toHaveLength(0);
    expect(handlers.onSave).not.toHaveBeenCalled();
    expect(nextAction().disabled).toBe(false);
    await act(async () => { button(root, 'Guardar compra').props.onPress(); });
    await act(async () => { nextAction().onPress(); });
    expect(handlers.onSave).toHaveBeenCalledTimes(2);
  });

  it('removes a stale total and blocks saving when deductions exceed the gross amount', async () => {
    const root = await render();
    await act(async () => { input(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
    await act(async () => { input(root, 'Otros descuentos (S/)').props.onChangeText('126'); });
    expect(labelled(root, 'Total neto a liquidar: S/ 125.00')).toHaveLength(0);
    expect(labelled(root, 'Total neto a liquidar: Pendiente')).not.toHaveLength(0);
    expect(button(root, 'Guardar compra').props.disabled).toBe(true);
    expect(nextAction().disabled).toBe(true);
  });

  it('edits credit installments in the summary through the same draft', async () => {
    const root = await render();
    await act(async () => { button(root, 'Crédito').props.onPress(); });
    await act(async () => { control(root, 'Agregar cuota').props.onPress(); });
    await act(async () => { control(root, 'Vence el').props.onChangeText('2030-03-01'); control(root, 'Importe (S/)').props.onChangeText('125'); });
    expect(root.root.findByType(PurchaseSheet).props.values).toMatchObject({ paymentMode: 'credit', installments: [{ id: 'installment', dueOn: '2030-03-01', amount: '125' }] });
    expect(root.root.findAll((node) => node.props.children === 'Saldo a crédito, en cuotas')).not.toHaveLength(0);
  });

  it('shows freight paid by the wholesaler as information without deducting it', async () => {
    const root = await render();
    await act(async () => { input(root, 'Precio por kilogramo, lote A (S/)').props.onChangeText('2.50'); });
    await act(async () => { button(root, 'Flete: por sacos').props.onPress(); });
    await act(async () => { input(root, 'Tarifa de flete (S/)').props.onChangeText('5'); });
    expect(labelled(root, 'Subtotal de flete: S/ 5.00')).not.toHaveLength(0);
    expect(labelled(root, 'Total neto a liquidar: S/ 120.00')).not.toHaveLength(0);
    await act(async () => { button(root, 'Lo paga el Mayorista').props.onPress(); });
    expect(labelled(root, 'Flete a cargo del Mayorista (no se descuenta): S/ 5.00')).not.toHaveLength(0);
    expect(labelled(root, 'Total neto a liquidar: S/ 125.00')).not.toHaveLength(0);
  });

  it('locks the provider data once the reception exists and offers Limpiar registro only before', async () => {
    const root = await render();
    expect(control(root, 'Nombre del proveedor / productor').props.disabled).toBe(true);
    expect(control(root, 'Conductor').props.editable).toBe(false);
    await act(async () => { root.update(<Harness detailsLocked={false} />); });
    expect(control(root, 'Nombre del proveedor / productor').props.disabled).toBe(false);
    await act(async () => { button(root, 'Limpiar registro').props.onPress(); button(root, 'Añadir lote o variedad').props.onPress(); });
    expect(handlers.onClear).toHaveBeenCalledTimes(1);
    expect(handlers.onAddVariety).toHaveBeenCalledTimes(1);
    await act(async () => { root.update(<Harness onClear={undefined} onAddVariety={undefined} />); });
    expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Limpiar registro')).toHaveLength(0);
    expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Añadir lote o variedad')).toHaveLength(0);
  });

  it('keeps «Añadir lote» visible but disabled after the first sack and lists varieties without sacks (CL-ST21)', async () => {
    const root = await render({ onAddVariety: undefined, addVarietyLockedReason: 'Las variedades se eligen antes del primer saco.' });
    const add = root.root.findAll((node) => node.props.accessibilityLabel === 'Añadir lote o variedad' && typeof node.props.disabled === 'boolean')[0]!;
    expect(add.props.disabled).toBe(true);
    expect(add.props.accessibilityHint).toBe('Las variedades se eligen antes del primer saco.');
    expect(labelled(root, 'Peruanita: sin sacos, S/ 0.00')).not.toHaveLength(0);
    expect(labelled(root, 'Canchán: sin sacos, S/ 0.00')).toHaveLength(0);
  });

  it('never draws a scale, an automatic load or the removal of a sack', async () => {
    const root = await render({ sacks: cells(10) });
    expect(JSON.stringify(root.toJSON())).not.toMatch(/balanza|báscula|carga rápida|quitar lote|eliminar/i);
  });
});
