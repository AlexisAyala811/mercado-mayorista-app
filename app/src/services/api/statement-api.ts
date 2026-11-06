import { ApiError, apiRequest } from './api-client';

// Spec 009 (T940): buyer account statement summary, as the server computes it.
export type StatementInstallment = { dueOn: string; outstandingCents: string; overdue: boolean };
export type StatementSale = {
  saleId: string; saleCode: string; saleDate: string;
  initialCents: string; paidCents: string; returnedCents: string; outstandingCents: string;
  installments: StatementInstallment[];
};
export type BuyerStatement = {
  statementNumber: string; cutoffAt: string; cutoffDate: string; businessName: string;
  buyer: { id: string; name: string };
  totals: { outstandingCents: string; overdueCents: string; nextDue: { dueOn: string; amountCents: string } | null };
  sales: StatementSale[];
  imageAvailable: boolean; imageLimit: number;
};

export const getBuyerStatement = (token: string, buyerId: string) =>
  apiRequest<BuyerStatement>(`/receipts/buyer-statements/${encodeURIComponent(buyerId)}`, { token });

// Text for the errors the statement routes return (spec 009).
export function statementErrorMessage(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 404) return 'El comprador ya no existe o no pertenece a este negocio.';
    if (cause.status === 409 && cause.code === 'statement-inconsistent') return 'Las cifras de una cuenta del comprador no cuadran. No se generó el estado de cuenta; revisa la cuenta en Cobranzas.';
    if (cause.status === 409) return 'Las cuentas cambiaron mientras se preparaba el estado de cuenta. Vuelve a intentarlo.';
    if (cause.status === 422 && cause.code === 'statement-image-too-long') return 'El estado de cuenta es demasiado largo para una imagen. Envía el PDF.';
    if (cause.status === 403) return 'Solo el Mayorista puede generar y enviar estados de cuenta.';
  }
  return cause instanceof Error ? cause.message : 'No se pudo preparar el estado de cuenta.';
}
