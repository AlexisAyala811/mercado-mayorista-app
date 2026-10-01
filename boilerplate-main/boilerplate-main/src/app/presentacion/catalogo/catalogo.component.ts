// =============================================================
// PRESENTACION · Componente del catalogo
// =============================================================
// El componente NO calcula precios ni valida stock: le pide todo
// a los casos de uso. Su unica responsabilidad es mostrar y
// recoger lo que el usuario hace.

import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Producto } from '../../dominio/modelos/producto.modelo';
import { precioParaElCliente } from '../../dominio/modelos/precios';
import { ConsultarCatalogoCasoUso } from '../../aplicacion/consultar-catalogo.caso-uso';
import { AgregarAlCarritoCasoUso } from '../../aplicacion/agregar-al-carrito.caso-uso';
import { EstadoCarrito } from '../estado-carrito.servicio';

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section>
      <header class="barra">
        <h2>Catalogo</h2>
        <select (change)="filtrarPorMascota($any($event.target).value)">
          <option value="">Todas las mascotas</option>
          <option value="perro">Perro</option>
          <option value="gato">Gato</option>
        </select>
      </header>

      @if (mensajeError()) {
        <p class="error">{{ mensajeError() }}</p>
      }

      <div class="rejilla">
        @for (producto of productos(); track producto.id) {
          <article class="tarjeta">
            <h3>{{ producto.nombre }}</h3>
            <p class="meta">{{ producto.categoria }} · {{ producto.mascota }}</p>
            <p class="precio">S/ {{ precioFinal(producto) }}</p>
            <p class="stock">{{ producto.stockDisponible }} disponibles</p>
            <button (click)="agregar(producto)">Agregar al carrito</button>
          </article>
        } @empty {
          <p>No hay productos que coincidan con el filtro.</p>
        }
      </div>
    </section>
  `,
  styles: [`
    .barra { display: flex; justify-content: space-between; align-items: center; }
    .rejilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .tarjeta { border: 1px solid #d0d0d0; border-radius: 8px; padding: 14px; background: #fff; }
    .tarjeta h3 { font-size: 15px; margin: 0 0 6px; }
    .meta { color: #666; font-size: 13px; margin: 0 0 8px; }
    .precio { font-size: 20px; font-weight: bold; margin: 0 0 4px; color: #1f4e79; }
    .stock { font-size: 12px; color: #2e7d32; margin: 0 0 10px; }
    button { width: 100%; padding: 8px; border: 0; border-radius: 4px; background: #1f4e79; color: #fff; cursor: pointer; }
    .error { color: #c62828; font-weight: bold; }
  `],
})
export class CatalogoComponent implements OnInit {
  private readonly consultarCatalogo = inject(ConsultarCatalogoCasoUso);
  private readonly agregarAlCarrito = inject(AgregarAlCarritoCasoUso);
  private readonly estadoCarrito = inject(EstadoCarrito);

  readonly productos = signal<Producto[]>([]);
  readonly mensajeError = signal<string>('');

  async ngOnInit(): Promise<void> {
    await this.cargar();
  }

  private async cargar(mascota?: string): Promise<void> {
    this.productos.set(await this.consultarCatalogo.ejecutar(mascota ? { mascota } : undefined));
  }

  async filtrarPorMascota(mascota: string): Promise<void> {
    await this.cargar(mascota || undefined);
  }

  precioFinal(producto: Producto): number {
    return precioParaElCliente(producto.precioBase);
  }

  async agregar(producto: Producto): Promise<void> {
    this.mensajeError.set('');
    try {
      const nuevoCarrito = await this.agregarAlCarrito.ejecutar({
        carritoActual: this.estadoCarrito.carrito(),
        productoId: producto.id,
        cantidad: 1,
      });
      this.estadoCarrito.actualizar(nuevoCarrito);
    } catch (error) {
      this.mensajeError.set((error as Error).message);
    }
  }
}
