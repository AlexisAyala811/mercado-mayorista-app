// =============================================================
// DOMINIO · Entidad Carrito
// =============================================================
// El carrito es inmutable: agregar o quitar devuelve un carrito
// nuevo. Asi la interfaz nunca puede dejarlo en un estado invalido.

import { Producto } from './producto.modelo';
import { precioParaElCliente, totalConIgv, redondear } from './precios';

export interface LineaCarrito {
  producto: Producto;
  cantidad: number;
}

export class Carrito {
  private constructor(private readonly lineas: LineaCarrito[]) {}

  static vacio(): Carrito {
    return new Carrito([]);
  }

  get items(): ReadonlyArray<LineaCarrito> {
    return this.lineas;
  }

  get cantidadDeItems(): number {
    return this.lineas.reduce((suma, linea) => suma + linea.cantidad, 0);
  }

  estaVacio(): boolean {
    return this.lineas.length === 0;
  }

  /** REGLA DE NEGOCIO: no se puede agregar mas de lo que hay en stock. */
  agregar(producto: Producto, cantidad: number): Carrito {
    if (cantidad <= 0) {
      throw new Error('La cantidad debe ser mayor que cero');
    }
    const existente = this.lineas.find((l) => l.producto.id === producto.id);
    const cantidadFinal = (existente?.cantidad ?? 0) + cantidad;

    if (!producto.hayStockPara(cantidadFinal)) {
      throw new Error(`Stock insuficiente para ${producto.nombre}`);
    }

    const nuevas = existente
      ? this.lineas.map((l) =>
          l.producto.id === producto.id ? { producto, cantidad: cantidadFinal } : l,
        )
      : [...this.lineas, { producto, cantidad }];

    return new Carrito(nuevas);
  }

  quitar(productoId: string): Carrito {
    return new Carrito(this.lineas.filter((l) => l.producto.id !== productoId));
  }

  vaciar(): Carrito {
    return Carrito.vacio();
  }

  /** Precio unitario que paga el cliente por una unidad. */
  precioUnitario(producto: Producto): number {
    return precioParaElCliente(producto.precioBase);
  }

  /** Importe de una linea del carrito, según la regla de precios del dominio. */
  importeLinea(linea: LineaCarrito): number {
    return redondear(this.precioUnitario(linea.producto) * linea.cantidad);
  }

  /** Subtotal: suma de los precios al cliente, con la comision incluida. */
  calcularSubtotal(): number {
    const suma = this.lineas.reduce(
      (total, linea) => total + this.importeLinea(linea),
      0,
    );
    return redondear(suma);
  }

  calcularTotal(): number {
    return totalConIgv(this.calcularSubtotal());
  }
}
