// =============================================================
// PRESENTACION · Componente del carrito
// =============================================================
// PUNTO IMPORTANTE PARA LA CLASE:
// este componente NO recalcula la comision ni el IGV. Le pide el
// total al carrito del dominio. Por eso la regla vive en un solo
// lugar y no puede contradecirse entre el frontend y el backend.

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Pedido } from '../../dominio/modelos/pedido.modelo';
import { LineaCarrito } from '../../dominio/modelos/carrito.modelo';
import { RegistrarCompraCasoUso } from '../../aplicacion/registrar-compra.caso-uso';
import { EstadoCarrito } from '../estado-carrito.servicio';

@Component({
  selector: 'app-carrito',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section>
      <h2>Carrito</h2>

      @if (estadoCarrito.estaVacio()) {
        <p>El carrito esta vacio.</p>
      } @else {
        <table>
          <thead>
            <tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Importe</th></tr>
          </thead>
          <tbody>
            @for (linea of estadoCarrito.carrito().items; track linea.producto.id) {
              <tr>
                <td>{{ linea.producto.nombre }}</td>
                <td class="centro">{{ linea.cantidad }}</td>
                <td class="derecha">S/ {{ precioUnitario(linea) }}</td>
                <td class="derecha">S/ {{ importe(linea) }}</td>
              </tr>
            }
          </tbody>
        </table>

        <div class="totales">
          <p>Subtotal (incluye comision): <strong>S/ {{ estadoCarrito.subtotal() }}</strong></p>
          <p class="total">Total con IGV: <strong>S/ {{ estadoCarrito.total() }}</strong></p>
        </div>

        <div class="pago">
          <label>Numero de tarjeta
            <input type="text" [(ngModel)]="medioPago" placeholder="4111111111111111" />
          </label>
          <button (click)="confirmarCompra()" [disabled]="procesando()">
            {{ procesando() ? 'Procesando...' : 'Confirmar compra' }}
          </button>
        </div>
      }

      @if (mensajeError()) { <p class="error">{{ mensajeError() }}</p> }

      @if (pedidoConfirmado(); as pedido) {
        <div class="confirmacion">
          <h3>Compra registrada</h3>
          <p>Pedido <strong>{{ pedido.id }}</strong></p>
          <p>Total pagado: <strong>S/ {{ pedido.total }}</strong></p>
          <p>Autorizacion: {{ pedido.autorizacion }}</p>
          <p>Estado: {{ pedido.estadoActual }}</p>
        </div>
      }
    </section>
  `,
  styles: [`
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border-bottom: 1px solid #e0e0e0; padding: 8px; font-size: 14px; }
    th { text-align: left; background: #f5f5f5; }
    .centro { text-align: center; } .derecha { text-align: right; }
    .totales { text-align: right; }
    .total { font-size: 18px; color: #1f4e79; }
    .pago { display: flex; gap: 12px; align-items: end; margin-top: 12px; }
    input { padding: 8px; border: 1px solid #ccc; border-radius: 4px; display: block; }
    button { padding: 10px 18px; border: 0; border-radius: 4px; background: #2e7d32; color: #fff; cursor: pointer; }
    button:disabled { background: #9e9e9e; }
    .error { color: #c62828; font-weight: bold; }
    .confirmacion { margin-top: 16px; padding: 14px; border: 1px solid #2e7d32; border-radius: 8px; background: #f1f8e9; }
  `],
})
export class CarritoComponent {
  private readonly registrarCompra = inject(RegistrarCompraCasoUso);
  readonly estadoCarrito = inject(EstadoCarrito);

  medioPago = '4111111111111111';
  readonly mensajeError = signal<string>('');
  readonly procesando = signal<boolean>(false);
  readonly pedidoConfirmado = signal<Pedido | null>(null);

  precioUnitario(linea: LineaCarrito): number {
    return this.estadoCarrito.carrito().precioUnitario(linea.producto);
  }

  importe(linea: LineaCarrito): number {
    return this.estadoCarrito.carrito().importeLinea(linea);
  }

  async confirmarCompra(): Promise<void> {
    this.mensajeError.set('');
    this.procesando.set(true);
    try {
      const pedido = await this.registrarCompra.ejecutar({
        clienteId: 'C01',
        carrito: this.estadoCarrito.carrito(),
        medioPago: this.medioPago,
      });
      this.pedidoConfirmado.set(pedido);
      this.estadoCarrito.vaciar();
    } catch (error) {
      this.mensajeError.set((error as Error).message);
    } finally {
      this.procesando.set(false);
    }
  }
}
