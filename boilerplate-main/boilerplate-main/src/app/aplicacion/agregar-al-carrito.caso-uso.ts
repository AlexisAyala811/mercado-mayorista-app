// =============================================================
// APLICACION · Caso de uso
// =============================================================
import { Carrito } from '../dominio/modelos/carrito.modelo';
import { RepositorioProductos } from '../dominio/contratos/repositorio-productos.contrato';

export interface AgregarAlCarritoComando {
  carritoActual: Carrito;
  productoId: string;
  cantidad: number;
}

export class AgregarAlCarritoCasoUso {
  constructor(private readonly repositorioProductos: RepositorioProductos) {}

  async ejecutar(comando: AgregarAlCarritoComando): Promise<Carrito> {
    const producto = await this.repositorioProductos.buscarPorId(comando.productoId);
    if (!producto) {
      throw new Error(`Producto no encontrado: ${comando.productoId}`);
    }
    // La validacion de stock la hace el CARRITO, que es quien conoce la regla.
    return comando.carritoActual.agregar(producto, comando.cantidad);
  }
}
