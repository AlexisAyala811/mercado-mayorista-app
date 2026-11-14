import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { HistoryCard } from '@/domain/shared/history-cards';
import { CommercialHistoryList, type HistoryListState } from '@/features/history/commercial-history-list';

jest.mock('@/ui/components', () => {
  const react = jest.requireActual('react');
  const control = (props: object) => react.createElement('test-control', props);
  return { AppButton: control, EmptyState: control, FeedbackState: control, FormField: control, LoadingState: control, MetricTile: control };
});

const card = (id: string, state: HistoryCard['state'], balanceCents = '0'): HistoryCard => ({
  balanceCents, date: '2026-11-07', id, paidCents: state === 'debt' ? '0' : '20000', party: `Proveedor ${id}`, sacks: 2,
  sourceId: state === 'unsettled' ? null : `s-${id}`, state, totalCents: '20000', varieties: ['Canchán'], weightKg: '100.000',
});
const summary = { balanceCents: '20000', counts: { all: 3, debt: 1, paid: 1, unsettled: 1, voided: 0 }, paidCents: '20000', totalCents: '40000' };

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

const controls = (root: ReactTestRenderer, predicate: (props: Record<string, unknown>) => boolean) =>
  root.root.findAll((node) => (node.type as unknown) === 'test-control' && predicate(node.props));
// Status chips (Pressable with a count bubble, spec 011 CL-ST18).
const radios = (root: ReactTestRenderer) => root.root.findAll((node) => node.props.accessibilityRole === 'radio' && typeof node.props.onPress === 'function');
const control = (root: ReactTestRenderer, label: string) => controls(root, (props) => props.label === label)[0]!;
const texts = (root: ReactTestRenderer) => root.root.findAll((node) => (node.type as unknown) === 'Text').map((node) => [node.props.children].flat().join(''));

async function render(options: Partial<Parameters<typeof CommercialHistoryList>[0]> = {}) {
  const loadPage = jest.fn(async () => ({ items: [card('a', 'debt', '20000'), card('b', 'paid'), card('c', 'unsettled')], total: 3 }));
  const loadSummary = jest.fn(async () => summary);
  const onOpen = jest.fn();
  const onSettle = jest.fn();
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<CommercialHistoryList kind="purchase" loadPage={loadPage} loadSummary={loadSummary} onOpen={onOpen} onSettle={onSettle} {...options} />);
  });
  return { loadPage: (options.loadPage as jest.Mock) ?? loadPage, loadSummary: (options.loadSummary as jest.Mock) ?? loadSummary, onOpen, onSettle, root };
}

// Spec 011 (RQ-ST05).
it('opens with the list, the chips with server counts and the three totals of the filter', async () => {
  const { loadPage, loadSummary, root } = await render();
  expect(loadPage).toHaveBeenCalledWith({}, 'all', 0);
  expect(loadSummary).toHaveBeenCalledWith({});
  expect(radios(root).map((node) => node.props.accessibilityLabel)).toEqual(['Todos: 3', 'Pagados: 1', 'Falta pagar: 1', 'Sin liquidar: 1', 'Anulados: 0']);
  expect(controls(root, (props) => typeof props.value === 'string' && String(props.label).startsWith('Total')).map((node) => [node.props.label, node.props.value])).toEqual([
    ['Total compras', 'S/ 400.00'], ['Total pagado', 'S/ 200.00'],
  ]);
  expect(control(root, 'Saldo pendiente').props.value).toBe('S/ 200.00');
  expect(root.root.findAll((node) => typeof node.type === 'string' && typeof node.props.testID === 'string' && node.props.testID.startsWith('history-'))).toHaveLength(3);
  await act(async () => root.unmount());
});

