// =============================================================
// PRESENTACION · Componente raiz
// =============================================================
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CatalogoComponent } from './presentacion/catalogo/catalogo.component';
import { CarritoComponent } from './presentacion/carrito/carrito.component';
import { EstadoCarrito } from './presentacion/estado-carrito.servicio';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, CatalogoComponent, CarritoComponent],
  template: `
    <main>
      <header class="encabezado">
        <h1>Marketplace de productos para mascotas</h1>
        <nav>
          <button [class.activo]="vista === 'catalogo'" (click)="vista = 'catalogo'">
            Catalogo
          </button>
          <button [class.activo]="vista === 'carrito'" (click)="vista = 'carrito'">
            Carrito ({{ estadoCarrito.cantidadDeItems() }})
          </button>
        </nav>
      </header>

      @if (vista === 'catalogo') {
        <app-catalogo />
      } @else {
        <app-carrito />
      }
    </main>
  `,
  styles: [`
    main { font-family: Arial, sans-serif; max-width: 960px; margin: 0 auto; padding: 24px; }
    .encabezado { border-bottom: 2px solid #1f4e79; padding-bottom: 12px; margin-bottom: 20px; }
    h1 { color: #1f4e79; font-size: 22px; margin: 0 0 12px; }
    nav button { margin-right: 8px; padding: 8px 16px; border: 1px solid #1f4e79;
      background: #fff; color: #1f4e79; border-radius: 4px; cursor: pointer; }
    nav button.activo { background: #1f4e79; color: #fff; }
  `],
})
export class AppComponent {
  readonly estadoCarrito = inject(EstadoCarrito);
  vista: 'catalogo' | 'carrito' = 'catalogo';
}
