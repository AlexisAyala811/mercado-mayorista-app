# Tareas 022: Retirar el inventario del código

**Especificación:** [spec 022](spec.md) · **Plan:** [plan 022](plan.md) · **Estado:** implementada el 23 de noviembre de 2026; falta la CI de GitHub

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T2201** Quitar el módulo, las rutas y las entidades de inventario del backend. *Verificación:* `tsc`, Jest y búsqueda de `inventory` en `backend/src`. **Hecho el 23 nov 2026:** se borró `backend/src/retired/`; `app.module.ts`, `data-source.ts`, compras, ventas y documentos ya no la usan. En `backend/src` solo quedan menciones en migraciones, pruebas de «sin inventario» y un comentario de `purchase-lots.ts`.
- [x] **T2202** Quitar el tipo `inventory-movement` de la consulta de operaciones. *Verificación:* `operations.service.spec.ts`. **Hecho el 23 nov 2026:** [`operation-query.dto.ts`](../../backend/src/shared/operations/operation-query.dto.ts) y [`operations.service.ts`](../../backend/src/shared/operations/operations.service.ts); la prueba pasa.
- [x] **T2203** Quitar los restos de inventario en la app. *Verificación:* typecheck, lint y Jest de la app. **Hecho el 23 nov 2026:** `retired-contract.ts`, `operation-order.ts`, `permissions.ts`, `sync-queue-provider.tsx`, `operation-labels.ts` y el tipo sin uso `InventoryLot` de `domain/sales/sale.ts`. Typecheck y lint sin errores; Jest 110 suites y 750 pruebas.
- [x] **T2204** Regenerar `docs/api/openapi.json` y actualizar la documentación. *Verificación:* contrato sin rutas ni etiqueta `inventory`; `check-links.mjs`. **Hecho el 23 nov 2026:** [`openapi.json`](../../docs/api/openapi.json) con 117 operaciones en 90 rutas, 114 protegidas y ninguna de inventario; [`docs/api/README.md`](../../docs/api/README.md), [`componentes-arquitectonicos.md`](../../docs/02-arquitectura-software/componentes-arquitectonicos.md) y nota fechada en la [spec 021](../021-modulos-backend/spec.md). `check-links.mjs`: 304 documentos sin enlaces rotos.
- [x] **T2205** Verificación local completa: backend (typecheck, lint, Jest, build, e2e en PostgreSQL 17) y app. *Verificación:* resultados anotados aquí. **Hecho el 23 nov 2026:** backend con `tsc`, lint y build sin errores, Jest 76 suites y 361 pruebas, e2e 10 suites y 68 pruebas en PostgreSQL 17 portable; app según T2203.
- [ ] **T2206** CI de GitHub en verde. *Verificación:* id de la ejecución.

```
T2201 ─┬─> T2204 ─> T2205 ─> T2206
T2202 ─┤
T2203 ─┘
```
