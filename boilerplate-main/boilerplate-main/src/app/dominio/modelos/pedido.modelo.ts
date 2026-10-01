// =============================================================
// DOMINIO · Entidad Pedido
// =============================================================
import { LineaCarrito } from './carrito.modelo';

export type EstadoPedido = 'pagado' | 'despachado' | 'entregado' | 'cancelado';

export class Pedido {
  private constructor(
    public readonly id: string,
    public readonly clienteId: string,
    public readonly lineas: ReadonlyArray<LineaCarrito>,
    public readonly total: number,
    public readonly autorizacion: string,
    private estado: EstadoPedido,
  ) {}

  /** REGLA DE NEGOCIO: un pedido no nace vacio ni sin cliente. */
  static crear(
    clienteId: string,
    lineas: ReadonlyArray<LineaCarrito>,
    total: number,
    autorizacion: string,
  ): Pedido {
    if (!clienteId) throw new Error('Un pedido debe tener un cliente');
    if (lineas.length === 0) throw new Error('Un pedido no puede estar vacio');
    if (total <= 0) throw new Error('El total del pedido debe ser mayor que cero');

    const id = 'PED-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    return new Pedido(id, clienteId, lineas, total, autorizacion, 'pagado');
  }

  get estadoActual(): EstadoPedido {
    return this.estado;
  }

  /** REGLA DE NEGOCIO: un pedido despachado ya no se cancela. */
  puedeCancelarse(): boolean {
    return this.estado === 'pagado';
  }

  cancelar(): void {
    if (!this.puedeCancelarse()) {
      throw new Error(`Un pedido ${this.estado} ya no puede cancelarse`);
    }
    this.estado = 'cancelado';
  }
}
