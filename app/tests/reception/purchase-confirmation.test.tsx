import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PurchaseConfirmationScreen } from '@/features/reception/screens/purchase-confirmation-screen';
import type { PurchaseSettlement } from '@/domain/reception/reception';

jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: { children?: React.ReactNode }) => react.createElement('test-control', props, props.children);
  return { AppScreen: control, AppButton: control, AppCard: control, FeedbackState: control, MetricTile: control, ScreenHeader: control, StepProgress: control };
});
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { accessToken: 'test-token' } }) }));
jest.mock('@/services/receipts/receipt-sharing', () => ({ shareReceipt: jest.fn(async () => 'file://receipt.pdf') }));
import { shareReceipt } from '@/services/receipts/receipt-sharing';
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
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={settlement} providerName="Aurelio Mamani" onNew={jest.fn()} />); });
  expect(texts(root)).toEqual(expect.arrayContaining(['Lote A · Amarilla · Calidad no informada', 'Lote B · Selecta · Canchán · Primera', 'El flete no se descontó al proveedor; queda pendiente con el transportista.']));
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Importe del lote B: S/ 200.00')).not.toHaveLength(0);
  expect(root.root.findAll((node) => node.props.label === 'Flete a cargo del Mayorista')).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('keeps confirmations from servers without lots readable', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={{ ...settlement, lots: undefined, freightChargedTo: undefined }} providerName="Aurelio Mamani" onNew={jest.fn()} />); });
  expect(root.root.findAll((node) => node.props.title === 'Lotes')).toHaveLength(0);
  expect(root.root.findAll((node) => node.props.label === 'Flete descontado')).not.toHaveLength(0);
  await act(async () => root.unmount());
});


// Spec 011 (RQ-ST04, Stitch «Guardado exitosamente»).
it('sums up the purchase in one card, shares its PDF receipt and starts a new purchase', async () => {
  const onNew = jest.fn();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={settlement} providerName="Aurelio Mamani" onNew={onNew} />); });
  expect(texts(root)).toEqual(expect.arrayContaining(['Compra guardada', 'Aurelio Mamani', 'Amarilla, Canchán', '3 sacos · 145 kg', 'Contado', 'Total neto a pagar', 'S/ 312.50']));
  await act(async () => { root.root.findAll((node) => node.props.label === 'Compartir comprobante')[0]!.props.onPress(); });
  expect(shareReceipt).toHaveBeenCalledWith('purchases', 'settlement', 'test-token', expect.any(Function));
  await act(async () => { root.root.findAll((node) => node.props.label === 'Nueva compra')[0]!.props.onPress(); });
  expect(onNew).toHaveBeenCalledTimes(1);
  expect(root.root.findAll((node) => node.props.label === 'Volver al menú')).toHaveLength(0);
  await act(async () => root.unmount());
});
