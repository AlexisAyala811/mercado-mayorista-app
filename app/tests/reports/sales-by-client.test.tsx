import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { SalesByClient } from '@/features/reports/screens/sales-by-client';
import type { SaleRow } from '@/domain/shared/sales-report';

jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
jest.mock('@/ui/components', () => ({ FormField: (props: object) => jest.requireActual('react').createElement('test-field', props) }));

const row = (id: string, counterparty: string, date: string, amount: string, advances: string, balance: string, sacks = '10', weight = '500.000'): SaleRow => ({ advances, amount, balance, counterparty, counterpartyId: id, date, id, sacks, weight });
const rows = [
  row('a', 'Comercial Los Andes', '2026-11-10', '396500', '396500', '0', '60', '3050.000'),
  row('b', 'Santa Anita Puesto 42', '2026-11-12', '385000', '100000', '285000', '45', '2280.000'),
  row('c', 'Restaurantes del Centro', '2026-11-11', '339000', '0', '339000', '42', '2100.000'),
];

beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

const ids = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && /^sale-row-/.test(String(node.props.testID ?? ''))).map((node) => String(node.props.testID).slice(9));
const radio = (root: ReactTestRenderer, label: string) => root.root.findAll((node) => node.props.accessibilityRole === 'radio' && String(node.props.accessibilityLabel).startsWith(label) && typeof node.props.onPress === 'function')[0]!;

// Spec 011, CL-ST33: «Ventas por cliente mayorista».
it('lists the sales newest first, filters by state, searches by client and opens the figures of a sale', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SalesByClient rows={rows} />); });
  expect(ids(root)).toEqual(['b', 'c', 'a']);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Todos: 3')).not.toHaveLength(0);

  await act(async () => { radio(root, 'Crédito').props.onPress(); });
  expect(ids(root)).toEqual(['b', 'c']);
  await act(async () => { radio(root, 'Cobrados').props.onPress(); });
  expect(ids(root)).toEqual(['a']);

  await act(async () => { radio(root, 'Todos').props.onPress(); });
  await act(async () => { root.root.findAll((node) => node.props.label === 'Buscar cliente')[0]!.props.onChangeText('rest'); });
  expect(ids(root)).toEqual(['c']);

  await act(async () => { root.root.findAll((node) => String(node.props.accessibilityLabel).startsWith('Ver venta de Restaurantes') && typeof node.props.onPress === 'function')[0]!.props.onPress(); });
  const text = root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string').map((node) => node.props.children as string);
  expect(text).toEqual(expect.arrayContaining(['Restaurantes del Centro', 'S/ 3,390.00', 'CRÉDITO']));
  await act(async () => root.unmount());
});

it('says so when there are no sales or none matches', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<SalesByClient rows={[]} />); });
  const text = () => root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string').map((node) => node.props.children as string);
  expect(text()).toContain('Sin ventas en el período.');
  await act(async () => root.unmount());
});
