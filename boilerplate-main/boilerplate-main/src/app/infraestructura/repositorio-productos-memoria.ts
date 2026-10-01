// =============================================================
// INFRAESTRUCTURA · Adaptador
// =============================================================
// Cumple el contrato RepositorioProductos guardando en memoria.
// La flecha apunta hacia adentro: este archivo importa el contrato
// del dominio, y el dominio no sabe que este archivo existe.

import { Producto } from '../dominio/modelos/producto.modelo';
import {
  RepositorioProductos,
  FiltroCatalogo,
} from '../dominio/contratos/repositorio-productos.contrato';

const CATALOGO_INICIAL: Producto[] = [
  new Producto('PR001', 'Alimento balanceado adulto 15kg', 'alimento', 'perro', 145.9, 12, 'S01'),
  new Producto('PR002', 'Rascador torre 3 niveles', 'accesorio', 'gato', 219.0, 4, 'S02'),
  new Producto('PR003', 'Shampoo antipulgas 500ml', 'higiene', 'perro', 32.5, 40, 'S01'),
  new Producto('PR004', 'Comedero doble de acero', 'accesorio', 'perro', 48.0, 25, 'S01'),
  new Producto('PR005', 'Arena sanitaria aglomerante 10kg', 'higiene', 'gato', 39.9, 30, 'S02'),
  new Producto('PR006', 'Pelota mordedora resistente', 'juguete', 'perro', 24.5, 18, 'S02'),
];

export class RepositorioProductosMemoria implements RepositorioProductos {
  private readonly productos = new Map<string, Producto>();

  constructor(iniciales: Producto[] = CATALOGO_INICIAL) {
    iniciales.forEach((producto) => this.productos.set(producto.id, producto));
  }

  async listar(filtro?: FiltroCatalogo): Promise<Producto[]> {
    let resultado = [...this.productos.values()];
    if (filtro?.mascota) {
      resultado = resultado.filter((p) => p.mascota === filtro.mascota);
    }
    if (filtro?.categoria) {
      resultado = resultado.filter((p) => p.categoria === filtro.categoria);
    }
    return resultado;
  }

  async buscarPorId(id: string): Promise<Producto | null> {
    return this.productos.get(id) ?? null;
  }

  async guardar(producto: Producto): Promise<void> {
    this.productos.set(producto.id, producto);
  }
}
