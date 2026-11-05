import React from 'react';
jest.mock('react-native-pdf', () => (props: object) => jest.requireActual('react').createElement('native-pdf', props));
import { Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ReportsScreen } from '@/features/reports/screens/reports-screen';
import { loadHistoricalCommercialFilters as loadCatalogs } from '@/services/api/analytics-api';
import { commercialSummary } from '@/services/api/operations-api';

const mockSession = { accessToken: 'test-token' };
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/services/api/analytics-api', () => ({ loadHistoricalCommercialFilters: jest.fn() }));
jest.mock('@/services/api/operations-api', () => ({ commercialSummary: jest.fn(), operationOverview: jest.fn(), commercialMargin: jest.fn(), reportAlerts: jest.fn(), priceHistory: jest.fn() }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ChoiceDialog: control, EmptyState: control, FeedbackState: control, FormField: control, MetricTile: control, ScreenHeader: control, SelectionField: control };
});
void [Text, View];

it('applies a preset only on selection and preserves manual dates as custom', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.mocked(loadCatalogs).mockResolvedValue({ buyers: [], providers: [], varieties: [], qualities: [], origins: [] });
  jest.mocked(commercialSummary).mockClear();
  jest.useFakeTimers({ now: new Date(2030, 0, 15), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
  let root!: ReactTestRenderer;
  try {
    await act(async () => { root = create(<ReportsScreen />); });
    const control = (label: string) => root.root.findAll(node => node.props.label === label)[0];
    await act(async () => { control('Período').props.onPress(); });
    const dialog = root.root.findAll(node => node.props.title === 'Seleccionar período')[0];
    await act(async () => { dialog.props.onSelect({ id: 'previous-month', label: 'Mes anterior' }); });
    expect(control('Desde').props.value).toBe('2029-12-01');
    expect(control('Hasta').props.value).toBe('2029-12-31');
    await act(async () => { control('Desde').props.onChangeText('2029-12-12'); });
    expect(control('Período').props.value).toBe('Personalizado');
    expect(control('Desde').props.value).toBe('2029-12-12');
    await act(async () => { control('Restablecer período').props.onPress(); });
    expect(control('Desde').props.value).toBe('2030-01-01');
    expect(control('Hasta').props.value).toBe('2030-01-15');
    expect(commercialSummary).not.toHaveBeenCalled();
  } finally { await act(async () => { root?.unmount(); }); jest.useRealTimers(); }
});

it('starts a new report in the current month after midnight without changing an edited period', async () => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.mocked(loadCatalogs).mockResolvedValue({ buyers: [], providers: [], varieties: [], qualities: [], origins: [] });
  jest.useFakeTimers({ now: new Date(2030, 8, 30, 23, 55), doNotFake: ['setTimeout', 'setInterval', 'setImmediate', 'nextTick', 'queueMicrotask', 'performance', 'hrtime'] });
  let first: ReactTestRenderer | undefined;
  let second: ReactTestRenderer | undefined;
  try {
    await act(async () => { first = create(<ReportsScreen />); });
    const field = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.props.label === label)[0];
    expect(field(first!, 'Desde').props.value).toBe('2030-09-01');
    expect(field(first!, 'Hasta').props.value).toBe('2030-09-30');
    await act(async () => { field(first!, 'Desde').props.onChangeText('2030-08-15'); });
    jest.setSystemTime(new Date(2030, 9, 1, 0, 5));
    await act(async () => { first!.update(<ReportsScreen />); });
    expect(field(first!, 'Desde').props.value).toBe('2030-08-15');
    expect(field(first!, 'Hasta').props.value).toBe('2030-09-30');
    await act(async () => { second = create(<ReportsScreen />); });
    expect(field(second!, 'Desde').props.value).toBe('2030-10-01');
    expect(field(second!, 'Hasta').props.value).toBe('2030-10-01');
    expect(commercialSummary).not.toHaveBeenCalled();
  } finally {
    await act(async () => { first?.unmount(); second?.unmount(); });
    jest.useRealTimers();
  }
});
