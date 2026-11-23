const syncLabels: Record<string, string> = {
  'reception.create': 'Registrar recepción',
  'reception.void': 'Anular recepción',
  'reception.sack-add': 'Registrar pesaje de saco',
  'reception.sack-correct': 'Corregir pesaje de saco',
  'reception.sack-void': 'Anular saco',
  'reception.close': 'Cerrar pesaje',
  'purchase.settle': 'Liquidar compra',
  'purchase.void': 'Anular compra',
  'sale.create': 'Registrar venta',
  'sale.return': 'Registrar devolución comercial',
  'sale.void': 'Anular venta',
  'account.payment': 'Registrar pago o cobro',
  'account.payment-reversal': 'Revertir pago o cobro',
  'freight.settle': 'Liquidar flete',
  'stowage.entry': 'Registrar estiba',
  'stowage.settle': 'Liquidar estiba',
};

export function syncOperationLabel(type: string) {
  return syncLabels[type] ?? 'Operación registrada';
}
