import React from 'react';
import { Text, View } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { AnalyticsScreen } from '@/features/analytics/screens/analytics-screen';
import { analyticsSeries, listAnalyticsEvaluations,listPredictionPublications, loadAnalyticsFilters, predictionReadiness } from '@/services/api/analytics-api';
import type { AnalyticsSeries, PredictionReadiness } from '@/domain/analytics/analytics';
const mockInvalidate = jest.fn();
jest.mock('@/features/auth/session/session-provider', () => ({ useSession: () => ({ session: { accessToken: 'token' }, invalidateSession: mockInvalidate }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ back: jest.fn() }) }));
jest.mock('@/services/api/analytics-api', () => ({ analyticsSeries: jest.fn(), listAnalyticsEvaluations: jest.fn(),listPredictionPublications:jest.fn(),getPredictionPublication:jest.fn(), getAnalyticsEvaluation: jest.fn(), loadAnalyticsFilters: jest.fn(), predictionReadiness: jest.fn() }));
jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react'); const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, AppCard: control, AppScreen: control, ChoiceDialog: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, ScreenHeader: control, SelectionField: control };
});
void [Text, View];
const result: AnalyticsSeries = { filters: { from: '2026-10-01', to: '2026-10-06', varietyId: 'v-1' }, timeZone: 'America/Lima', generatedAt: '2026-10-06T20:00:00Z', priceDefinition: 'merchandise_before_discounts_and_freight', points: [{ operationType: 'sale', operationIds: ['sale-1'], compensationIds: [], varietyId: 'v-1', varietyName: 'Canchán', weekStart: '2026-10-05', weekEnd: '2026-10-11', complete: false, operationCount: 1, sacks: 2, weightKg: '50.000', merchandiseCents: '16000', priceSolesPerKg: '3.2000' }], excluded: [] };
beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.clearAllMocks(); jest.mocked(loadAnalyticsFilters).mockResolvedValue({ qualities: [{ id: 'q-1', name: 'Primera histórica', isActive: false }], origins: [{ id: 'o-1', name: 'Junín', isActive: true }], buyers: [{ id: 'buyer-1', name: 'Comprador Uno', isActive: true }], providers: [{ id: 'provider-1', name: 'Proveedor Uno', isActive: true }], varieties: [{ id: 'v-1', name: 'Canchán', isActive: true }] });
  jest.mocked(analyticsSeries).mockResolvedValue(result);
  jest.mocked(predictionReadiness).mockResolvedValue(history);
  jest.mocked(listAnalyticsEvaluations).mockResolvedValue({items:[],total:0,limit:20,offset:0});
  jest.mocked(listPredictionPublications).mockResolvedValue({items:[],total:0,limit:20,offset:0});
});
async function open() { let root!: ReactTestRenderer; await act(async () => { root = create(<AnalyticsScreen />); }); return root; }
const find = (root: ReactTestRenderer, name: string) => root.root.findAll(node => node.props.label === name)[0]!;
async function selectParticipant(root: ReactTestRenderer, field: string, title: string, id: string) {
  await act(async () => { find(root, field).props.onPress(); });
  await act(async () => { root.root.findAll(node => node.props.title === title)[0].props.onSelect({ id }); });
}
async function query(root: ReactTestRenderer) { await act(async () => { find(root, 'Consultar análisis').props.onPress(); }); }
it.each([
  ['2026-02-30', '2026-03-01'],
  ['2026-10-28', '2026-10-01'],
  ['2024-01-01', '2025-01-01'],
])('does not request prices for an invalid period %s – %s', async (from, to) => {
  const root = await open();
  await act(async () => { find(root, 'Desde').props.onChangeText(from); find(root, 'Hasta').props.onChangeText(to); });
  await query(root);
  expect(analyticsSeries).not.toHaveBeenCalled();
  expect(root.root.findAll(node => node.props.title === 'No se pudo consultar').length).toBeGreaterThan(0);
  await act(async () => root.unmount());
});
it('rejects an impossible predictive cutoff without using the descriptive start date', async () => {
  const root = await open(); await selectVariety(root);
  await act(async () => { find(root, 'Desde').props.onChangeText(''); find(root, 'Hasta').props.onChangeText('2026-02-30'); });
  await act(async () => find(root, 'Revisar disponibilidad predictiva').props.onPress());
  expect(predictionReadiness).not.toHaveBeenCalled();
  expect(JSON.stringify(root.toJSON())).toContain('fecha de corte válida');
  await act(async () => find(root, 'Hasta').props.onChangeText('2026-10-06'));
  await act(async () => find(root, 'Revisar disponibilidad predictiva').props.onPress());
  expect(predictionReadiness).toHaveBeenCalledWith('token', '2026-10-06', 'v-1');
  await act(async () => root.unmount());
});
it('offers inactive historical participants without reactivating them', async () => {
  jest.mocked(loadAnalyticsFilters).mockResolvedValueOnce({ qualities: [], origins: [], providers: [], varieties: [], buyers: [{ id: 'old-buyer', name: 'Comprador histórico', isActive: false }] });
  const root = await open();
  await act(async () => { find(root, 'Comprador de ventas').props.onPress(); });
  const dialog = root.root.findAll(node => node.props.title === 'Seleccionar comprador de ventas')[0]!;
  expect(dialog.props.choices).toContainEqual({ id: 'old-buyer', label: 'Comprador histórico (desactivado)' });
  await act(async () => { dialog.props.onSelect({ id: 'old-buyer' }); });
  expect(find(root, 'Comprador de ventas').props.value).toBe('Comprador histórico (desactivado)');
  await query(root);
  expect(analyticsSeries).toHaveBeenLastCalledWith('token', expect.objectContaining({ buyerId: 'old-buyer' }));
  await act(async () => { root.unmount(); });
});
it('disables selectors during historical catalog loading and offers retry on failure', async () => {
  let reject!: (error: Error) => void;
  jest.mocked(loadAnalyticsFilters).mockReturnValueOnce(new Promise((_done, fail) => { reject = fail; }));
  const root = await open();
  expect(find(root, 'Comprador de ventas').props.disabled).toBe(true);
  expect(root.root.findAll(node => node.props.label === 'Cargando filtros históricos')).not.toHaveLength(0);
  await act(async () => { reject(new Error('network')); });
  expect(root.root.findAll(node => node.props.title === 'Filtros no disponibles')).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.actionLabel === 'Reintentar filtros')[0].props.onAction(); });
  expect(find(root, 'Comprador de ventas').props.disabled).toBe(false);
  expect(loadAnalyticsFilters).toHaveBeenCalledTimes(2);
  await act(async () => { root.unmount(); });
});
it('sends independent purchase and sale participants, and clearing one retains the other', async () => {
  const root = await open();
  await selectParticipant(root, 'Proveedor de compras', 'Seleccionar proveedor de compras', 'provider-1');
  await selectParticipant(root, 'Comprador de ventas', 'Seleccionar comprador de ventas', 'buyer-1');
  await query(root);
  expect(analyticsSeries).toHaveBeenLastCalledWith('token', expect.objectContaining({ providerId: 'provider-1', buyerId: 'buyer-1' }));
  await selectParticipant(root, 'Proveedor de compras', 'Seleccionar proveedor de compras', '');
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  await query(root);
  expect(analyticsSeries).toHaveBeenLastCalledWith('token', expect.objectContaining({ providerId: undefined, buyerId: 'buyer-1' }));
  await act(async () => { root.unmount(); });
});
it('rejects a late response after changing participant instead of relabeling its prices', async () => {
  let resolve!: (value: AnalyticsSeries) => void;
  jest.mocked(analyticsSeries).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const root = await open(); await query(root);
  await selectParticipant(root, 'Comprador de ventas', 'Seleccionar comprador de ventas', 'buyer-1');
  await act(async () => { resolve(result); });
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  await act(async () => { root.unmount(); });
});
it('does not narrow prediction history using the descriptive participants', async () => {
  const root = await open(); await selectVariety(root);
  await selectParticipant(root, 'Proveedor de compras', 'Seleccionar proveedor de compras', 'provider-1');
  await selectParticipant(root, 'Comprador de ventas', 'Seleccionar comprador de ventas', 'buyer-1');
  await act(async () => { find(root, 'Hasta').props.onChangeText('2026-10-06'); });
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  expect(predictionReadiness).toHaveBeenCalledWith('token', '2026-10-06', 'v-1');
  expect(analyticsSeries).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});
