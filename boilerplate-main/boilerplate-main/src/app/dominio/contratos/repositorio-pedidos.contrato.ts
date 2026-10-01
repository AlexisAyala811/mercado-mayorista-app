// =============================================================
// DOMINIO · CONTRATO
// =============================================================
import { Pedido } from '../modelos/pedido.modelo';

export interface RepositorioPedidos {
  guardar(pedido: Pedido): Promise<void>;
  buscarPorId(id: string): Promise<Pedido | null>;
  listarPorCliente(clienteId: string): Promise<Pedido[]>;
}
