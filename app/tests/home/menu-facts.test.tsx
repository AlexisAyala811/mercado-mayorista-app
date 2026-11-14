import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ModuleCard } from '@/features/home/components/module-card';
import { menuBadges, menuFacts, useMenuFacts } from '@/features/home/menu-facts';
import { menuModules } from '@/features/home/menu-modules';
import type { ModuleId } from '@/features/auth/authorization/permissions';
import { ApiUnavailableError } from '@/services/api/api-client';
import { purchaseHistorySummary, salesHistorySummary } from '@/services/api/history-api';

jest.mock('@/services/api/history-api', () => ({ purchaseHistorySummary: jest.fn(), salesHistorySummary: jest.fn() }));
jest.mock('expo-symbols', () => ({ SymbolView: (props: { fallback: unknown }) => props.fallback }));

const summary = (all: number, voided: number, balanceCents: string, totalCents = '0', debt = 0) => ({ balanceCents, counts: { all, debt, paid: all - voided - debt, unsettled: 0, voided }, paidCents: '0', totalCents });

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.mocked(purchaseHistorySummary).mockReset();
  jest.mocked(salesHistorySummary).mockReset();
});

// Spec 011 (RQ-ST01, CL-ST08).
it('writes each live line from the server data and the local queue', () => {
  const source = { payableCents: '842000', payableCount: 3, pendingOperations: 3, purchasesToday: 12, purchasesTodayCents: '3150000', receivableCents: '1435000', receivableCount: 1, salesToday: 4, salesTodayCents: '4825000' };
  expect(menuFacts(source)).toEqual({
    collections: 'Por cobrar S/ 14,350.00',
    debts: 'Por pagar S/ 8,420.00',
    'purchase-history': 'Hoy S/ 31,500.00',
    'sales-history': 'Hoy S/ 48,250.00',
    'sync-queue': '3 en cola',
  });
  // RQ-ST11: the pill of each card.
  expect(menuBadges(source)).toEqual({ collections: '1 pendiente', debts: '3 pendientes', 'purchase-history': '12 hoy', 'sales-history': '4 hoy' });
  expect(menuBadges({ pendingOperations: 0 })).toEqual({});
  expect(menuFacts({ pendingOperations: 0 })).toEqual({ 'sync-queue': 'Sin pendientes' });
});

function Probe({ modules, onFacts }: { modules: ModuleId[]; onFacts: (facts: object, badges: object) => void }) {
  const { badges, facts } = useMenuFacts('token', modules, 0);
  onFacts(facts, badges);
  return null;
}

let latestBadges: object = {};
async function factsFor(modules: ModuleId[]) {
  let latest: object = {};
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<Probe modules={modules} onFacts={(facts, badges) => { latest = facts; latestBadges = badges; }} />);
  });
  await act(async () => root.unmount());
  return latest;
}

it('reads today counts without voided operations and the open balances of the modules shown', async () => {
  jest.mocked(purchaseHistorySummary).mockImplementation(async (_token, filters) => (filters?.from ? summary(5, 1, '0', '120000') : summary(30, 2, '842000', '0', 3)));
  jest.mocked(salesHistorySummary).mockImplementation(async (_token, filters) => (filters?.from ? summary(3, 0, '0', '90000') : summary(9, 1, '1435000', '0', 2)));
  expect(await factsFor(['purchase-history', 'debts', 'sales-history', 'collections', 'sync-queue'])).toEqual({
    collections: 'Por cobrar S/ 14,350.00',
    debts: 'Por pagar S/ 8,420.00',
    'purchase-history': 'Hoy S/ 1,200.00',
    'sales-history': 'Hoy S/ 900.00',
    'sync-queue': 'Sin pendientes',
  });
  expect(latestBadges).toEqual({ collections: '2 pendientes', debts: '3 pendientes', 'purchase-history': '4 hoy', 'sales-history': '3 hoy' });
});

it('hides only the line that could not be read and never asks for modules the profile does not show', async () => {
  jest.mocked(purchaseHistorySummary).mockRejectedValue(new ApiUnavailableError());
  jest.mocked(salesHistorySummary).mockResolvedValue(summary(2, 0, '5000'));
  expect(await factsFor(['purchase-history', 'debts', 'sales-history', 'collections'])).toEqual({
    collections: 'Por cobrar S/ 50.00',
    'sales-history': 'Hoy S/ 0.00',
    'sync-queue': 'Sin pendientes',
  });
  jest.mocked(purchaseHistorySummary).mockClear();
  jest.mocked(salesHistorySummary).mockClear();
  // The Encargado's menu (Anote, Ventas, Pendientes de envío) requests nothing.
  expect(await factsFor(['purchases', 'sales', 'sync-queue'])).toEqual({ 'sync-queue': 'Sin pendientes' });
  expect(purchaseHistorySummary).not.toHaveBeenCalled();
  expect(salesHistorySummary).not.toHaveBeenCalled();
});

it('shows the order, the pill, the icon and the live line of a card, and tells them to the screen reader', async () => {
  const module = menuModules.find((item) => item.id === 'debts')!;
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<ModuleCard badge="3 pendientes" fact="Por pagar S/ 8420.00" module={module} order={4} />);
  });
  const read = () => root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));
  expect(read()).toEqual(expect.arrayContaining(['04', '3 pendientes', 'DE', 'DEUDAS', 'Por pagar S/ 8420.00']));
  const card = root.root.findAll((node) => node.props.accessibilityRole === 'button')[0]!;
  expect(card.props.accessibilityLabel).toBe('Deudas');
  expect(card.props.accessibilityHint).toContain('3 pendientes');
  expect(card.props.accessibilityHint).toContain('Por pagar S/ 8420.00');
  // Without live data the card keeps its own pill and foot line, never an old value.
  await act(async () => root.update(<ModuleCard module={module} order={4} />));
  expect(read()).toEqual(expect.arrayContaining(['Proveedores', 'Saldos por pagar']));
  expect(menuModules.every((item) => item.icon.length > 0)).toBe(true);
  await act(async () => root.unmount());
});
