import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { forgetOperator, maxRecentOperators, operatorInitials, parseRecentOperators, rememberOperator, type RecentOperator } from '@/domain/auth/recent-operators';
import { LoginScreen } from '@/features/auth/screens/login-screen';
import { readRecentOperators, recordOperatorSignIn } from '@/services/storage/recent-operators-storage';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn(async (key: string) => { mockStore.delete(key); }),
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => { mockStore.set(key, value); }),
}));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-image', () => ({ Image: () => null }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (name: string) => (props: object) => react.createElement(name, props);
  return { AppButton: control('test-button'), AppScreen: control('test-screen'), BrandMark: control('test-brand'), FormField: control('test-field'), LoadingState: control('test-loading') };
});

const owner: RecentOperator = { role: 'wholesaler', username: 'mayorista' };
const helper: RecentOperator = { role: 'assistant', username: 'encargado.uno' };

beforeEach(() => {
  mockStore.clear();
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

// Spec 011 (RQ-ST12, CL-ST16).
describe('recent operators of this tablet', () => {
  it('puts the latest first, keeps each username once and at most four', () => {
    expect(rememberOperator([owner], helper)).toEqual([helper, owner]);
    expect(rememberOperator([helper, owner], { role: 'wholesaler', username: 'MAYORISTA' })).toEqual([{ role: 'wholesaler', username: 'MAYORISTA' }, helper]);
    const many = ['a', 'b', 'c', 'd', 'e'].reduce<RecentOperator[]>((list, username) => rememberOperator(list, { role: 'assistant', username }), []);
    expect(many.map((item) => item.username)).toEqual(['e', 'd', 'c', 'b']);
    expect(many).toHaveLength(maxRecentOperators);
    expect(forgetOperator([helper, owner], 'Encargado.Uno')).toEqual([owner]);
  });

  it('ignores a damaged list and anything that is not a username with its role', () => {
    expect(parseRecentOperators(null)).toEqual([]);
    expect(parseRecentOperators('{')).toEqual([]);
    expect(parseRecentOperators(JSON.stringify([owner, { username: 'x', role: 'admin' }, { username: '', role: 'assistant' }, null, { ...helper, password: 'never', accessToken: 'never' }]))).toEqual([owner, helper]);
    expect(operatorInitials('encargado.uno')).toBe('EU');
    expect(operatorInitials('mayorista')).toBe('MA');
  });

  it('stores only the username and the role on the device, and forgets the operator when the station is not kept', async () => {
    await recordOperatorSignIn(owner, true);
    await recordOperatorSignIn(helper, true);
    expect(await readRecentOperators()).toEqual([helper, owner]);
    expect([...mockStore.values()].join('')).not.toMatch(/password|token/i);
    expect(Object.keys(JSON.parse([...mockStore.values()][0]!)[0]).sort()).toEqual(['role', 'username']);
    await recordOperatorSignIn(helper, false);
    expect(await readRecentOperators()).toEqual([owner]);
  });
});

describe('login with the quick operator selection', () => {
  const fields = (root: ReactTestRenderer) => root.root.findAll((node) => (node.type as unknown) === 'test-field');
  const pressable = (root: ReactTestRenderer, testID: string) => root.root.findAll((node) => node.props.testID === testID && typeof node.props.onPress === 'function')[0]!;
  const submit = (root: ReactTestRenderer) => root.root.findAll((node) => (node.type as unknown) === 'test-button' && node.props.label === 'Iniciar sesión')[0]!;

  it('fills only the username when an operator is touched; the password is always typed', async () => {
    const onSubmit = jest.fn();
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<LoginScreen onSubmit={onSubmit} operators={[owner, helper]} />); });
    expect(pressable(root, 'operator-mayorista').props.accessibilityLabel).toBe('mayorista, Mayorista');
    expect(pressable(root, 'operator-encargado.uno').props.accessibilityLabel).toBe('encargado.uno, Encargado');
    await act(async () => { pressable(root, 'operator-encargado.uno').props.onPress(); });
    expect(fields(root).map((field) => field.props.value)).toEqual(['encargado.uno', '']);
    expect(submit(root).props.disabled).toBe(true);
    await act(async () => { fields(root)[1]!.props.onChangeText('fixture-only'); });
    await act(async () => { submit(root).props.onPress(); });
    expect(onSubmit).toHaveBeenCalledWith({ password: 'fixture-only', username: 'encargado.uno' }, { keepStation: true });
    await act(async () => root.unmount());
  });

  it('sends the choice of «Mantener estación activa» and hides the selection when nobody signed in yet', async () => {
    const onSubmit = jest.fn();
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<LoginScreen onSubmit={onSubmit} />); });
    expect(root.root.findAll((node) => String(node.props.testID ?? '').startsWith('operator-'))).toHaveLength(0);
    expect(pressable(root, 'keep-station').props.accessibilityState).toEqual({ checked: true });
    await act(async () => { pressable(root, 'keep-station').props.onPress(); });
    expect(pressable(root, 'keep-station').props.accessibilityState).toEqual({ checked: false });
    await act(async () => { fields(root)[0]!.props.onChangeText('mayorista'); fields(root)[1]!.props.onChangeText('fixture-only'); });
    await act(async () => { submit(root).props.onPress(); });
    expect(onSubmit).toHaveBeenCalledWith({ password: 'fixture-only', username: 'mayorista' }, { keepStation: false });
    await act(async () => root.unmount());
  });

  it('never draws the scale, the terminal id or another brand of the mockup', async () => {
    let root!: ReactTestRenderer;
    await act(async () => { root = create(<LoginScreen operators={[owner]} />); });
    expect(root.root.findAll((node) => typeof node.props.children === "string").map((node) => node.props.children).join(" ")).not.toMatch(/balanza|báscula|WS-LIMA|AgroGesti|Terra/i);
    await act(async () => root.unmount());
  });
});