it('combines historical quality with unreported origin and clears dimensions independently', async () => {
  const root = await open();
  await act(async () => { find(root, 'Calidad comercial').props.onPress(); });
  const dialog = root.root.findAll(node => node.props.title === 'Filtrar por calidad comercial')[0]!;
  expect(dialog.props.choices).toEqual([
    { id: '', label: 'Todas las calidades' },
    { id: 'unreported', label: 'No informada' },
    { id: 'q-1', label: 'Primera histórica (desactivado)' },
  ]);
  await act(async () => { dialog.props.onSelect({ id: 'q-1' }); });
  await selectParticipant(root, 'Procedencia de la papa', 'Filtrar por procedencia de la papa', 'unreported');
  expect(find(root, 'Procedencia de la papa').props.value).toBe('No informada');
  await query(root);
  expect(analyticsSeries).toHaveBeenLastCalledWith('token', expect.objectContaining({ qualityId: 'q-1', originId: 'unreported' }));
  await selectParticipant(root, 'Calidad comercial', 'Filtrar por calidad comercial', '');
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  await query(root);
  expect(analyticsSeries).toHaveBeenLastCalledWith('token', expect.objectContaining({ qualityId: undefined, originId: 'unreported' }));
  await act(async () => { root.unmount(); });
});
it('discards a late descriptive result after changing characteristics', async () => {
  let resolve!: (value: AnalyticsSeries) => void;
  jest.mocked(analyticsSeries).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const root = await open(); await query(root);
  await selectParticipant(root, 'Calidad comercial', 'Filtrar por calidad comercial', 'unreported');
  await act(async () => { resolve(result); });
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  await act(async () => { root.unmount(); });
});
it('keeps predictive requests by variety after descriptive characteristic selection', async () => {
  const root = await open(); await selectVariety(root);
  await selectParticipant(root, 'Calidad comercial', 'Filtrar por calidad comercial', 'q-1');
  await selectParticipant(root, 'Procedencia de la papa', 'Filtrar por procedencia de la papa', 'unreported');
  await act(async () => { find(root, 'Hasta').props.onChangeText('2026-10-06'); });
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  expect(predictionReadiness).toHaveBeenLastCalledWith('token', '2026-10-06', 'v-1');
  expect(analyticsSeries).not.toHaveBeenCalled();
  await act(async () => { root.unmount(); });
});
it('queries selected filters and invalidates results when the period changes', async () => {
  const root = await open();
  await act(async () => { find(root, 'Desde').props.onChangeText('2026-10-01'); find(root, 'Hasta').props.onChangeText('2026-10-06'); find(root, 'Variedad').props.onPress(); });
  await act(async () => { root.root.findAll(node => node.props.title === 'Seleccionar variedad')[0].props.onSelect({ id: 'v-1' }); });
  await query(root);
  expect(analyticsSeries).toHaveBeenCalledWith('token', { from: '2026-10-01', to: '2026-10-06', varietyId: 'v-1' });
  expect(JSON.stringify(root.toJSON())).toContain('3.2000');
  await act(async () => { find(root, 'Desde').props.onChangeText('2026-09-01'); });
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  expect(analyticsSeries).toHaveBeenCalledTimes(1);
  await act(async () => { root.unmount(); });
});
it('discards an old response when its period has changed', async () => {
  let resolve!: (value: AnalyticsSeries) => void;
  jest.mocked(analyticsSeries).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const root = await open(); await query(root);
  await act(async () => { find(root, 'Desde').props.onChangeText('2026-09-01'); });
  await act(async () => { resolve(result); });
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  expect(find(root, 'Consultar análisis').props.disabled).toBe(false);
  await act(async () => { root.unmount(); });
});
it('retries a failed read and shows a true empty result without invented prices', async () => {
  jest.mocked(analyticsSeries).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce({ ...result, points: [] });
  const root = await open(); await query(root);
  expect(root.root.findAll(node => node.props.title === 'No se pudo consultar')).not.toHaveLength(0);
  await act(async () => { root.root.findAll(node => node.props.actionLabel === 'Reintentar análisis')[0].props.onAction(); });
  expect(root.root.findAll(node => node.props.title === 'Sin operaciones analizables')).not.toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).not.toContain('3.2000');
  expect(analyticsSeries).toHaveBeenCalledTimes(2);
  await act(async () => { root.unmount(); });
});

