import { topParties, varietyShares, varietyTableRow } from '@/domain/shared/report-board';
import { reportPeriod } from '@/domain/shared/report-period';

// Spec 011 (RQ-ST07, CL-ST18): figures of the Stitch reports board.
it('shares the kilograms of each variety and averages the price with integers', () => {
  const rows = [
    { id: 'a', name: 'Canchán', sacks: '6', weight: '300.000', subtotal: '58500' },
    { id: 'b', name: 'Yungay', sacks: '2', weight: '100.000', subtotal: null },
  ];
  expect(varietyShares(rows)).toEqual({ total: '400 kg', items: [
    { id: 'a', name: 'Canchán', weight: '300 kg', share: '75.0%', fraction: 0.75 },
    { id: 'b', name: 'Yungay', weight: '100 kg', share: '25.0%', fraction: 0.25 },
  ] });
  expect(varietyTableRow(rows[0]!)).toEqual({ id: 'a', name: 'Canchán', sacks: '6', weight: '300 kg', average: 'S/ 1.95', total: 'S/ 585.00' });
  expect(varietyTableRow(rows[1]!)).toMatchObject({ average: '—', total: 'Sin liquidar' });
  expect(varietyShares([])).toEqual({ total: '0 kg', items: [] });
});

it('ranks providers by kilograms and marks the ones with a pending balance', () => {
  const row = (id: string, name: string, weight: string, balance = '0') => ({ counterpartyId: id, counterparty: name, sacks: '4', weight, amount: '10000', balance });
  const ranking = topParties([row('p1', 'Aurelio', '200.000'), row('p2', 'Comunidad', '150.000', '42000'), row('p1', 'Aurelio', '100.000'), row('p3', 'Rosa', '50.000'), row('p4', 'Teodoro', '10.000'), row('p5', 'Zenón', '5.000')]);
  expect(ranking.map((item) => [item.position, item.name, item.weight, item.state])).toEqual([
    [1, 'Aurelio', '300 kg', 'Liquidado'],
    [2, 'Comunidad', '150 kg', 'Pendiente S/ 420.00'],
    [3, 'Rosa', '50 kg', 'Liquidado'],
    [4, 'Teodoro', '10 kg', 'Liquidado'],
  ]);
  expect(ranking[0]!.detail).toBe('2 operaciones · 8 sacos');
});

it('offers today and this week, starting on Monday', () => {
  // Wednesday 11 November 2026.
  expect(reportPeriod('today', new Date(2026, 10, 11))).toEqual({ from: '2026-11-11', to: '2026-11-11' });
  expect(reportPeriod('this-week', new Date(2026, 10, 11))).toEqual({ from: '2026-11-09', to: '2026-11-11' });
  // Sunday belongs to the week that started on Monday.
  expect(reportPeriod('this-week', new Date(2026, 10, 15))).toEqual({ from: '2026-11-09', to: '2026-11-15' });
});
