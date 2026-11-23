# Tareas 021: Rutas de inventario retiradas

**Especificación:** [spec 021](spec.md) · **Plan:** [plan 021](plan.md) · **Estado:** implementada y verificada el 22 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T2101** Marcar las cuatro rutas como retiradas en OpenAPI (`deprecated` y `410`). *Verificación:* prueba nueva en `src/openapi/operation-summaries.spec.ts`. **Hecho el 22 nov 2026:** [`inventory.controller.ts`](../../backend/src/inventory/inventory.controller.ts) con `@ApiOperation({ deprecated: true })` y `@ApiGoneResponse`; la prueba nueva pasa.
- [x] **T2102** Registrar las entidades de inventario solo en `InventoryModule` y quitarlas de compras, ventas y recepciones. *Verificación:* búsqueda sin importaciones fuera de pruebas; e2e en PostgreSQL. **Hecho el 22 nov 2026:** [`inventory.module.ts`](../../backend/src/inventory/inventory.module.ts); `purchase`, `sales` y `receipts` ya no importan `inventory/entities` fuera de pruebas; e2e en verde (T2105).
- [x] **T2103** Quitar `lots` y `movements` del constructor de `ReceiptsService`. *Verificación:* `tsc`, pruebas de comprobantes y e2e. **Hecho el 22 nov 2026:** también se ajustaron `receipts-characteristics.spec.ts` y `test/commercial-database-scenarios.ts`.
- [x] **T2104** Regenerar `docs/api/openapi.json`. *Verificación:* 121 operaciones; las cuatro de `/inventory` con `deprecated`. **Hecho el 22 nov 2026:** [`openapi.json`](../../docs/api/openapi.json) descargado de la API con `OPENAPI_ENABLED=true`; 121 operaciones y solo cambian las cuatro de `/inventory`.
- [x] **T2105** Typecheck, lint, Jest, build y e2e en PostgreSQL 17 en verde. *Verificación:* resultados anotados aquí. **Hecho el 22 nov 2026:** `tsc` y `build` sin errores; `lint` sin errores (solo avisos ya existentes); Jest 77 suites y 366 pruebas; e2e 10 suites y 68 pruebas en PostgreSQL 17 portable con base desechable.
- [x] **T2106** CI de GitHub en verde. *Verificación:* id de la ejecución. **Hecho el 22 nov 2026:** en el commit `c80e354` del PR #50, la [ejecución 45106679688](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/runs/45106679688) (Backend · CI) pasó tipos, lint, pruebas y build; migraciones y e2e en PostgreSQL 17; e imagen Docker. La [ejecución 45106679734](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/runs/45106679734) (Documentación · CI) pasó enlaces e imágenes.

```
T2101 ─┐
T2102 ─┼─> T2104 ─> T2105 ─> T2106
T2103 ─┘
```