const history: PredictionReadiness = {
  asOf: '2026-10-06', varietyId: 'v-1', varietyName: 'Canchán', timeZone: 'America/Lima', generatedAt: '2026-10-07T03:00:00Z',
  window: { from: '2026-04-06', to: '2026-10-04', weeksRequired: 26, minimumSalesPerWeek: 5 },
  weeks: Array.from({ length: 26 }, (_, index) => {
    const start = new Date('2026-04-06T00:00:00Z'); start.setUTCDate(start.getUTCDate() + index * 7);
    const end = new Date(start); end.setUTCDate(end.getUTCDate() + 6);
    return { weekStart: start.toISOString().slice(0, 10), weekEnd: end.toISOString().slice(0, 10), validSaleCount: index === 0 ? 1 : 0, sufficient: false, weightKg: index === 0 ? '10.000' : null, priceSolesPerKg: index === 0 ? '2.0000' : null, operationIds: index === 0 ? ['sale-1'] : [], compensationIds: [] };
  }),
  availability:{state:'not_published',publicationId:null,evaluationId:null,checkedAt:'2026-10-12T15:00:00Z',message:'No hay publicación.'},
  sufficientWeeks: 0, dataSufficient: false, predictionAvailable: false, stage: 'insufficient_history', excluded: [],
  criteria: [
    { id: 'history', status: 'unmet', message: '0 de 26 semanas tienen cinco ventas válidas.' },
    { id: 'quality', status: 'met', message: 'Solo se incluyeron datos válidos.' },
    { id: 'scope', status: 'met', message: 'Serie limitada al negocio y variedad.' },
    { id: 'evaluation', status: 'pending', message: 'Falta comparar el MAE con la referencia.' },
    { id: 'coverage', status: 'pending', message: 'Falta verificar la cobertura.' },
    { id: 'review', status: 'pending', message: 'Falta revisión del Mayorista.' },
  ],
};
async function selectVariety(root: ReactTestRenderer) {
  await act(async () => { find(root, 'Variedad').props.onPress(); });
  await act(async () => { root.root.findAll(node => node.props.title === 'Seleccionar variedad')[0].props.onSelect({ id: 'v-1' }); });
}
it('uses a specific variety and cutoff for readiness, independently of the descriptive start date', async () => {
  const root = await open();
  expect(find(root, 'Revisar disponibilidad predictiva').props.disabled).toBe(true);
  await selectVariety(root);
  await act(async () => { find(root, 'Desde').props.onChangeText('2026-10-01'); find(root, 'Hasta').props.onChangeText('2026-10-06'); });
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  expect(predictionReadiness).toHaveBeenCalledWith('token', '2026-10-06', 'v-1');
  expect(analyticsSeries).not.toHaveBeenCalled();
  expect(root.root.findAll(node => node.props.title === 'Historial insuficiente para estimar')).not.toHaveLength(0);
  await act(async () => { find(root, 'Ver semanas revisadas').props.onPress(); });
  expect(JSON.stringify(root.toJSON())).toContain('Sin peso comercial válido; no se calculó precio.');
  expect(JSON.stringify(root.toJSON())).not.toContain('S/');
  await act(async () => { root.unmount(); });
});
it('discards readiness for an old cutoff instead of presenting it under a new one', async () => {
  let resolve!: (value: PredictionReadiness) => void;
  jest.mocked(predictionReadiness).mockReturnValueOnce(new Promise(done => { resolve = done; }));
  const root = await open(); await selectVariety(root);
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  await act(async () => { find(root, 'Hasta').props.onChangeText('2026-09-30'); });
  await act(async () => { resolve(history); });
  expect(root.root.findAll(node => node.props.title === 'Historial insuficiente para estimar')).toHaveLength(0);
  expect(find(root, 'Revisar disponibilidad predictiva').props.disabled).toBe(false);
  await act(async () => { root.unmount(); });
});
it('retries readiness and does not treat sufficient history as a published prediction', async () => {
  jest.mocked(predictionReadiness).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ ...history, sufficientWeeks: 26, dataSufficient: true, stage: 'ready_for_evaluation' });
  const root = await open(); await selectVariety(root);
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  await act(async () => { root.root.findAll(node => node.props.actionLabel === 'Reintentar disponibilidad')[0].props.onAction(); });
  expect(predictionReadiness).toHaveBeenCalledTimes(2);
  expect(root.root.findAll(node => node.props.title === 'Historial apto para evaluación')).not.toHaveLength(0);
  expect(JSON.stringify(root.toJSON())).toContain('Publicar requiere una evaluación que cumpla los criterios');
  expect(JSON.stringify(root.toJSON())).not.toContain('S/');
  await act(async () => { root.unmount(); });
});

