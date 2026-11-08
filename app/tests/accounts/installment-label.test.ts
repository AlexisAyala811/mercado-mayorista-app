import { installmentStateLabel } from '@/domain/accounts/installment-label';

describe('installment labels (spec 004, cuotas anuladas)', () => {
  it('reads voided installments as «Anulada», never paid or collected', () => {
    expect(installmentStateLabel('voided', 'voided', 'payable')).toBe('Anulada');
    expect(installmentStateLabel('voided', 'voided', 'receivable')).toBe('Anulada');
  });

  it('treats installments of accounts voided before migration 027 as voided', () => {
    expect(installmentStateLabel('open', 'voided', 'receivable')).toBe('Anulada');
    expect(installmentStateLabel('paid', 'voided', 'payable')).toBe('Anulada');
  });

  it('keeps pending and settled installments with the wording of each kind', () => {
    expect(installmentStateLabel('open', 'open', 'payable')).toBe('Pendiente');
    expect(installmentStateLabel('paid', 'open', 'payable')).toBe('Pagada');
    expect(installmentStateLabel('paid', 'paid', 'receivable')).toBe('Cobrada');
  });
});
