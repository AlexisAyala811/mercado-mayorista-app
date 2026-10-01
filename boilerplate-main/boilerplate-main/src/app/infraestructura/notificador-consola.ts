// =============================================================
// INFRAESTRUCTURA · Adaptador de notificacion
// =============================================================
import { NotificadorCliente } from '../dominio/contratos/notificador-cliente.contrato';

export class NotificadorConsola implements NotificadorCliente {
  async confirmarPedido(clienteId: string, pedidoId: string, total: number): Promise<void> {
    console.log(
      `[Notificacion] Cliente ${clienteId}: su pedido ${pedidoId} por S/ ${total} fue confirmado.`,
    );
  }
}
