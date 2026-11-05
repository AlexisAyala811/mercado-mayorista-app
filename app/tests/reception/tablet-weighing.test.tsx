import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { TabletWeighingWorkspace } from '@/features/reception/screens/tablet-weighing-workspace';
import type { WeighingScreenProps } from '@/features/reception/screens/weighing-screen';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const react = jest.requireActual('react');
  return { __esModule: true, default: ({ data, renderItem }: { data: object[]; renderItem: (entry: { item: object }) => React.ReactNode }) => react.createElement('test-list', null, data.map((item, index) => react.createElement(react.Fragment, { key: index }, renderItem({ item })))) };
});
jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, AppButton: control, FeedbackState: control, FormField: control, LoadingState: control, SelectionField: control };
});
jest.mock('@/ui/components/use-keyboard-scroll-focus', () => ({ useKeyboardScrollFocus: () => ({ keyboardInset: 0 }) }));

beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

function props(overrides: Partial<WeighingScreenProps> = {}): WeighingScreenProps {
  return {
    currentGrossWeight: '51', currentTare: '1', selectedVariety: 'Canchán',
    entries: [{ id: 'existing-sack', sequence: 2, varietyName: 'Canchán', weightDisplay: '50.000 kg' }],
    summary: { sackCountDisplay: '1', totalWeightDisplay: '50.000 kg', averageWeightDisplay: '50.000 kg' },
    onGrossWeightChange: jest.fn(), onTareChange: jest.fn(), onAddSack: jest.fn(), onContinue: jest.fn(), onEditEntry: jest.fn(), ...overrides,
  };
}

it('uses the existing sack identity for correction and requests the existing close confirmation', async () => {
  const input = props(); let root!: ReactTestRenderer;
  await act(async () => { root = create(<TabletWeighingWorkspace {...input} />); });
  const correction = root.root.findAll((node) => node.props.accessibilityLabel?.startsWith('Corregir saco'))[0];
  await act(async () => { correction.props.onPress(); });
  expect(input.onEditEntry).toHaveBeenCalledWith(input.entries[0]);
  const close = root.root.findAll((node) => node.props.label === 'Revisar y cerrar pesaje')[0];
  expect(close.props.disabled).toBeFalsy();
  await act(async () => { close.props.onPress(); });
  expect(input.onContinue).toHaveBeenCalledTimes(1);
  await act(async () => { root.unmount(); });
});

it.each([{ entries: [] }, { isSubmitting: true }])('prevents closing without saved sacks or while writing: %j', async (overrides) => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<TabletWeighingWorkspace {...props(overrides)} />); });
  expect(root.root.findAll((node) => node.props.label === 'Revisar y cerrar pesaje')[0].props.disabled).toBe(true);
  await act(async () => { root.unmount(); });
});

it('prevents adding a sack until a variety is selected', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<TabletWeighingWorkspace {...props({ selectedVariety: undefined })} />); });
  const add = root.root.findAll((node) => node.props.accessibilityLabel === 'Agregar saco')[0];
  expect(add.props.disabled).toBe(true);
  await act(async () => { root.unmount(); });
});
