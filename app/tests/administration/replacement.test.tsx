import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AdministrationScreen } from '@/features/administration/screens/administration-screen';
import { createDelegation, listAssistants, listDelegations } from '@/services/api/administration-api';
import { replacementDurations, replacementWindow } from '@/domain/administration/replacement-window';

const mockSession = { accessToken: 'test-token', user: { role: 'wholesaler' } };
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: mockSession }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }) }));
jest.mock('@/services/api/administration-api', () => ({
  createAssistant: jest.fn(), createDelegation: jest.fn(), deactivateAssistant: jest.fn(), listAssistants: jest.fn(),
  listDelegations: jest.fn(), resetAssistantPassword: jest.fn(), revokeDelegation: jest.fn(),
}));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ConfirmationDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control };
});

const assistant = { id: 'assistant-id', businessId: 'b', username: 'encargado', role: 'assistant', isActive: true };
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks();
  jest.mocked(listAssistants).mockResolvedValue({ items: [assistant], total: 1, limit: 100, offset: 0 } as never);
  jest.mocked(listDelegations).mockResolvedValue({ items: [], total: 0, limit: 100, offset: 0 } as never);
  jest.mocked(createDelegation).mockResolvedValue({} as never);
});
const host = (root: ReactTestRenderer, test: (props: Record<string, unknown>) => boolean) => root.root.findAll((node) => typeof node.type === 'string' && test(node.props));

describe('replacement window (spec 011, CL-FM17)', () => {
  it('starts now and never exceeds 24 hours', () => {
    const now = Date.parse('2026-11-06T15:00:00.000Z');
    expect(replacementDurations).toEqual([2, 4, 8, 12, 24]);
    expect(replacementWindow(now, 24)).toEqual({ startsAt: '2026-11-06T15:00:00.000Z', expiresAt: '2026-11-07T15:00:00.000Z' });
    expect(() => replacementWindow(now, 25 as never)).toThrow('como máximo 24 horas');
  });
});

it('authorises the selected Encargado for the chosen duration without typing dates', async () => {
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-06T15:00:00.000Z'));
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<AdministrationScreen />); });
  expect(host(root, (p) => typeof p.label === 'string' && (p.label as string).includes('ISO'))).toHaveLength(0);
  await act(async () => { host(root, (p) => p.label === 'Autorizar reemplazo' && p.tone === 'secondary')[0]!.props.onPress(); });
  await act(async () => { host(root, (p) => p.accessibilityLabel === 'Reemplazo de 24 horas')[0]!.props.onPress(); });
  expect(host(root, (p) => p.accessibilityLabel === 'Reemplazo de 24 horas')[0]!.props.accessibilityState).toEqual({ checked: true });
  await act(async () => { host(root, (p) => p.label === 'Motivo')[0]!.props.onChangeText('Viaje del Mayorista'); });
  await act(async () => { host(root, (p) => p.label === 'Autorizar reemplazo' && p.tone !== 'secondary')[0]!.props.onPress(); });
  expect(createDelegation).toHaveBeenCalledWith('test-token', 'assistant-id', { startsAt: '2026-11-06T15:00:00.000Z', expiresAt: '2026-11-07T15:00:00.000Z', reason: 'Viaje del Mayorista' });
  await act(async () => root.unmount());
  jest.restoreAllMocks();
});
