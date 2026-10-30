# Componentes arquitectónicos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

Este documento es la referencia única de los módulos del sistema (ADR-04). Las demás vistas enlazan aquí en lugar de repetir la tabla.

## Módulos de negocio

| # | Módulo | Responsabilidad | Historias | Requisitos | Carpetas en `mercado-api/src` |
| --- | --- | --- | --- | --- | --- |
| 1 | Identidad y acceso | Sesión, Encargados y reemplazos | HU07, HU12 | RF01, RF02 | `identity` |
| 2 | Recepción y compras | Pesaje saco por saco, cierre y liquidación al proveedor | HU01, HU02 | RF05–RF07, RF06A, RF06B, RF14 | `reception`, `purchase` |
| 3 | Ventas y despachos | Venta, despacho, anulación y devoluciones comerciales | HU03 | RF10, RF11, RF13 | `sales` |
| 4 | Cuentas y caja | Cuotas, abonos, pagos, cobros, caja y avisos de vencimiento | HU04, HU08, HU14 | RF13–RF16 | `accounts` |
| 5 | Costos logísticos | Registro y liquidación de flete y estiba | HU09 | RF15 | `freight`, `stowage` |
| 6 | Documentos | Comprobantes PDF y estado de cuenta del comprador | HU10, HU16 | RF12, RF27 | `receipts` |
| 7 | Mensajería | Envío manual por WhatsApp o correo y registro de cada intento | HU14, HU15, HU16 | RF23, RF25, RF26 | `messaging` |
| 8 | Reportes y analítica | Reportes, historial, tendencias y predicción | HU06, HU11 | RF17–RF20, RF24 | `reports`, `analytics` |

## Responsabilidades transversales

| Responsabilidad | Función | Historias y requisitos | Ubicación |
| --- | --- | --- | --- |
| Auditoría | Registrar usuario, fecha, acción y motivo de cada cambio | HU13; RF22 | `audit` |
| Referencias comerciales | Proveedores, compradores, variedades, calidades, procedencias, transportistas y vehículos, administrados desde los formularios de cada operación | RF03, RF04 | `catalog`, `logistics` |
| Sincronización | Cola cifrada en la tablet y consulta del resultado de una operación por su UUID | HU05; RF21 | Cliente Android; `operations` en la API |

`health` (estado del servicio) es infraestructura y no un módulo de negocio. `inventory` solo conserva rutas antiguas que responden `410 Gone` tras el retiro del control de existencias (ADR-01).

## Relaciones entre módulos

| Origen | Destino | Propósito | Mecanismo |
| --- | --- | --- | --- |
| Aplicación Android | Identidad y acceso | Autenticar y ejecutar operaciones protegidas | HTTPS/JSON, token de sesión |
| Recepción y compras | Cuentas y caja | Crear la cuenta por pagar o la salida de caja de la liquidación | Misma transacción PostgreSQL |
| Recepción y compras | Costos logísticos | Registrar el flete pendiente de la compra | Misma transacción |
| Ventas y despachos | Cuentas y caja | Crear la cuenta por cobrar o el ingreso de caja; aplicar devoluciones | Misma transacción |
| Ventas y despachos | Costos logísticos | Registrar el flete pendiente de la venta | Misma transacción |
| Costos logísticos | Cuentas y caja | Registrar la salida de caja de cada liquidación | Misma transacción |
| Documentos | Recepción y compras, Ventas, Cuentas y caja | Leer importes confirmados para comprobantes y estados de cuenta | Lectura dentro del proceso |
| Mensajería | Documentos, Referencias | Obtener el archivo y el teléfono del destinatario | Archivo descargado en Android; validación en la API |
| Mensajería | Cuentas y caja | Consultar vencimientos para avisos y recordatorios | Lectura dentro del proceso |
| Reportes y analítica | Todos los módulos operativos | Consultar hechos confirmados | Lectura SQL por negocio |
| Todos los módulos | Auditoría | Registrar cada hecho y su responsable | Misma transacción |

Documentos **genera** archivos y Mensajería **los envía**; Mensajería no calcula importes. Las colaboraciones ocurren dentro de un único proceso NestJS: no son llamadas de red entre servicios.

## Diagrama

![Componentes de la API Mercado](../../img/nivel3-componentes.png)

Fuente editable: [nivel3-componentes.svg](../../img/fuentes-svg/nivel3-componentes.svg). El detalle de cada componente está en el [C4 nivel 3](../04-modelo-c4/Nivel3-Diagrama-de-Componentes.md).

## Límites actuales

Algunos servicios usan directamente entidades de otros módulos dentro de una transacción (por ejemplo, Ventas crea la cuenta por cobrar). Es una decisión consciente para garantizar atomicidad; la evolución hacia interfaces públicas por módulo se describe en el [enfoque arquitectónico](enfoque-arquitectonico.md).
