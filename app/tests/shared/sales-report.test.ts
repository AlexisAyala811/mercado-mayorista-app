import { collectionFigures, kilosPerSack, saleClientRows, saleRowCounts, type SaleRow } from '@/domain/shared/sales-report';

// Spec 011, CL-ST33.
const row = (id: string, counterparty: string, date: string, amount: string, advances: string, balance: string, sacks = '10', weight = '500.000'): SaleRow => ({ advances, amount, balance, counterparty, counterpartyId: counterparty, date, id, sacks, weight });

it('collects what is sold minus the open balance and never goes above 100%', () => {
  expect(collectionFigures('194820', '26280')).toMatchObject({ collected: '168540', effective: '86.5', credit: '13.5' });
  expect(collectionFigures('285000', '170000')).toMatchObject({ collected: '115000', effective: '40.4', credit: '59.6' });
  expect(collectionFigures('1000', '5000')).toMatchObject({ collected: '0', effective: '0.0', credit: '100.0' });
  expect(collectionFigures('0', '0')).toMatchObject({ collected: '0', effective: '0.0', credit: '0.0', fraction: 0 });
});

it('averages the kilograms of a sack to one decimal', () => {
  expect(kilosPerSack('750.000', '15')).toBe('50.0');
  expect(kilosPerSack('2280.000', '45')).toBe('50.7');
  expect(kilosPerSack('10.000', '0')).toBeNull();
});

it('filters the sales by state and client, newest first, and totals what is shown', () => {
  const rows = [
    row('1', 'Comercial Los Andes', '2026-11-10', '396500', '396500', '0', '60', '3050.000'),
    row('2', 'Santa Anita Puesto 42', '2026-11-12', '385000', '100000', '285000', '45', '2280.000'),
    row('3', 'Restaurantes del Centro', '2026-11-11', '339000', '0', '339000', '42', '2100.000'),
  ];
  expect(saleRowCounts(rows)).toEqual({ all: 3, collected: 1, credit: 2 });
  const all = saleClientRows(rows, 'all', '');
  expect(all.items.map((item) => item.id)).toEqual(['2', '3', '1']);
  expect(all.totalSacks).toBe('147');
  expect(all.totalAmount).toBe('S/ 11,205.00');
  expect(saleClientRows(rows, 'credit', '').items.map((item) => item.stateLabel)).toEqual(['Crédito', 'Crédito']);
  expect(saleClientRows(rows, 'collected', '').items[0]).toMatchObject({ client: 'Comercial Los Andes', collected: 'S/ 3,965.00', balance: 'S/ 0.00', sacks: '60 sacos' });
  expect(saleClientRows(rows, 'all', ' santa ').items.map((item) => item.id)).toEqual(['2']);
  expect(saleClientRows(rows, 'collected', 'santa').items).toEqual([]);
  // Collected is the total minus the open balance, even when no advance was given.
  expect(saleClientRows(rows, 'all', 'santa').items[0]).toMatchObject({ collected: 'S/ 1,000.00', balance: 'S/ 2,850.00', date: '2026-11-12' });
  expect(saleClientRows([row('d', 'Cliente', '2026-11-12 08:53:19', '90000', '0', '65000')], 'all', '').items[0]).toMatchObject({ collected: 'S/ 250.00', date: '2026-11-12' });
});
