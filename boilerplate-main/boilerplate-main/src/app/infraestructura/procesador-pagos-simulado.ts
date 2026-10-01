// =============================================================
// INFRAESTRUCTURA · Adaptador de pagos para desarrollo y clase
// =============================================================
// Responde al instante, sin credenciales y sin internet.
// Gracias a el se puede demostrar toda la compra en el aula.

import {
  ProcesadorPagos,
  ResultadoCobro,
} from '../dominio/contratos/procesador-pagos.contrato';

export class ProcesadorPagosSimulado implements ProcesadorPagos {
  constructor(private readonly aprobarSiempre: boolean = true) {}

  async cobrar(monto: number, medioPago: string): Promise<ResultadoCobro> {
    if (medioPago.replace(/\s/g, '').length < 12) {
      return {
        aprobado: false,
        codigoAutorizacion: '',
        motivoRechazo: 'numero de tarjeta invalido',
      };
    }
    if (!this.aprobarSiempre) {
      return {
        aprobado: false,
        codigoAutorizacion: '',
        motivoRechazo: 'fondos insuficientes',
      };
    }
    return {
      aprobado: true,
      codigoAutorizacion: 'SIM-' + Math.round(monto * 100),
    };
  }
}
