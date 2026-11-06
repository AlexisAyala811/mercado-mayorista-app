import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PurchaseConfirmationScreen } from '@/features/reception/screens/purchase-confirmation-screen';
import type { PurchaseSettlement } from '@/domain/reception/reception';

jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: { children?: React.ReactNode }) => react.createElement('test-control', props, props.children);
  return { AppScreen: control, AppButton: control, AppCard: control, FeedbackState: control, MetricTile: control, ScreenHeader: control, StepProgress: control };
});
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; });

const settlement: PurchaseSettlement = {
  id: 'settlement', grossAmountCents: '31250', freightAmountCents: '1500', advancesCents: '0', discountsCents: '0', liquidAmountCents: '31250',
  paymentMode: 'cash', state: 'confirmed', version: 1, freightChargedTo: 'wholesaler',
  lots: [
    { letter: 'A', name: null, varietyName: 'Amarilla', qualityName: null, sacks: 1, netWeightKg: '45.000', priceBasis: 'kilogram', unitPriceCents: '250', amountCents: '11250' },
    { letter: 'B', name: 'Selecta', varietyName: 'Canchán', qualityName: 'Primera', sacks: 2, netWeightKg: '100.000', priceBasis: 'sack', unitPriceCents: '10000', amountCents: '20000' },
  ],
};
const texts = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.children === 'string').map((node) => node.props.children as string);

it('shows each confirmed lot and the freight assumed by the wholesaler without deducting it', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={settlement} onFinish={jest.fn()} />); });
  expect(texts(root)).toEqual(expect.arrayContaining(['Lote A · Amarilla · Calidad no informada', 'Lote B · Selecta · Canchán · Primera', 'El flete no se descontó al proveedor; queda pendiente con el transportista.']));
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote B: S/ 200.00')).not.toHaveLength(0);
  expect(root.root.findAll((node) => node.props.label === 'Flete a cargo del Mayorista')).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('keeps confirmations from servers without lots readable', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={{ ...settlement, lots: undefined, freightChargedTo: undefined }} onFinish={jest.fn()} />); });
  expect(root.root.findAll((node) => node.props.title === 'Lotes')).toHaveLength(0);
  expect(root.root.findAll((node) => node.props.label === 'Flete descontado')).not.toHaveLength(0);
  await act(async () => root.unmount());
});
