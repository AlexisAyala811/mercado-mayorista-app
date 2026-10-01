// =============================================================
// INFRAESTRUCTURA · Adaptador
// =============================================================
import { Pedido } from '../dominio/modelos/pedido.modelo';
import { RepositorioPedidos } from '../dominio/contratos/repositorio-pedidos.contrato';

export class RepositorioPedidosMemoria implements RepositorioPedidos {
  private readonly pedidos = new Map<string, Pedido>();

  async guardar(pedido: Pedido): Promise<void> {
    this.pedidos.set(pedido.id, pedido);
  }

  async buscarPorId(id: string): Promise<Pedido | null> {
    return this.pedidos.get(id) ?? null;
  }

  async listarPorCliente(clienteId: string): Promise<Pedido[]> {
    return [...this.pedidos.values()].filter((p) => p.clienteId === clienteId);
  }
}
