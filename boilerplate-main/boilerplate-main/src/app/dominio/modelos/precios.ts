// =============================================================
// DOMINIO · Reglas de precio del marketplace
// =============================================================
// Este archivo NO importa nada de Angular ni de ninguna libreria.
// La comision y el IGV son decisiones del NEGOCIO, no calculos
// auxiliares, y por eso viven aqui y en un solo lugar.

export const COMISION_MARKETPLACE = 0.10;
export const IGV = 0.18;

/** Precio que ve el cliente: el precio del seller mas la comision. */
export function precioParaElCliente(precioBase: number): number {
  return redondear(precioBase * (1 + COMISION_MARKETPLACE));
}

/** Monto del IGV sobre un subtotal. */
export function calcularIgv(subtotal: number): number {
  return redondear(subtotal * IGV);
}

/** Total final que se cobra. */
export function totalConIgv(subtotal: number): number {
  return redondear(subtotal * (1 + IGV));
}

export function redondear(monto: number): number {
  return Math.round(monto * 100) / 100;
}
