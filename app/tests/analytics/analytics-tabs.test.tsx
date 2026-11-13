import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { AnalyticsScreen } from '@/features/analytics/screens/analytics-screen';
import { analyticsSeries, loadAnalyticsFilters } from '@/services/api/analytics-api';

jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { accessToken: 'token' }, invalidateSession: jest.fn() }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/services/api/analytics-api', () => ({ analyticsSeries: jest.fn(), listAnalyticsEvaluations: jest.fn(), listPredictionPublications: jest.fn(), getPredictionPublication: jest.fn(), getAnalyticsEvaluation: jest.fn(), loadAnalyticsFilters: jest.fn(), predictionReadiness: jest.fn() }));
jest.mock('@/features/analytics/screens/price-board', () => ({ PriceBoard: (props: object) => jest.requireActual('react').createElement('price-board', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ChoiceDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control, SelectionField: control };
});

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.mocked(loadAnalyticsFilters).mockResolvedValue({ qualities: [], origins: [], buyers: [], providers: [], varieties: [{ id: 'v-1', name: 'Canchán', isActive: true }] } as never);
  jest.mocked(analyticsSeries).mockResolvedValue({ points: [], excluded: [] } as never);
});

const tab = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function')[0]!;
const boards = (root: ReactTestRenderer) => root.root.findAll((node) => (node.type as unknown) === 'price-board');
const cardTitles = (root: ReactTestRenderer) => root.root.findAll((node) => (node.type as unknown) === 'test-control' && typeof node.props.title === 'string').map((node) => node.props.title as string);

// Spec 011, CL-ST31: Analítica with the three tabs of the mockup.
it('opens on the price board and moves between the three tabs, refreshing only the board', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AnalyticsScreen />); });
  expect(boards(root)).toHaveLength(1);
  expect(boards(root)[0]!.props.refreshKey).toBe(0);
  expect(cardTitles(root)).not.toContain('Periodo, variedad y participantes');

  const refresh = () => root.root.findAll((node) => node.props.accessibilityLabel === 'Actualizar precios' && typeof node.props.onPress === 'function')[0]!;
  await act(async () => { refresh().props.onPress(); });
  expect(boards(root)[0]!.props.refreshKey).toBe(1);

  await act(async () => { tab(root, 'Rendimiento por variedad').props.onPress(); });
  expect(boards(root)).toHaveLength(0);
  expect(cardTitles(root)).toContain('Periodo, variedad y participantes');
  expect(cardTitles(root)).not.toContain('Disponibilidad de estimaciones');
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Actualizar precios')).toHaveLength(0);

  await act(async () => { tab(root, 'Estimaciones y publicaciones').props.onPress(); });
  expect(cardTitles(root)).toContain('Disponibilidad de estimaciones');
  expect(cardTitles(root)).not.toContain('Periodo, variedad y participantes');
  expect(tab(root, 'Estimaciones y publicaciones').props.accessibilityState).toEqual({ selected: true });
  await act(async () => root.unmount());
});
