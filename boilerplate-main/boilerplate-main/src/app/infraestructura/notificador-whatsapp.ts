// =============================================================
// INFRAESTRUCTURA · Adaptador de notificacion alternativo
// =============================================================
// Mismo contrato, otro canal. Si manana el marketplace prefiere
// correo o SMS, se escribe otro adaptador y tampoco se toca el
// dominio ni el caso de uso.

import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { NotificadorCliente } from '../dominio/contratos/notificador-cliente.contrato';

export class NotificadorWhatsApp implements NotificadorCliente {
  constructor(
    private readonly http: HttpClient,
    private readonly urlMensajeria: string,
  ) {}

  async confirmarPedido(clienteId: string, pedidoId: string, total: number): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.urlMensajeria}/mensajes`, {
        destinatario: clienteId,
        texto: `Su pedido ${pedidoId} por S/ ${total} fue confirmado. Gracias por su compra.`,
      }),
    );
  }
}
