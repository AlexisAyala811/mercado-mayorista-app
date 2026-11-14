import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { AnalyticsPoint } from '@/domain/analytics/analytics';
import { boardPrice, boardWindowStart, priceBoard } from '@/domain/analytics/price-board';
import { PriceBoard } from '@/features/analytics/screens/price-board';
import { analyticsSeries } from '@/services/api/analytics-api';

jest.mock('@/services/api/analytics-api', () => ({ analyticsSeries: jest.fn() }));
beforeEach(() => { (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true; jest.clearAllMocks(); });

const point = (operationType: 'purchase' | 'sale', varietyName: string, weekStart: string, priceSolesPerKg: string, complete = true): AnalyticsPoint => ({
  compensationIds: [], complete, merchandiseCents: '0', operationCount: 1, operationIds: [], operationType, priceSolesPerKg, sacks: 1,
  varietyId: varietyName.toLowerCase(), varietyName, weekEnd: weekStart, weekStart, weightKg: '50.000',
});
const texts = (root: ReactTestRenderer) => root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));

// Spec 011 (RQ-ST08, CL-ST06, CL-FM20).
it('rounds the shown price half up to the cent with integers', () => {
  expect([boardPrice('1.9500'), boardPrice('2.4375'), boardPrice('1.955'), boardPrice('0.0049')]).toEqual(['1.95', '2.44', '1.96', '0.00']);
});

it('covers 8 weeks ending today', () => {
  expect(boardWindowStart('2026-11-09')).toBe('2026-09-15');
});

it('shows per variety the latest agreed purchase and sale price, its weekly change and the sale bars', () => {
  const [canchan, yungay] = priceBoard([
    point('sale', 'Canchán', '2026-10-26', '1.80'), point('sale', 'Canchán', '2026-11-02', '1.95'),
    point('purchase', 'Canchán', '2026-11-02', '1.45'), point('purchase', 'Yungay', '2026-10-19', '1.10'),
    point('sale', 'Canchán', '2026-11-09', '2.00', false),
  ]);
  expect(canchan).toMatchObject({ barsOf: 'sale', purchase: { change: null, price: '1.45' }, sale: { complete: false, price: '2.00', weekStart: '2026-11-09' }, varietyName: 'Canchán' });
  expect(canchan!.sale!.change).toBe('+2,6 %');
  expect(canchan!.weeks.map((week) => week.price)).toEqual(['1.80', '1.95', '2.00']);
  expect(yungay).toMatchObject({ barsOf: 'purchase', sale: null, varietyName: 'Yungay' });
});

it('reads the series once on opening and says when there are no prices, never inventing a suggested price', async () => {
  jest.mocked(analyticsSeries).mockResolvedValue({ points: [point('sale', 'Canchán', '2026-11-02', '1.95')] } as never);
  let root!: ReactTestRenderer;
  await act(async () => { root = create(<PriceBoard token="t" />); });
  expect(analyticsSeries).toHaveBeenCalledTimes(1);
  // CL-ST18: indicators, quote cards and the weekly evolution of the Stitch board.
  expect(texts(root)).toEqual(expect.arrayContaining(['Pizarra de precios', 'PRECIO DE VENTA CANCHÁN', 'COTIZACIONES POR VARIEDAD', 'Canchán', 'Compra pactada', 'Venta pactada', 'Diferencia venta − compra', 'Evolución de precio (1 semana)', '1.95']));
  expect(texts(root).some((text) => /margen|sugerida/i.test(text))).toBe(false);
  expect(texts(root).some((text) => /sugerido: S\//.test(text))).toBe(false);
  await act(async () => root.unmount());
  jest.mocked(analyticsSeries).mockResolvedValue({ points: [] } as never);
  await act(async () => { root = create(<PriceBoard token="t" />); });
  expect(texts(root)).toContain('Sin compras ni ventas confirmadas en las últimas 8 semanas.');
  await act(async () => root.unmount());
});

it('computes the difference of agreed prices, the trend and the weekly volume with integers', () => {
  const { priceDifference, priceTrend, latestWeekVolume, largestDifference } = jest.requireActual('@/domain/analytics/price-board-summary');
  const [canchan, yungay] = priceBoard([point('purchase', 'Canchán', '2026-11-02', '1.45'), point('sale', 'Canchán', '2026-11-02', '1.9550'), point('purchase', 'Yungay', '2026-11-02', '1.10'), point('sale', 'Yungay', '2026-11-02', '1.20')]);
  expect(priceDifference(canchan)).toEqual({ display: '+S/ 0.51', value: 5050n });
  expect(priceDifference({ purchase: canchan!.purchase, sale: null })).toBeNull();
  expect(largestDifference([canchan, yungay]).card.varietyName).toBe('Canchán');
  expect([priceTrend('+2,6 %').label, priceTrend('−1,0 %').label, priceTrend(null).label]).toEqual(['ALZA (+2,6%)', 'BAJA (−1,0%)', 'SIN COMPARACIÓN']);
  const volume = latestWeekVolume([point('sale', 'Canchán', '2026-10-26', '1.80'), point('sale', 'Canchán', '2026-11-02', '1.95'), point('purchase', 'Yungay', '2026-11-02', '1.10')]);
  expect(volume).toMatchObject({ sacks: 2, total: '100 kg', weekStart: '2026-11-02' });
  expect(volume.byVariety('canchán')).toBe('50 kg');
});