it('shows excluded history references and reasons without a predicted price', async () => {
  jest.mocked(predictionReadiness).mockResolvedValueOnce({ ...history, excluded: [{
    operationId: 'excluded-sale-77', operationType: 'sale', varietyId: 'v-1',
    varietyName: 'Canchán', weekStart: '2026-04-06', reason: 'invalid_week',
  }] });
  const root = await open(); await selectVariety(root);
  await act(async () => { find(root, 'Revisar disponibilidad predictiva').props.onPress(); });
  const rendered = JSON.stringify(root.toJSON());
  expect(rendered).toContain('excluded-sale-77');
  expect(rendered).toContain('La fecha no permite identificar una semana comercial válida.');
  expect(rendered).not.toContain('S/');
  await act(async () => { root.unmount(); });
});

it('renders a missing-week explanation while retaining the observed price', async () => {
  const base = result.points[0]!;
  jest.mocked(analyticsSeries).mockResolvedValueOnce({ ...result, points: [
    { ...base, weekStart: '2026-09-21', weekEnd: '2026-09-27', complete: true },
    { ...base, weekStart: '2026-10-05', weekEnd: '2026-10-11', complete: true },
  ] });
  const root = await open(); await query(root);
  const rendered = JSON.stringify(root.toJSON());
  expect(rendered).toContain('falta la semana anterior');
  expect(rendered).toContain('3.2000');
  expect(rendered).not.toContain('respecto a la semana');
  await act(async () => { root.unmount(); });
});

it.each([
  ['current','Publicación vigente'],
  ['requires_reevaluation','Publicación requiere reevaluación'],
  ['not_checked_historical','Corte histórico'],
] as const)('presents %s explicitly without changing the conserved publication',async(state,title)=>{
  jest.mocked(predictionReadiness).mockResolvedValueOnce({...history,predictionAvailable:state==='current',availability:{state,publicationId:state==='not_checked_historical'?null:'pub-original',evaluationId:'eval-original',checkedAt:'2026-10-12T15:00:00Z',message:'Estado central de la publicación.'}});
  const root=await open();await selectVariety(root);
  await act(async()=>{find(root,'Revisar disponibilidad predictiva').props.onPress();});
  expect(root.root.findAll(node=>node.props.title===title).length).toBeGreaterThan(0);
  expect(JSON.stringify(root.toJSON())).toContain('Estado central de la publicación.');
  if(state!=='not_checked_historical')expect(JSON.stringify(root.toJSON())).toContain('pub-original');
  await act(async()=>root.unmount());
});
