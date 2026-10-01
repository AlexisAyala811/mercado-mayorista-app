// =============================================================
// INFRAESTRUCTURA · Adaptador alternativo
// =============================================================
// Cumple EL MISMO contrato, pero contra una API REST.
// Cambiar de memoria a HTTP es cambiar una linea en app.config.ts.
// Ni el dominio ni los casos de uso se enteran.
//
// Ademas, este adaptador TRADUCE: convierte el JSON que llega de
// la API en entidades Producto del dominio. Ese trabajo de
// traduccion es justamente lo que hace un adaptador.

import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Producto, Categoria } from '../dominio/modelos/producto.modelo';
import {
  RepositorioProductos,
  FiltroCatalogo,
} from '../dominio/contratos/repositorio-productos.contrato';

interface ProductoJson {
  id: string;
  nombre: string;
  categoria: string;
  mascota: string;
  precio: number;
  stock: number;
  sellerId: string;
}

export class RepositorioProductosHttp implements RepositorioProductos {
  constructor(
    private readonly http: HttpClient,
    private readonly urlBase: string,
  ) {}

  async listar(filtro?: FiltroCatalogo): Promise<Producto[]> {
    const parametros: Record<string, string> = {};
    if (filtro?.mascota) parametros['mascota'] = filtro.mascota;
    if (filtro?.categoria) parametros['categoria'] = filtro.categoria;

    const respuesta = await firstValueFrom(
      this.http.get<ProductoJson[]>(`${this.urlBase}/productos`, { params: parametros }),
    );
    return respuesta.map((json) => this.aEntidad(json));
  }

  async buscarPorId(id: string): Promise<Producto | null> {
    const json = await firstValueFrom(
      this.http.get<ProductoJson>(`${this.urlBase}/productos/${id}`),
    );
    return json ? this.aEntidad(json) : null;
  }

  async guardar(producto: Producto): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.urlBase}/productos/${producto.id}`, {
        stock: producto.stockDisponible,
      }),
    );
  }

  /** Traduce el JSON de la API a una entidad del dominio. */
  private aEntidad(json: ProductoJson): Producto {
    return new Producto(
      json.id,
      json.nombre,
      json.categoria as Categoria,
      json.mascota,
      json.precio,
      json.stock,
      json.sellerId,
    );
  }
}
