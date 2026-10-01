// =============================================================
// INFRAESTRUCTURA · Tokens de inyeccion de Angular
// =============================================================
// PUNTO IMPORTANTE PARA EXPLICAR EN CLASE:
//
// El CONTRATO (la interfaz) vive en el dominio y es TypeScript puro.
// El TOKEN es un mecanismo de Angular, y por eso vive AQUI, fuera
// del dominio. De ese modo el dominio sigue sin saber que existe
// Angular, y Angular sigue pudiendo inyectar las implementaciones.
//
// Las interfaces de TypeScript desaparecen al compilar, por eso
// Angular necesita un token concreto para identificarlas.

import { InjectionToken } from '@angular/core';
import { RepositorioProductos } from '../dominio/contratos/repositorio-productos.contrato';
import { RepositorioPedidos } from '../dominio/contratos/repositorio-pedidos.contrato';
import { ProcesadorPagos } from '../dominio/contratos/procesador-pagos.contrato';
import { NotificadorCliente } from '../dominio/contratos/notificador-cliente.contrato';

export const REPOSITORIO_PRODUCTOS = new InjectionToken<RepositorioProductos>(
  'RepositorioProductos',
);
export const REPOSITORIO_PEDIDOS = new InjectionToken<RepositorioPedidos>(
  'RepositorioPedidos',
);
export const PROCESADOR_PAGOS = new InjectionToken<ProcesadorPagos>('ProcesadorPagos');
export const NOTIFICADOR_CLIENTE = new InjectionToken<NotificadorCliente>(
  'NotificadorCliente',
);
