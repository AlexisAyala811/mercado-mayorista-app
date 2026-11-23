# Tareas 013: Caché de catálogos

**Especificación:** [spec 013](spec.md) · **Plan:** [plan 013](plan.md) · **Estado:** implementada y verificada el 16 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1301** Caché en memoria con vigencia, tamaño máximo, invalidación y versión por ámbito. **Hecho:** `backend/src/platform/common/cache/memory-cache.spec.ts`, cinco pruebas.
- [x] **T1302** Lecturas de catálogos por el caché e invalidación en las nueve escrituras. **Hecho:** `backend/src/shared/catalog/catalog-cache.spec.ts`, cuatro pruebas, entre ellas el aislamiento por negocio.
- [x] **T1303** `CATALOG_CACHE_TTL_SECONDS` con 60 por defecto y 0 para apagarlo. **Hecho:** prueba del esquema de entorno.
- [x] **T1304** Comprobación contra la API real y medición con k6. **Hecho:** [verificación del 16 de noviembre de 2026](../../docs/sdd/verificacion-cache-catalogos-2026-11-16.md).
- [ ] **T1305** Decidir si la pizarra de precios entra al caché y con qué regla de invalidación.
- [ ] **T1306** Caché compartido entre instancias, solo si se despliega más de una.
