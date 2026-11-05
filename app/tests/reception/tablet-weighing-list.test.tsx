import React from 'react';
import { FlatList } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TabletWeighingWorkspace } from '@/features/reception/screens/tablet-weighing-workspace';
import type { WeighingScreenProps } from '@/features/reception/screens/weighing-screen';
import { findSackIndex, sackRowHeight } from '@/features/reception/sack-list';

jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: { children?: React.ReactNode }) => react.createElement('test-control', props, props.children);
  return { AppScreen: control, AppButton: control, FeedbackState: control, FormField: control, SelectionField: control };
});
jest.mock('@/ui/components/use-keyboard-scroll-focus', () => ({ useKeyboardScrollFocus: () => ({ keyboardInset: 0 }) }));

const entries = Array.from({ length: 250 }, (_, index) => ({ id: `sack-${index + 1}`, sequence: index + 1, varietyName: 'Canchán', weightDisplay: '50 kg netos' }));
function props(overrides: Partial<WeighingScreenProps> = {}): WeighingScreenProps {
  return {
    currentGrossWeight: '', currentTare: '0', selectedVariety: 'Canchán', entries,
    summary: { sackCountDisplay: '250', totalWeightDisplay: '12500 kg', averageWeightDisplay: '50.0 kg' },
    onGrossWeightChange: jest.fn(), onTareChange: jest.fn(), onAddSack: jest.fn(), onContinue: jest.fn(), onEditEntry: jest.fn(), ...overrides,
  };
}
const mounted: ReactTestRenderer[] = [];
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });
afterEach(async () => { await act(async () => { for (const root of mounted.splice(0)) root.unmount(); }); jest.restoreAllMocks(); });

async function render(overrides: Partial<WeighingScreenProps> = {}) {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<TabletWeighingWorkspace {...props(overrides)} />); mounted.push(root); });
  return root;
}
const rows = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.accessibilityLabel === 'string' && node.props.accessibilityLabel.startsWith('Corregir saco'));

it('keeps 250 sacks in a virtualised list with fixed rows and the totals outside it', async () => {
  const root = await render();
  const list = root.root.findByType(FlatList);
  expect(list.props.data).toHaveLength(250);
  expect(list.props.getItemLayout(entries, 199)).toEqual({ length: sackRowHeight, offset: sackRowHeight * 199, index: 199 });
  expect(rows(root).length).toBeGreaterThan(0);
  expect(rows(root).length).toBeLessThan(250);
  expect(root.root.findAll((node) => node.props.children === '12500 kg')).not.toHaveLength(0);
});

it('jumps to the typed sack and marks it', async () => {
  const scroll = jest.spyOn(FlatList.prototype, 'scrollToIndex').mockImplementation(() => undefined);
  const root = await render();
  const field = () => root.root.findAll((node) => node.props.label === 'Ir al saco' && node.props.onChangeText)[0]!;
  await act(async () => { field().props.onChangeText('200'); });
  await act(async () => { root.root.findAll((node) => node.props.accessibilityLabel === 'Ir al saco' && node.props.onPress)[0]!.props.onPress(); });
  expect(scroll).toHaveBeenCalledWith({ index: 199, animated: true, viewPosition: 0.3 });
  await act(async () => { field().props.onChangeText('300'); });
  await act(async () => { field().props.onSubmitEditing(); });
  expect(field().props.error).toBe('No hay un saco 300 vigente.');
  expect(scroll).toHaveBeenCalledTimes(1);
});

it('finds sacks by their number, not their position', () => {
  const gaps = [{ id: 'a', sequence: 2, varietyName: 'Papa', weightDisplay: '' }, { id: 'b', sequence: 4, varietyName: 'Papa', weightDisplay: '' }];
  expect(findSackIndex(gaps, '4')).toBe(1);
  expect(findSackIndex(gaps, '3')).toBe(-1);
  expect(findSackIndex(gaps, 'x')).toBeNull();
});
