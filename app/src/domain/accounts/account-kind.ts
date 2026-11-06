// Spec 011 (CL-FM18): Deudas (to providers) and Cobranzas (from buyers) are
// two screens with their own wording and their own save confirmation.
export type AccountKind = 'payable' | 'receivable';

export type AccountKindCopy = {
  title: string;
  eyebrow: string;
  detailTitle: string;
  searchLabel: string;
  counterparty: string;
  movement: string;
  amountLabel: string;
  confirmTitle: string;
  confirmLabel: string;
  savedTitle: string;
  savedMessage: string;
  empty: string;
  originSource: 'purchase' | 'sale';
  originLabel: string;
};

export const accountKindCopy: Record<AccountKind, AccountKindCopy> = {
  payable: {
    title: 'Deudas',
    eyebrow: 'COMPRA · DEUDAS A PROVEEDORES',
    detailTitle: 'Deuda con el proveedor',
    searchLabel: 'Proveedor o referencia',
    counterparty: 'proveedor',
    movement: 'Pago',
    amountLabel: 'Pago al proveedor (S/)',
    confirmTitle: '¿Confirmar pago al proveedor?',
    confirmLabel: 'Registrar pago',
    savedTitle: 'Pago guardado',
    savedMessage: 'El pago al proveedor quedó registrado. El saldo se actualiza desde el servidor.',
    empty: 'No hay deudas con proveedores. Se crean al liquidar una compra a crédito.',
    originSource: 'purchase',
    originLabel: 'Registrar compra',
  },
  receivable: {
    title: 'Cobranzas',
    eyebrow: 'VENTA · COBRANZAS A COMPRADORES',
    detailTitle: 'Cobranza al comprador',
    searchLabel: 'Comprador o referencia',
    counterparty: 'comprador',
    movement: 'Cobro',
    amountLabel: 'Cobro al comprador (S/)',
    confirmTitle: '¿Confirmar cobro al comprador?',
    confirmLabel: 'Registrar cobro',
    savedTitle: 'Cobro guardado',
    savedMessage: 'El cobro al comprador quedó registrado. El saldo se actualiza desde el servidor.',
    empty: 'No hay cobranzas pendientes. Se crean al confirmar una venta a crédito.',
    originSource: 'sale',
    originLabel: 'Registrar venta',
  },
};
