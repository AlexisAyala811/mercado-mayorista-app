// =============================================================
// DOMINIO · CONTRATO
// =============================================================
// Observe el vocabulario: "cobrar". No dice Niubiz, ni Culqi,
// ni paymentIntents. Habla el idioma del negocio, no el del
// proveedor. Por eso se puede cambiar de proveedor sin tocarlo.

export interface ResultadoCobro {
  aprobado: boolean;
  codigoAutorizacion: string;
  motivoRechazo?: string;
}

export interface ProcesadorPagos {
  cobrar(monto: number, medioPago: string): Promise<ResultadoCobro>;
}
