import { accountTotals } from '@/domain/accounts/account-totals';
import { historyChips, historyStateLabel, historyVarieties, historyVolume, purchaseCard, saleCard } from '@/domain/shared/history-cards';

// Spec 011 (RQ-ST05).
describe('history cards', () => {
  it('names each payment state as the purchase or the sale says it', () => {
    expect(historyStateLabel('purchase', 'paid')).toBe('Pagado');
    expect(historyStateLabel('sale', 'paid')).toBe('Cobrado');
    expect(historyStateLabel('purchase', 'debt')).toBe('Falta pagar');
    expect(historyStateLabel('purchase', 'unsettled')).toBe('Sin liquidar');
    expect(historyStateLabel('sale', 'voided')).toBe('Anulado');
  });

  it('lists the chips in Stitch order with the server counts, or without counts when they are unknown', () => {
    expect(historyChips('purchase', { all: 4, debt: 2, paid: 1, unsettled: 1, voided: 0 }).map((chip) => `${chip.label} ${chip.count}`)).toEqual(['Todos 4', 'Pagados 1', 'Falta pagar 2', 'Sin liquidar 1', 'Anulados 0']);
    expect(historyChips('sale', null).map((chip) => [chip.id, chip.label, chip.count])).toEqual([
      ['all', 'Todos', null], ['paid', 'Cobradas', null], ['debt', 'Por cobrar / Deuda', null], ['voided', 'Anuladas', null],
    ]);
  });

  it('maps a purchase of the server history and writes its volume in whole kilograms', () => {
    const card = purchaseCard({
      balanceCents: '20000', netWeightKg: '100.400', paidCents: '0', paymentState: 'debt', providerName: null, receivedOn: '2026-11-07',
      receptionId: 'r1', sacks: 2, settlementId: 's1', totalCents: '20000', varieties: ['Canchán', 'Yungay'],
    });
    expect(card).toMatchObject({ date: '2026-11-07', id: 'r1', party: 'Proveedor registrado', sourceId: 's1', state: 'debt' });
    expect(historyVolume(card)).toBe('2 sacos (100 kg)');
    expect(historyVarieties(card)).toBe('Canchán, Yungay');
    expect(historyVarieties({ varieties: [] })).toBe('Sin sacos registrados');
    expect(historyVolume({ sacks: 1, weightKg: '50.000' })).toBe('1 saco (50 kg)');
  });

  it('maps a sale and keeps a voided one without balance or payment', () => {
    const base = { buyerName: 'Distribuidora', createdAt: '2026-11-07T15:00:00Z', id: 'v1', totalAmountCents: '50000' };
    expect(saleCard({ ...base, balanceCents: '30000', paidCents: '20000', paymentState: 'debt', sacks: 5, state: 'confirmed', varieties: ['Canchán'], weightKg: '250.000' }, '07/11/2026')).toMatchObject({
      balanceCents: '30000', date: '07/11/2026', paidCents: '20000', party: 'Distribuidora', sourceId: 'v1', state: 'debt', totalCents: '50000',
    });
    expect(saleCard({ ...base, balanceCents: '30000', paymentState: 'voided', state: 'voided' }, 'x')).toMatchObject({ balanceCents: '0', paidCents: '0', state: 'voided' });
  });
});

// Spec 011 (RQ-ST06).
describe('account totals', () => {
  const lima = (iso: string) => iso.slice(0, 10);
  const accounts = [
    { balanceCents: '30000', kind: 'payable' as const, nextDueOn: '2026-11-03', state: 'open' as const },
    { balanceCents: '20000', kind: 'payable' as const, nextDueOn: '2026-12-01', state: 'open' as const },
    { balanceCents: '0', kind: 'payable' as const, nextDueOn: null, state: 'paid' as const },
    { balanceCents: '99900', kind: 'receivable' as const, nextDueOn: '2026-11-01', state: 'open' as const },
    { balanceCents: '7000', kind: 'payable' as const, nextDueOn: '2026-10-01', state: 'voided' as const },
  ];
  const movements = [
    { amountCents: '10000', category: 'account-payment', createdAt: '2026-11-05T15:00:00Z', direction: 'out' as const },
    { amountCents: '2500', category: 'account-payment-reversal', createdAt: '2026-11-06T15:00:00Z', direction: 'in' as const },
    { amountCents: '4000', category: 'account-payment', createdAt: '2026-10-31T15:00:00Z', direction: 'out' as const },
    { amountCents: '8000', category: 'account-payment', createdAt: '2026-11-04T15:00:00Z', direction: 'in' as const },
    { amountCents: '1000', category: 'account-payment-reversal', createdAt: '2026-11-04T16:00:00Z', direction: 'out' as const },
    { amountCents: '60000', category: 'sale', createdAt: '2026-11-04T16:00:00Z', direction: 'in' as const },
  ];

  it('adds the open balance, the overdue balance and the payments of this month net of reversals', () => {
    expect(accountTotals('payable', accounts, movements, '2026-11-07', lima)).toEqual({ monthCents: '7500', overdueCents: '30000', pendingCents: '50000' });
    expect(accountTotals('receivable', accounts, movements, '2026-11-07', lima)).toEqual({ monthCents: '7000', overdueCents: '99900', pendingCents: '99900' });
  });
});
