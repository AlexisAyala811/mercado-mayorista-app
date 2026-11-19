# Tareas 017: Validación de calidad del Sprint 2

**Especificación:** [spec 017](spec.md) · **Estado:** implementada el 18 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1701** Resúmenes OpenAPI para las 121 operaciones y contrato exportado. **Hecho:** `backend/src/openapi/operation-summaries.spec.ts`, [`docs/api/README.md`](../../docs/api/README.md).
- [x] **T1702** Cobertura en backend y app, y artefacto en la CI. **Hecho:** [verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md).
- [x] **T1703** k6 escalonado hasta 2000 usuarios. **Hecho:** [verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md).
- [x] **T1704** Responder `503` en vez de `500` cuando la base de datos está saturada. **Hecho:** `backend/src/common/http/api-exception.filter.spec.ts`; con una sola conexión y 60 lecturas a la vez, la API real respondió 55 veces `503` con `Retry-After: 5` el 18 de noviembre de 2026 ([verificación](../../docs/sdd/verificacion-sprint2-2026-11-18.md#respuesta-ante-saturación)).
- [ ] **T1705** Subir la cobertura de logística (27 %), estiba (32 %), inventario (40 %) y reportes (41 %) del backend.
- [ ] **T1706** Repetir la prueba de 2000 usuarios en un servidor separado del generador de carga.
