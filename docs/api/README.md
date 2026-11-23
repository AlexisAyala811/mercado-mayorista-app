# API REST · OpenAPI

> **Fecha:** 18 de noviembre de 2026, actualizado el 23 de noviembre de 2026 ([spec 022](../../specs/022-retirar-inventario/spec.md)) · **Contrato:** [`openapi.json`](openapi.json) (OpenAPI 3, generado por `@nestjs/swagger`)

La API central expone 117 operaciones en 90 rutas bajo `/api/v1`. Todas tienen un resumen en español, y 114 exigen el token de sesión; las otras tres son el inicio de sesión y las dos comprobaciones de salud.

## Dónde verla

Con la API en marcha y `OPENAPI_ENABLED=true` (activo por defecto fuera de producción):

| Qué | Dirección |
| --- | --- |
| Interfaz Swagger | `http://<host>/api/v1/docs` |
| Contrato JSON | `http://<host>/api/v1/openapi.json` |

En producción viene apagado salvo que se declare `OPENAPI_ENABLED=true`. Para probar un endpoint protegido en Swagger se pulsa «Authorize» y se pega el token que devuelve `POST /auth/sessions`.

## Operaciones por módulo

| Etiqueta | Operaciones | Módulo |
| --- | --- | --- |
| `identity`, `identity-administration` | 10 | Identidad y acceso: sesión, Encargados y reemplazos |
| `catalog` | 20 | Referencias: proveedores, compradores, variedades, calidades y procedencias |
| `logistics`, `freight`, `stowage` | 17 | Costos logísticos: transportistas, vehículos, flete y estiba |
| `receptions`, `purchases` | 17 | Recepción, pesaje y liquidación de compras |
| `sales` | 6 | Ventas, despachos y devoluciones |
| `accounts` | 6 | Cuentas, pagos, cobros y caja |
| `receipts` | 7 | Comprobantes PDF y estado de cuenta |
| `reports`, `analytics` | 26 | Reportes y analítica |
| `messaging` | 4 | Mensajería manual |
| `operations`, `audit`, `health` | 4 | Sincronización, auditoría y salud |

## Cómo se mantiene

- Los esquemas de entrada y salida salen de los DTO mediante el plugin de `@nestjs/swagger` en `backend/nest-cli.json`.
- Los resúmenes están en `backend/src/platform/openapi/operation-summaries.ts`. Su prueba falla si una operación del contrato no tiene resumen o si queda un resumen de una operación que ya no existe.
- Para regenerar `openapi.json`: levantar la API con `OPENAPI_ENABLED=true`, descargar `/api/v1/openapi.json` en este archivo y correr `npm test -- src/openapi` en `backend/`.
