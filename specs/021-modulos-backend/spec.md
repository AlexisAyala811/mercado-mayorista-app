# Especificación 021: Carpetas del backend agrupadas por módulo

**Estado:** aprobada por el usuario el 22 de noviembre de 2026 («sin números») · **Fecha:** 22 de noviembre de 2026
**Origen:** el usuario no reconocía los ocho módulos entre las 22 carpetas de `backend/src/`

## Objetivo

Hacer visibles en el código los ocho módulos de la arquitectura ([componentes arquitectónicos](../../docs/02-arquitectura-software/componentes-arquitectonicos.md)) sin cambiar el comportamiento: solo se mueven archivos y se ajustan rutas.

## Estructura

| Grupo | Carpeta nueva | Carpetas que contiene |
| --- | --- | --- |
| Módulo 1 · Identidad y acceso | `modules/identity` | `identity` |
| Módulo 2 · Recepción y compras | `modules/reception-and-purchases` | `reception`, `purchase` |
| Módulo 3 · Ventas y despachos | `modules/sales` | `sales` |
| Módulo 4 · Cuentas y caja | `modules/accounts` | `accounts` |
| Módulo 5 · Costos logísticos | `modules/logistics-costs` | `logistics`, `freight`, `stowage` |
| Módulo 6 · Documentos | `modules/documents` | contenido de `receipts` |
| Módulo 7 · Mensajería | `modules/messaging` | `messaging` |
| Módulo 8 · Reportes y analítica | `modules/reports-and-analytics` | `reports`, `analytics` |
| Transversales | `shared` | `audit`, `catalog`, `operations` |
| Plataforma | `platform` | `common`, `config`, `database`, `health`, `openapi` |
| Retirado (CL-12) | `retired/inventory` | `inventory`: solo las rutas que responden `410` |

`app.module.ts`, `configure-http-application.ts` y `main.ts` siguen en la raíz de `src/`.

## Alcance

- Se mueven carpetas y se reescriben las rutas relativas de los `import` del backend y de sus pruebas.
- Se actualizan las rutas que apuntan a `dist/`: el arranque de Docker, los scripts de migración y de alta del Mayorista, y los scripts `.mjs` de `backend/test`.
- Se actualizan los enlaces de la documentación que apuntan a `backend/src/`.
- No cambian clases, rutas HTTP, tablas, migraciones ni la app.

## Criterios de aceptación

1. `tsc`, lint y `build` sin errores; las 365 pruebas unitarias y las 68 e2e en verde.
2. La imagen Docker arranca y aplica las migraciones con la ruta nueva (`dist/platform/database/data-source.js`).
3. El verificador de enlaces de la documentación no encuentra enlaces rotos.
4. Tras fusionar, Render despliega y `/api/v1/health/ready` responde `200`.

## Retiro de `retired/inventory` — 23 de noviembre de 2026

La [spec 022](../022-retirar-inventario/spec.md) borra la carpeta `retired/inventory`: la API ya no tiene rutas ni entidades de inventario. La fila «Retirado (CL-12)» de la tabla queda como registro de la estructura del 22 de noviembre.
