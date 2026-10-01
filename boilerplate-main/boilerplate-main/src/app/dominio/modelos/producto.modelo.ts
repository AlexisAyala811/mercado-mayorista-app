// =============================================================
// DOMINIO · Entidad Producto
// =============================================================
// Sin Angular, sin HttpClient, sin base de datos.
// Contiene reglas que serian verdad aunque el marketplace
// funcionara con cuaderno y lapicero.

export const CATEGORIAS_PERMITIDAS = [
  'alimento', 'higiene', 'juguete', 'accesorio', 'salud',
] as const;

export type Categoria = (typeof CATEGORIAS_PERMITIDAS)[number];

export class Producto {
  constructor(
    public readonly id: string,
    public readonly nombre: string,
    public readonly categoria: Categoria,
    public readonly mascota: string,
    public readonly precioBase: number,
    private stock: number,
    public readonly sellerId: string,
  ) {
    if (!nombre || nombre.trim().length < 3) {
      throw new Error('El nombre del producto debe tener al menos 3 caracteres');
    }
    if (!CATEGORIAS_PERMITIDAS.includes(categoria)) {
      throw new Error(`Categoria no permitida: ${categoria}`);
    }
    if (precioBase <= 0) {
      throw new Error('El precio debe ser mayor que cero');
    }
    if (!Number.isInteger(stock) || stock < 0) {
      throw new Error('El stock debe ser un entero mayor o igual a cero');
    }
    if (!sellerId) {
      throw new Error('Todo producto debe tener un seller responsable');
    }
  }

  get stockDisponible(): number {
    return this.stock;
  }

  estaDisponible(): boolean {
    return this.stock > 0;
  }

  /** REGLA DE NEGOCIO: solo se puede comprar si alcanza el stock. */
  hayStockPara(cantidad: number): boolean {
    return cantidad > 0 && this.stock >= cantidad;
  }

  /** REGLA DE NEGOCIO: descontar valida antes de modificar. */
  descontar(cantidad: number): void {
    if (!this.hayStockPara(cantidad)) {
      throw new Error(`Stock insuficiente para ${this.nombre}`);
    }
    this.stock -= cantidad;
  }
}
