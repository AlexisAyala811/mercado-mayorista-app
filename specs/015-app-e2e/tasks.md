# Tareas 015: Pruebas end to end de la app

**Especificación:** [spec 015](spec.md) · **Estado:** implementada el 17 de noviembre de 2026; CI pendiente

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1501** Playwright con servidor estático de `dist/` y sesión compartida. **Hecho:** `app/playwright.config.ts`, `app/e2e/serve-dist.mjs`, `app/e2e/sesion.setup.ts`.
- [x] **T1502** Seis pruebas de lectura: acceso rechazado, ruta protegida, menú, Ver compras, Reportes de compras y Carros. **Hecho:** `app/e2e/flujos.spec.ts`, [verificación](../../docs/sdd/verificacion-e2e-app-2026-11-17.md).
- [x] **T1503** Jest ignora `app/e2e/`. **Hecho:** 752 pruebas de Jest en verde.
- [ ] **T1504** Trabajo de CI con PostgreSQL, API, exportación web y Playwright.
- [ ] **T1505** Flujos que escriben (compra y venta) con datos propios por prueba.
- [ ] **T1506** Localizar la prueba de Jest que falló una vez en cuatro corridas completas.
