import { dayBadge, highestPriceVariety, purchaseVarietyView, type PurchaseVarietyRow } from '@/domain/shared/purchase-report';

// Spec 011, CL-ST34.
const row = (id: string, name: string, sacks: string, weight: string, subtotal: string | null): PurchaseVarietyRow => ({ id, name, operations: '1', sacks, subtotal, weight });
const rows = [
  row('canchan', 'Canchán', '620', '31000.000', '4371000'),
  row('yungay', 'Yungay', '480', '24000.000', '3144000'),
  row('amarilla', 'Amarilla Tumbay', '380', '19000.000', '4104000'),
  row('nueva', 'Papa nueva', '10', '500.000', null),
];

it('totals the varieties and the average weighted by kilograms of the settled ones', () => {
  const all = purchaseVarietyView(rows, 'all');
  expect(all.visible).toHaveLength(4);
  expect(all.footer).toMatchObject({ title: 'TOTAL GENERAL', sacks: '1490', total: 'S/ 116,190.00', pending: true });
  expect(all.footer.weight).toBe('74500 kg');
  expect(all.footer.average).toBe('S/ 1.57');
});

it('isolates one variety and labels its footer as a subtotal', () => {
  const one = purchaseVarietyView(rows, 'amarilla');
  expect(one.visible.map((item) => item.id)).toEqual(['amarilla']);
  expect(one.footer).toMatchObject({ title: 'SUBTOTAL', sacks: '380', total: 'S/ 41,040.00', average: 'S/ 2.16', pending: false });
  expect(purchaseVarietyView(rows, 'nueva').footer).toMatchObject({ total: 'S/ 0.00', average: '—', pending: true });
});

it('finds the variety paid at the highest price among the settled ones', () => {
  expect(highestPriceVariety(rows)).toEqual({ average: 'S/ 2.16', name: 'Amarilla Tumbay' });
  expect(highestPriceVariety([row('x', 'Sin liquidar', '1', '50.000', null)])).toBeNull();
});

it('writes the badge of a touched day', () => {
  expect(dayBadge({ amount: '2323800', date: '2026-11-11', operations: '2', sacks: '32', weight: '1612.000' })).toBe('11/11: 1612 kg · S/ 23,238.00 · 32 sacos · 2 operaciones');
});
