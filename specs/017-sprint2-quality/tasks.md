# Tareas 017: Validación de calidad del Sprint 2

**Especificación:** [spec 017](spec.md) · **Estado:** implementada el 18 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1701** Resúmenes OpenAPI para las 121 operaciones y contrato exportado. **Hecho:** `backend/src/platform/openapi/operation-summaries.spec.ts`, [`docs/api/README.md`](../../docs/api/README.md).
- [x] **T1702** Cobertura en backend y app, y artefacto en la CI. **Hecho:** [verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md).
- [x] **T1703** k6 escalonado hasta 2000 usuarios. **Hecho:** [verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md).
- [x] **T1704** Responder `503` en vez de `500` cuando la base de datos está saturada. **Hecho:** `backend/src/platform/common/http/api-exception.filter.spec.ts`; con una sola conexión y 60 lecturas a la vez, la API real respondió 55 veces `503` con `Retry-After: 5` el 18 de noviembre de 2026 ([verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md#respuesta-ante-saturación)).
- [x] **T1705** Subir la cobertura de logística (27 %), estiba (32 %), inventario (40 %) y reportes (41 %) del backend. **Hecho el 19 nov 2026:** logística 86 %, estiba 85 % con pruebas nuevas (`src/modules/logistics-costs/logistics/logistics.service.spec.ts`, `src/modules/logistics-costs/stowage/stowage.service.spec.ts` y el gestor en memoria `test/support/memory-manager.ts`); el servicio de inventario retirado se excluye de la medición (T1707). Reportes sigue en 41 %: sus consultas SQL se prueban en PostgreSQL ([verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md#cobertura-de-las-pruebas)).
- [x] **T1707** Retirar `InventoryService` y su DTO: el inventario no forma parte del sistema (CL-12), sus cuatro rutas responden `410` y nadie los usa. **Hecho el 21 nov 2026:**
  - Se borraron `inventory.service.ts` y `http/adjust-inventory.dto.ts`.
  - `InventoryModule` solo conserva el controlador de rutas retiradas (`410`, probado en `src/retired/inventory/inventory-scope.spec.ts`).
  - Las tablas y entidades se mantienen con sus filas históricas; ninguna migración borra datos.
  - La medición de cobertura ya no necesita excluirlos.
  - **Verificación:** `tsc`, `lint`, 365 pruebas de Vitest, `build` y las 10 suites e2e (68 pruebas) en PostgreSQL 17 portable.
- [x] **T1708** Pruebas de los escenarios de calidad con Postman (criterio 8 del Sprint 2): AC01, AC03, AC04, roles del Encargado con reemplazo y límite de intentos. **Hecho el 21 nov 2026:** colección en `backend/test/postman/` ejecutada con Postman CLI contra la API local y PostgreSQL 17, con 29 peticiones y 46 aserciones sin fallas. Tabla de escenarios actualizada ([verificación](../../docs/sdd/verificacion-postman-escenarios-2026-11-21.md)).
- [ ] **T1706** Repetir la prueba de 2000 usuarios en un servidor separado del generador de carga.
