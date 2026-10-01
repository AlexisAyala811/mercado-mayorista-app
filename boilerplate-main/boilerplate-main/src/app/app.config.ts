// =============================================================
// RAIZ DE COMPOSICION
// =============================================================
// ESTE ES EL ARCHIVO MAS IMPORTANTE PARA EXPLICAR EN CLASE.
//
// Es el UNICO lugar de toda la aplicacion donde se decide que
// tecnologia concreta cumple cada contrato. Aqui, y solo aqui,
// aparecen los nombres de las implementaciones.
//
// Cambiar de memoria a una API REST, o de un proveedor de pagos
// a otro, es cambiar UNA linea de este archivo. Ni el dominio ni
// los casos de uso se enteran.

import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, HttpClient } from '@angular/common/http';

// Contratos (tokens)
import {
  REPOSITORIO_PRODUCTOS,
  REPOSITORIO_PEDIDOS,
  PROCESADOR_PAGOS,
  NOTIFICADOR_CLIENTE,
} from './infraestructura/tokens';

// Adaptadores disponibles
import { RepositorioProductosMemoria } from './infraestructura/repositorio-productos-memoria';
import { RepositorioProductosHttp } from './infraestructura/repositorio-productos-http';
import { RepositorioPedidosMemoria } from './infraestructura/repositorio-pedidos-memoria';
import { ProcesadorPagosSimulado } from './infraestructura/procesador-pagos-simulado';
import { ProcesadorPagosNiubiz } from './infraestructura/procesador-pagos-niubiz';
import { NotificadorConsola } from './infraestructura/notificador-consola';
import { NotificadorWhatsApp } from './infraestructura/notificador-whatsapp';

// Casos de uso
import { ConsultarCatalogoCasoUso } from './aplicacion/consultar-catalogo.caso-uso';
import { AgregarAlCarritoCasoUso } from './aplicacion/agregar-al-carrito.caso-uso';
import { RegistrarCompraCasoUso } from './aplicacion/registrar-compra.caso-uso';

// Contratos (tipos)
import { RepositorioProductos } from './dominio/contratos/repositorio-productos.contrato';
import { RepositorioPedidos } from './dominio/contratos/repositorio-pedidos.contrato';
import { ProcesadorPagos } from './dominio/contratos/procesador-pagos.contrato';
import { NotificadorCliente } from './dominio/contratos/notificador-cliente.contrato';

const URL_API = 'http://localhost:3000/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),

    // =========================================================
    // ELECCION DE ADAPTADORES
    // Descomente la alternativa para cambiar de tecnologia.
    // =========================================================

    {
      provide: REPOSITORIO_PRODUCTOS,
      useFactory: () => new RepositorioProductosMemoria(),
      // ALTERNATIVA con API REST — cambie estas dos lineas:
      // useFactory: (http: HttpClient) => new RepositorioProductosHttp(http, URL_API),
      // deps: [HttpClient],
    },
    {
      provide: REPOSITORIO_PEDIDOS,
      useFactory: () => new RepositorioPedidosMemoria(),
    },
    {
      provide: PROCESADOR_PAGOS,
      useFactory: () => new ProcesadorPagosSimulado(),
      // ALTERNATIVA con la pasarela real:
      // useFactory: (http: HttpClient) => new ProcesadorPagosNiubiz(http, URL_API, 'COM-4471'),
      // deps: [HttpClient],
    },
    {
      provide: NOTIFICADOR_CLIENTE,
      useFactory: () => new NotificadorConsola(),
      // ALTERNATIVA con WhatsApp:
      // useFactory: (http: HttpClient) => new NotificadorWhatsApp(http, URL_API),
      // deps: [HttpClient],
    },

    // =========================================================
    // CASOS DE USO
    // Reciben los contratos, nunca las implementaciones.
    // =========================================================

    {
      provide: ConsultarCatalogoCasoUso,
      useFactory: (repositorio: RepositorioProductos) =>
        new ConsultarCatalogoCasoUso(repositorio),
      deps: [REPOSITORIO_PRODUCTOS],
    },
    {
      provide: AgregarAlCarritoCasoUso,
      useFactory: (repositorio: RepositorioProductos) =>
        new AgregarAlCarritoCasoUso(repositorio),
      deps: [REPOSITORIO_PRODUCTOS],
    },
    {
      provide: RegistrarCompraCasoUso,
      useFactory: (
        productos: RepositorioProductos,
        pedidos: RepositorioPedidos,
        pagos: ProcesadorPagos,
        notificador: NotificadorCliente,
      ) => new RegistrarCompraCasoUso(productos, pedidos, pagos, notificador),
      deps: [REPOSITORIO_PRODUCTOS, REPOSITORIO_PEDIDOS, PROCESADOR_PAGOS, NOTIFICADOR_CLIENTE],
    },
  ],
};
