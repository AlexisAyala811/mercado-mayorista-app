import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { PurchaseConfirmationScreen } from '@/features/reception/screens/purchase-confirmation-screen';
import type { PurchaseSettlement } from '@/domain/reception/reception';

jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: { children?: React.ReactNode }) => react.createElement('test-control', props, props.children);
  return { AppScreen: control, AppButton: control, AppCard: control, FeedbackState: control, MetricTile: control, ScreenHeader: control, StepProgress: control };
});
jest.mock('expo-symbols', () => ({ SymbolView: () => null }));
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

const notes = (root: ReactTestRenderer) => root.root.findAll((node) => typeof node.type === 'string' && Array.isArray(node.props.children) && node.props.children.length === 2 && typeof node.props.children[0] === 'object' && typeof node.props.children[1] === 'string').map((node) => `${[node.props.children[0].props.children].flat().join("")}${node.props.children[1]}`);

// Spec 011 (RQ-ST04, CL-ST18, Stitch «Guardado exitosamente»).
it('sums up the purchase in the Stitch card, shares its PDF receipt and starts a new purchase', async () => {
  const onNew = jest.fn();
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={settlement} providerName="Aurelio Mamani" onNew={onNew} />); });
  expect(texts(root)).toEqual(expect.arrayContaining(['Guardado exitosamente', 'LIQUIDACIÓN DE COMPRA #SETTLEME', 'AURELIO MAMANI', 'Amarilla, Canchán', '3 sacos · 145 kg', '2 lotes con su precio', 'Total neto a pagar', 'S/ 312.50']));
  await act(async () => { root.root.findAll((node) => node.props.accessibilityLabel === 'Compartir comprobante' && node.props.onPress)[0]!.props.onPress(); });
  expect(shareReceipt).toHaveBeenCalledWith('purchases', 'settlement', 'test-token', expect.any(Function));
  for (const label of ['Enviar WhatsApp', 'Enviar correo', 'Imprimir']) expect(root.root.findAll((node) => node.props.accessibilityLabel === label && node.props.onPress)).not.toHaveLength(0);
  await act(async () => { root.root.findAll((node) => node.props.accessibilityLabel === 'Nueva compra' && node.props.onPress)[0]!.props.onPress(); });
  expect(onNew).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});

it('tells freight assumed by the wholesaler apart from deducted freight, and the payment', async () => {
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PurchaseConfirmationScreen settlement={settlement} providerName="Aurelio Mamani" onNew={jest.fn()} />); });
  expect(notes(root)).toEqual(['Flete a cargo del Mayorista (no se descontó): S/ 15.00', 'Adelanto: S/ 0.00', 'Descuentos: S/ 0.00', 'Pago: Contado']);
  await act(async () => { root.update(<PurchaseConfirmationScreen settlement={{ ...settlement, lots: [settlement.lots![0]!], freightChargedTo: undefined }} providerName="Aurelio Mamani" onNew={jest.fn()} />); });
  expect(notes(root)[0]).toBe('Flete descontado: S/ 15.00');
  expect(texts(root)).toContain('S/ 2.50 / kg');
  await act(async () => { root.update(<PurchaseConfirmationScreen settlement={{ ...settlement, lots: undefined }} providerName="Aurelio Mamani" onNew={jest.fn()} />); });
  expect(texts(root)).toContain('Sin variedad');
  await act(async () => root.unmount());
});