it('offers «Cobrar» only on a sale with debt and the same buttons as a purchase', async () => {
  const onTicket = jest.fn(); const onEdit = jest.fn(); const onVoid = jest.fn();
  const { onSettle, root } = await render({ kind: 'sale', onEdit, onTicket, onVoid });
  const press = (label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]!.props.onPress();
  const settle = controls(root, (props) => props.label === 'Cobrar');
  expect(settle).toHaveLength(1);
  await act(async () => settle[0]!.props.onPress());
  expect(onSettle).toHaveBeenCalledWith(expect.objectContaining({ id: 'a', sourceId: 's-a' }));
  await act(async () => press('Ver ticket de Proveedor b, 2026-11-07'));
  expect(onTicket).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  await act(async () => press('Editar venta de Proveedor b'));
  expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  await act(async () => press('Anular venta de Proveedor b'));
  expect(onVoid).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
  expect(texts(root)).toEqual(expect.arrayContaining(['Por cobrar', 'Cobrado', 'Canchán']));
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Volumen / peso: 2 sacos (100 kg)').length).toBeGreaterThan(0);
  await act(async () => root.unmount());
});

it('filters by chip in the server without asking for the totals again', async () => {
  const { loadPage, loadSummary, root } = await render({ kind: 'sale' });
  await act(async () => radios(root).find((node) => node.props.accessibilityLabel === 'Por cobrar / Deuda: 1')!.props.onPress());
  expect(loadPage).toHaveBeenLastCalledWith({}, 'debt', 0);
  expect(loadSummary).toHaveBeenCalledTimes(1);
  await act(async () => root.unmount());
});

// The calendar only offers existing days (CL-ST32), so a date that does not exist cannot be typed.
it('has no free date field: the day comes from the calendar', async () => {
  const { root } = await render({ kind: 'sale' });
  expect(controls(root, (props) => props.label === 'Desde' || props.label === 'Hasta')).toHaveLength(0);
  expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Fecha: todas')).not.toHaveLength(0);
  await act(async () => root.unmount());
});

it('tells an error from an empty result, retries the same criteria and says when the totals are unavailable', async () => {
  const loadPage = jest.fn().mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValue({ items: [], total: 0 });
  const loadSummary = jest.fn().mockRejectedValue(new Error('Sin conexión'));
  const { root } = await render({ loadPage, loadSummary });
  const failure = controls(root, (props) => props.title === 'No se pudo consultar')[0]!;
  expect(failure.props.message).toBe('Sin conexión');
  expect(texts(root)).toContain('Totales no disponibles sin conexión.');
  expect(controls(root, (props) => props.title === 'Sin resultados')).toHaveLength(0);
  await act(async () => failure.props.onAction());
  expect(loadPage).toHaveBeenLastCalledWith({}, 'all', 0);
  expect(controls(root, (props) => props.title === 'Sin resultados')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('ignores a late page of a replaced search', async () => {
  let finishFirst!: (value: { items: HistoryCard[]; total: number }) => void;
  const loadPage = jest.fn()
    .mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }))
    .mockResolvedValue({ items: [card('new', 'paid')], total: 1 });
  const { root } = await render({ loadPage });
  await act(async () => radios(root).find((node) => node.props.accessibilityLabel === 'Pagados: 1')!.props.onPress());
  await act(async () => finishFirst({ items: [card('old', 'paid')], total: 1 }));
  expect(root.root.findAll((node) => typeof node.type === 'string' && node.props.testID === 'history-old')).toHaveLength(0);
  expect(root.root.findAll((node) => typeof node.type === 'string' && node.props.testID === 'history-new')).toHaveLength(1);
  await act(async () => root.unmount());
});

