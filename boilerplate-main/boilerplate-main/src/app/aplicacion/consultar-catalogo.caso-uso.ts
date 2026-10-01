// =============================================================
// APLICACION · Caso de uso
// =============================================================
// Lea las importaciones: solo cosas del dominio.
// No aparece Angular, ni HttpClient, ni ninguna tecnologia.

import { Producto } from '../dominio/modelos/producto.modelo';
import {
  RepositorioProductos,
  FiltroCatalogo,
} from '../dominio/contratos/repositorio-productos.contrato';

export class ConsultarCatalogoCasoUso {
  constructor(private readonly repositorioProductos: RepositorioProductos) {}

  async ejecutar(filtro?: FiltroCatalogo): Promise<Producto[]> {
    const productos = await this.repositorioProductos.listar(filtro);
    // REGLA DE NEGOCIO: el catalogo solo muestra productos disponibles.
    return productos.filter((producto) => producto.estaDisponible());
  }
}
