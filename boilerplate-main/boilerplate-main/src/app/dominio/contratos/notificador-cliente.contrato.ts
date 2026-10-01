// =============================================================
// DOMINIO · CONTRATO
// =============================================================
// El contrato dice QUE se necesita: avisarle al cliente.
// El adaptador dira COMO: WhatsApp, correo, SMS o consola.

export interface NotificadorCliente {
  confirmarPedido(clienteId: string, pedidoId: string, total: number): Promise<void>;
}
