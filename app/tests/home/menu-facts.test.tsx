import { Text } from 'react-native';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ModuleCard } from '@/features/home/components/module-card';
import { menuFacts, useMenuFacts } from '@/features/home/menu-facts';
import { menuModules } from '@/features/home/menu-modules';
import type { ModuleId } from '@/features/auth/authorization/permissions';
import { ApiUnavailableError } from '@/services/api/api-client';
import { purchaseHistorySummary, salesHistorySummary } from '@/services/api/history-api';

jest.mock('@/services/api/history-api', () => ({ purchaseHistorySummary: jest.fn(), salesHistorySummary: jest.fn() }));
jest.mock('expo-symbols', () => ({ SymbolView: (props: { fallback: unknown }) => props.fallback }));

const summary = (all: number, voided: number, balanceCents: string) => ({ balanceCents, counts: { all, debt: 0, paid: all - voided, unsettled: 0, voided }, paidCents: '0', totalCents: '0' });

beforeEach(() => {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  jest.mocked(purchaseHistorySummary).mockReset();
  jest.mocked(salesHistorySummary).mockReset();
});

// Spec 011 (RQ-ST01, CL-ST08).
it('writes each live line from the server data and the local queue', () => {
  expect(menuFacts({ payableCents: '842000', pendingOperations: 3, purchasesToday: 12, receivableCents: '1435000', salesToday: 4 })).toEqual({
    collections: 'Por cobrar S/ 14350.00',
    debts: 'Por pagar S/ 8420.00',
    'purchase-history': '12 hoy',
    'sales-history': '4 hoy',
    'sync-queue': '3 en cola',
  });
  expect(menuFacts({ pendingOperations: 0 })).toEqual({ 'sync-queue': 'Sin pendientes' });
});

function Probe({ modules, onFacts }: { modules: ModuleId[]; onFacts: (facts: object) => void }) {
  const { facts } = useMenuFacts('token', modules, 0);
  onFacts(facts);
  return null;
}

async function factsFor(modules: ModuleId[]) {
  let latest: object = {};
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<Probe modules={modules} onFacts={(facts) => { latest = facts; }} />);
  });
  await act(async () => root.unmount());
  return latest;
}

it('reads today counts without voided operations and the open balances of the modules shown', async () => {
  jest.mocked(purchaseHistorySummary).mockImplementation(async (_token, filters) => (filters?.from ? summary(5, 1, '0') : summary(30, 2, '842000')));
  jest.mocked(salesHistorySummary).mockImplementation(async (_token, filters) => (filters?.from ? summary(3, 0, '0') : summary(9, 1, '1435000')));
  expect(await factsFor(['purchase-history', 'debts', 'sales-history', 'collections', 'sync-queue'])).toEqual({
    collections: 'Por cobrar S/ 14350.00',
    debts: 'Por pagar S/ 8420.00',
    'purchase-history': '4 hoy',
    'sales-history': '3 hoy',
    'sync-queue': 'Sin pendientes',
  });
});

it('hides only the line that could not be read and never asks for modules the profile does not show', async () => {
  jest.mocked(purchaseHistorySummary).mockRejectedValue(new ApiUnavailableError());
  jest.mocked(salesHistorySummary).mockResolvedValue(summary(2, 0, '5000'));
  expect(await factsFor(['purchase-history', 'debts', 'sales-history', 'collections'])).toEqual({
    collections: 'Por cobrar S/ 50.00',
    'sales-history': '2 hoy',
    'sync-queue': 'Sin pendientes',
  });
  jest.mocked(purchaseHistorySummary).mockClear();
  jest.mocked(salesHistorySummary).mockClear();
  // The Encargado's menu (Anote, Ventas, Pendientes de envío) requests nothing.
  expect(await factsFor(['purchases', 'sales', 'sync-queue'])).toEqual({ 'sync-queue': 'Sin pendientes' });
  expect(purchaseHistorySummary).not.toHaveBeenCalled();
  expect(salesHistorySummary).not.toHaveBeenCalled();
});

it('shows the order, the icon and the live line of a card, and tells it to the screen reader', async () => {
  const module = menuModules.find((item) => item.id === 'debts')!;
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(<ModuleCard fact="Por pagar S/ 8420.00" module={module} order={4} />);
  });
  const texts = root.root.findAll((node) => node.type === Text).map((node) => [node.props.children].flat().join(''));
  expect(texts).toEqual(expect.arrayContaining(['04', 'DE', 'Deudas', 'Por pagar S/ 8420.00']));
  const card = root.root.findAll((node) => node.props.accessibilityRole === 'button')[0]!;
  expect(card.props.accessibilityHint).toContain('Por pagar S/ 8420.00');
  expect(menuModules.every((item) => item.icon.length > 0)).toBe(true);
  await act(async () => root.unmount());
});
