// =============================================================
// PRESENTACION · Estado de la interfaz
// =============================================================
// Este servicio NO contiene reglas de negocio: solo guarda cual
// es el carrito actual para que los componentes lo compartan.
// Las reglas viven dentro de la entidad Carrito del dominio.

import { Injectable, computed, signal } from '@angular/core';
import { Carrito } from '../dominio/modelos/carrito.modelo';

@Injectable({ providedIn: 'root' })
export class EstadoCarrito {
  private readonly carritoInterno = signal<Carrito>(Carrito.vacio());

  readonly carrito = this.carritoInterno.asReadonly();
  readonly cantidadDeItems = computed(() => this.carritoInterno().cantidadDeItems);
  readonly subtotal = computed(() => this.carritoInterno().calcularSubtotal());
  readonly total = computed(() => this.carritoInterno().calcularTotal());
  readonly estaVacio = computed(() => this.carritoInterno().estaVacio());

  actualizar(nuevoCarrito: Carrito): void {
    this.carritoInterno.set(nuevoCarrito);
  }

  vaciar(): void {
    this.carritoInterno.set(Carrito.vacio());
  }
}
