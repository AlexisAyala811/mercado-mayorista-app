// =============================================================
// INFRAESTRUCTURA · Adaptador de pagos alternativo
// =============================================================
// Cambiar de proveedor de pagos = escribir este archivo y
// cambiar UNA linea en app.config.ts.
// Ni el dominio ni el caso de uso se enteran.

import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import {
  ProcesadorPagos,
  ResultadoCobro,
} from '../dominio/contratos/procesador-pagos.contrato';

interface RespuestaNiubiz {
  dataMap: { ACTION_CODE: string; AUTHORIZATION_CODE: string; ACTION_DESCRIPTION: string };
}

export class ProcesadorPagosNiubiz implements ProcesadorPagos {
  constructor(
    private readonly http: HttpClient,
    private readonly urlPasarela: string,
    private readonly comercioId: string,
  ) {}

  async cobrar(monto: number, medioPago: string): Promise<ResultadoCobro> {
    const respuesta = await firstValueFrom(
      this.http.post<RespuestaNiubiz>(`${this.urlPasarela}/authorization`, {
        merchantId: this.comercioId,
        amount: monto,
        card: medioPago,
        currency: 'PEN',
      }),
    );

    // TRADUCCION: el vocabulario del proveedor pasa al nuestro.
    const aprobado = respuesta.dataMap.ACTION_CODE === '000';
    return {
      aprobado,
      codigoAutorizacion: respuesta.dataMap.AUTHORIZATION_CODE,
      motivoRechazo: aprobado ? undefined : respuesta.dataMap.ACTION_DESCRIPTION,
    };
  }
}
