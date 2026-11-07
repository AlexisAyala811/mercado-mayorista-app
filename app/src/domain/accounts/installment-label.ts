// Spec 004 (29 de octubre de 2026): an installment of a voided purchase or sale
// reads «Anulada», never paid or collected. Accounts voided before migration
// 027 may still report their installments as open, so the account decides too.
export function installmentStateLabel(
  installment: 'open' | 'paid' | 'voided',
  account: 'open' | 'paid' | 'voided',
  kind: 'payable' | 'receivable',
) {
  if (installment === 'voided' || account === 'voided') return 'Anulada';
  if (installment === 'open') return 'Pendiente';
  return kind === 'payable' ? 'Pagada' : 'Cobrada';
}
