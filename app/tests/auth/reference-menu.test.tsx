import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Modal } from 'react-native';
import { HomeScreen } from '@/features/home/screens/home-screen';
import type { HomeModule } from '@/features/home/components/module-card';

jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-image', () => ({ Image: (props: object) => jest.requireActual('react').createElement('test-image', props) }));
jest.mock('@/features/home/components/module-card', () => ({ ModuleCard: (props: object) => jest.requireActual('react').createElement('test-module', props) }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppScreen: control, AppButton: control, EmptyState: control, FeedbackState: control, LoadingState: control };
});
const modules: HomeModule[] = [
  { id: 'purchases', title: 'Compras', shortLabel: 'CO', description: 'Registrar compra' },
  { id: 'purchase-history', title: 'Historial de compras', shortLabel: 'HC', description: 'Consultar' },
  { id: 'logistics', title: 'Logística', shortLabel: 'LO', description: 'Carros' },
  { id: 'accounts', title: 'Cuentas y caja', shortLabel: 'CU', description: 'Deudas' },
  { id: 'sales', title: 'Ventas', shortLabel: 'VE', description: 'Registrar venta' },
  { id: 'reports', title: 'Reportes', shortLabel: 'RE', description: 'Consultar reportes' },
];
const openModule = jest.fn(); const logout = jest.fn();
const screen = (allowed = modules) => <HomeScreen modules={allowed} userDisplayName="Mayorista" roleLabel="Mayorista" onOpenModule={openModule} onLogout={logout} />;
const button = (root: ReactTestRenderer, label: string) => root.root.findAll(node => node.props.accessibilityLabel === label && node.props.onPress)[0];
beforeEach(() => { jest.clearAllMocks(); (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

it('opens each original purchase card using the approved module identity', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen()); });
  for (const module of modules.slice(0, 4)) {
    await act(async () => { button(root, module.title).props.onPress(); });
    expect(openModule).toHaveBeenLastCalledWith(module);
  }
  await act(async () => { root.unmount(); });
});

it('switches to sales without invoking a business action and then opens the selected sale module', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen()); });
  await act(async () => { button(root, 'Venta').props.onPress(); });
  expect(openModule).not.toHaveBeenCalled();
  expect(button(root, 'Venta').props.accessibilityState.selected).toBe(true);
  expect(button(root, 'Venta').props['aria-selected']).toBe(true);
  const sales = root.root.findAll(node => node.props.module?.id === 'sales' && node.props.onPress)[0];
  await act(async () => { sales.props.onPress(sales.props.module); });
  expect(openModule).toHaveBeenCalledWith(modules[4]);
  await act(async () => { root.unmount(); });
});

it('shows approved supplemental modules and removes them if permissions change while the modal is open', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen()); });
  await act(async () => { button(root, 'Más operaciones').props.onPress(); });
  expect(root.root.findByType(Modal).props.visible).toBe(true);
  expect(root.root.findAll(node => node.props.module?.id === 'reports')).not.toHaveLength(0);
  await act(async () => { root.update(screen(modules.filter(module => ['purchases', 'sales'].includes(module.id)))); });
  expect(root.root.findByType(Modal).props.visible).toBe(false);
  expect(root.root.findAll(node => node.props.module?.id === 'reports')).toHaveLength(0);
  expect(root.root.findAll(node => node.props.accessibilityLabel === 'Cuentas y caja')).toHaveLength(0);
  expect(openModule).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('keeps logout available and presents an empty state without modules', async () => {
  let root!: ReactTestRenderer; await act(async () => { root = create(screen([])); });
  expect(root.root.findAll(node => node.props.title === 'Sin módulos disponibles')).not.toHaveLength(0);
  const close = root.root.findAll(node => node.props.label === 'Cerrar sesión')[0];
  await act(async () => { close.props.onPress(); });
  expect(logout).toHaveBeenCalledTimes(1); expect(openModule).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});

it('excludes the retired inventory module even if old metadata still supplies it', async () => {
  const legacy: HomeModule = { id: 'inventory', title: 'Inventario', shortLabel: 'IN', description: 'Saldo de mercadería' };
  let root!: ReactTestRenderer; await act(async () => { root = create(screen([...modules, legacy])); });
  await act(async () => { button(root, 'Más operaciones').props.onPress(); });
  expect(root.root.findAll(node => node.props.module?.id === 'inventory')).toHaveLength(0);
  await act(async () => { root.unmount(); });
});

it('never offers the standalone catalog module, including legacy supplemental metadata', async () => {
  const legacy:HomeModule={id:'catalog',title:'Catálogos',shortLabel:'CA',description:'Datos maestros'};
  let root!:ReactTestRenderer;await act(async()=>{root=create(screen([...modules,legacy]));});
  await act(async()=>button(root,'Más operaciones').props.onPress());
  expect(root.root.findAll(node=>node.props.module?.id==='catalog')).toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).not.toContain('Datos maestros');await act(async()=>root.unmount());
});
