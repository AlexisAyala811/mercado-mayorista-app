import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HomeScreen } from '@/features/home/screens/home-screen';
import { menuModules, modulesFor, type MenuModule } from '@/features/home/menu-modules';

jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('@/features/home/components/module-card', () => ({ ModuleCard: (props: object) => jest.requireActual('react').createElement('test-module', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, AppButton: control, BrandMark: control, EmptyState: control };
});

const openModule = jest.fn(); const logout = jest.fn();
const screen = (modules: MenuModule[]) => <HomeScreen modules={modules} userDisplayName="mayorista" roleLabel="Mayorista" onOpenModule={openModule} onLogout={logout} />;
const cards = (root: ReactTestRenderer) => root.root.findAll(node => (node.type as unknown) === 'test-module').map(node => node.props.module as MenuModule);
const headers = (root: ReactTestRenderer) => root.root.findAll(node => typeof node.type === 'string' && node.props.accessibilityRole === 'header' && typeof node.props.children === 'string').map(node => node.props.children as string);
beforeEach(() => { jest.clearAllMocks(); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

it('shows Compra, Venta and Gestión at the same time for the Mayorista, without tabs', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('wholesaler'))); });
  expect(headers(root)).toEqual(['MAÑAY', 'Compra', 'Venta', 'Gestión']);
  expect(root.root.findAll(node => node.props.accessibilityRole === 'tab')).toHaveLength(0);
  expect(cards(root).map(module => module.title)).toEqual(menuModules.map(module => module.title));
  await act(async () => root.unmount());
});

it('opens each module with its own route', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('wholesaler'))); });
  for (const node of root.root.findAll(item => (item.type as unknown) === 'test-module')) {
    await act(async () => { node.props.onPress(); });
    expect(openModule).toHaveBeenLastCalledWith(node.props.module);
  }
  expect(new Set(menuModules.map(module => module.route)).size).toBe(menuModules.length);
  await act(async () => root.unmount());
});

it('gives the Encargado the same menu with only Anote, Ventas and Pendientes de envío', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('assistant'))); });
  expect(cards(root).map(module => module.title)).toEqual(['Anote', 'Ventas', 'Pendientes de envío']);
  expect(headers(root)).toEqual(['MAÑAY', 'Compra', 'Venta', 'Gestión']);
  await act(async () => root.unmount());
});

it('keeps logout available and presents an empty state without modules', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen([])); });
  expect(root.root.findAll(node => node.props.title === 'Sin módulos disponibles')).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.label === 'Cerrar sesión')[0]!.props.onPress(); });
  expect(logout).toHaveBeenCalledTimes(1); expect(openModule).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('never offers inventory, the standalone catalog or returns', () => {
  const ids = menuModules.map(module => module.id as string);
  expect(ids).not.toContain('inventory');
  expect(ids).not.toContain('catalog');
  expect(JSON.stringify(menuModules)).not.toMatch(/devoluci/i);
});
