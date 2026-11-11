import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { HomeScreen } from '@/features/home/screens/home-screen';
import { menuModules, modulesFor, type MenuModule } from '@/features/home/menu-modules';

jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/features/home/components/module-card', () => ({ ModuleCard: (props: object) => jest.requireActual('react').createElement('test-module', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, AppButton: control, BrandMark: control, EmptyState: control };
});

const openModule = jest.fn(); const logout = jest.fn();
const screen = (modules: MenuModule[]) => <HomeScreen modules={modules} userDisplayName="mayorista" roleLabel="Mayorista" onOpenModule={openModule} onLogout={logout} />;
const cards = (root: ReactTestRenderer) => root.root.findAll(node => (node.type as unknown) === 'test-module').map(node => node.props.module as MenuModule);
const tabs = (root: ReactTestRenderer) => root.root.findAll(node => typeof node.props.onPress === 'function' && node.props.accessibilityRole === 'tab');
const more = (root: ReactTestRenderer) => root.root.findAll(node => typeof node.props.onPress === 'function' && String(node.props.testID ?? '').startsWith('more-'));
const titles = (side: string) => menuModules.filter(module => module.section === side).map(module => module.title);
beforeEach(() => { jest.clearAllMocks(); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

// Spec 011 (RQ-ST11, CL-ST11): the menu is the Compra / Venta switch of Stitch.
it('opens on Compra with its six cards and switches to the six of Venta', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('wholesaler'))); });
  expect(tabs(root).map(tab => [tab.props.accessibilityLabel, tab.props.accessibilityState.selected])).toEqual([['Compra', true], ['Venta', false]]);
  expect(cards(root).map(module => module.title)).toEqual(['Anote', 'Ver compras', 'Carros', 'Deudas', 'Analítica', 'Reportes']);
  await act(async () => { tabs(root)[1]!.props.onPress(); });
  expect(tabs(root).map(tab => tab.props.accessibilityState.selected)).toEqual([false, true]);
  expect(cards(root).map(module => module.title)).toEqual(['Anote', 'Ver ventas', 'Carros', 'Cobranzas', 'Analítica', 'Reportes']);
  expect(titles('purchase')).toHaveLength(6);
  expect(titles('sale')).toHaveLength(6);
  await act(async () => root.unmount());
});

// CL-ST15: what Stitch does not draw stays reachable.
it('keeps the options Stitch does not draw under Más opciones on both sides', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('wholesaler'))); });
  const expected = ['Pendientes de envío', 'Flete y estiba', 'Comprobantes', 'Mensajería', 'Usuarios y reemplazos', 'Auditoría'];
  expect(more(root).map(node => node.props.accessibilityLabel)).toEqual(expected);
  await act(async () => { tabs(root)[1]!.props.onPress(); });
  expect(more(root).map(node => node.props.accessibilityLabel)).toEqual(expected);
  await act(async () => { more(root)[0]!.props.onPress(); });
  expect(openModule).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'sync-queue', route: '/sync-queue' }));
  await act(async () => root.unmount());
});

it('opens each card with its own route and the sales report from the Venta side', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('wholesaler'))); });
  for (const side of [0, 1]) {
    await act(async () => { tabs(root)[side]!.props.onPress(); });
    for (const node of root.root.findAll(item => (item.type as unknown) === 'test-module')) {
      await act(async () => { node.props.onPress(); });
      expect(openModule).toHaveBeenLastCalledWith(node.props.module);
    }
  }
  expect(openModule).toHaveBeenLastCalledWith(expect.objectContaining({ route: { pathname: '/reports', params: { lado: 'venta' } } }));
  await act(async () => root.unmount());
});

it('gives the Encargado only Anote, Anote de venta and Pendientes de envío', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen(modulesFor('assistant'))); });
  expect(cards(root).map(module => module.title)).toEqual(['Anote']);
  await act(async () => { tabs(root)[1]!.props.onPress(); });
  expect(cards(root).map(module => module.title)).toEqual(['Anote']);
  expect(more(root).map(node => node.props.accessibilityLabel)).toEqual(['Pendientes de envío']);
  await act(async () => root.unmount());
});

it('keeps logout available and presents an empty state without modules', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen([])); });
  expect(root.root.findAll(node => node.props.title === 'Sin módulos disponibles')).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.accessibilityLabel === 'Cerrar sesión' && typeof node.props.onPress === 'function')[0]!.props.onPress(); });
  expect(logout).toHaveBeenCalledTimes(1); expect(openModule).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});

it('never offers inventory, the standalone catalog, returns, a scale or SUNAT', () => {
  const ids = menuModules.map(module => module.id as string);
  expect(ids).not.toContain('inventory');
  expect(ids).not.toContain('catalog');
  expect(JSON.stringify(menuModules)).not.toMatch(/devoluci|balanza|báscula|sunat/i);
});
