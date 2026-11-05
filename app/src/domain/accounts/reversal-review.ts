type ReversalPayment = {
  id: string;
  amountCents: string;
  isReversal: boolean;
  reversedPaymentId?: string | null;
};
type ReversalAccount = {
  state: 'open' | 'paid' | 'voided';
  balanceCents: string;
};
export function paymentWasReversed(paymentId: string, payments: readonly ReversalPayment[]) {
  return payments.some(payment => payment.isReversal && payment.reversedPaymentId === paymentId);
}
export function reviewPaymentReversal(account: ReversalAccount, payments: readonly ReversalPayment[], paymentId: string, reason: string) {
  const invalid = (message: string) => ({ kind: 'invalid' as const, message });
  if (account.state === 'voided') return invalid('La cuenta anulada no admite reversos.');
  const payment = payments.find(item => item.id === paymentId);
  if (!payment || payment.isReversal) return invalid('Selecciona un pago o cobro original del historial.');
  if (paymentWasReversed(paymentId, payments)) return invalid('El movimiento ya fue revertido. Actualiza la cuenta para revisar su historial.');
  const normalizedReason = reason.trim();
  if (!normalizedReason || normalizedReason.length > 240) return invalid('Indica un motivo del reverso de 1 a 240 caracteres.');
  if (!/^\d+$/.test(account.balanceCents) || !/^\d+$/.test(payment.amountCents) || BigInt(payment.amountCents) === 0n)
    return invalid('No se pudo comprobar el saldo o importe original. Actualiza la cuenta antes de continuar.');
  const before = BigInt(account.balanceCents);
  const amount = BigInt(payment.amountCents);
  return { kind: 'ready' as const, amountCents: amount.toString(), beforeCents: before.toString(), afterCents: (before + amount).toString(), reason: normalizedReason };
}
