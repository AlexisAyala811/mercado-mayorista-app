// =============================================================
// DOMINIO · CONTRATO
// =============================================================
// Este contrato vive en el DOMINIO, no en la infraestructura.
// Quien necesita algo es quien define como lo necesita.
// Manana lo puede cumplir HttpClient, una base de datos local
// o un arreglo en memoria: al dominio le da igual.

import { Producto } from '../modelos/producto.modelo';

export interface FiltroCatalogo {
  mascota?: string;
  categoria?: string;
}

export interface RepositorioProductos {
  listar(filtro?: FiltroCatalogo): Promise<Producto[]>;
  buscarPorId(id: string): Promise<Producto | null>;
  guardar(producto: Producto): Promise<void>;
}