it('pages through the result and restores search, chip and page when shown again', async () => {
  const loadPage = jest.fn(async (_query: object, _chip: string, offset: number) => ({ items: Array.from({ length: offset ? 5 : 20 }, (_, index) => card(`${offset + index}`, 'paid')), total: 25 }));
  let saved: HistoryListState | undefined;
  const { root } = await render({ loadPage, onStateChange: (state) => { saved = state; } });
  await act(async () => control(root, 'Página siguiente').props.onPress());
  expect(loadPage).toHaveBeenLastCalledWith({}, 'all', 20);
  expect(control(root, 'Página siguiente').props.disabled).toBe(true);
  await act(async () => radios(root).find((node) => node.props.accessibilityLabel === 'Pagados: 1')!.props.onPress());
  await act(async () => control(root, 'Página siguiente').props.onPress());
  expect(saved).toMatchObject({ chip: 'paid', offset: 20 });
  await act(async () => root.unmount());
  const again = await render({ initial: saved, loadPage });
  expect(loadPage).toHaveBeenLastCalledWith({}, 'paid', 20);
  expect(radios(again.root).find((node) => node.props.accessibilityState.checked)!.props.accessibilityLabel).toBe('Pagados: 1');
  await act(async () => again.root.unmount());
});

// Spec 011, CL-ST30: «Ver compras» as in the mockup.
describe('purchase toolbar and cards (CL-ST30)', () => {
  it('searches while typing, picks one day in the calendar and clears it', async () => {
    jest.useFakeTimers();
    try {
      const { loadPage, loadSummary, root } = await render();
      expect(controls(root, (props) => props.label === 'Buscar')).toHaveLength(0);
      await act(async () => { controls(root, (props) => props.label === 'Buscar compras')[0]!.props.onChangeText(' Aurelio '); });
      expect(loadPage).toHaveBeenCalledTimes(1);
      await act(async () => { jest.advanceTimersByTime(450); });
      expect(loadPage).toHaveBeenLastCalledWith({ search: 'Aurelio' }, 'all', 0);
      expect(loadSummary).toHaveBeenLastCalledWith({ search: 'Aurelio' });
      await act(async () => { root.root.findAll((node) => node.props.accessibilityLabel === 'Fecha: todas' && typeof node.props.onPress === 'function')[0]!.props.onPress(); });
      const calendar = root.root.findAll((node) => node.props.title === 'Fecha de las compras' && typeof node.props.onPick === 'function')[0]!;
      await act(async () => { calendar.props.onPick('2026-11-07'); });
      expect(loadPage).toHaveBeenLastCalledWith({ from: '2026-11-07', search: 'Aurelio', to: '2026-11-07' }, 'all', 0);
      await act(async () => { root.root.findAll((node) => node.props.accessibilityLabel === 'Quitar fecha' && typeof node.props.onPress === 'function')[0]!.props.onPress(); });
      expect(loadPage).toHaveBeenLastCalledWith({ from: undefined, search: 'Aurelio', to: undefined }, 'all', 0);
      await act(async () => root.unmount());
    } finally { jest.useRealTimers(); }
  });

  it('offers ticket, edit and void on a settled purchase and the detail on one without settlement', async () => {
    const onTicket = jest.fn(); const onEdit = jest.fn(); const onVoid = jest.fn();
    const { onOpen, onSettle, root } = await render({ onTicket, onEdit, onVoid });
    const press = (label: string) => root.root.findAll((node) => node.props.accessibilityLabel === label && typeof node.props.onPress === 'function')[0]!.props.onPress();
    await act(async () => press('Abonar a Proveedor a, 2026-11-07'));
    expect(onSettle).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
    await act(async () => press('Ver ticket de Proveedor b, 2026-11-07'));
    expect(onTicket).toHaveBeenCalledWith(expect.objectContaining({ id: 'b', sourceId: 's-b' }));
    await act(async () => press('Editar compra de Proveedor b'));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    await act(async () => press('Anular compra de Proveedor b'));
    expect(onVoid).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    // «Sin liquidar» has no settlement: no ticket, no ✎; it opens its detail.
    expect(root.root.findAll((node) => node.props.accessibilityLabel === 'Ver ticket de Proveedor c, 2026-11-07')).toHaveLength(0);
    await act(async () => controls(root, (props) => props.label === 'Ver detalle')[0]!.props.onPress());
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'c' }));
    await act(async () => root.unmount());
  });
});
