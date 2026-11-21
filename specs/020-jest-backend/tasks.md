# Tareas 020: Pruebas del backend con Jest

**Especificación:** [spec 020](spec.md) · **Estado:** implementada el 21 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T2001** Configurar Jest 30 en ESM nativo con `@swc/jest` y quitar Vitest. **Hecho:** [`backend/jest.config.mjs`](../../backend/jest.config.mjs), [`backend/jest.config.e2e.mjs`](../../backend/jest.config.e2e.mjs), scripts de `backend/package.json` y `tsconfig.json` con los tipos de Jest.
- [x] **T2002** Pasar las pruebas unitarias. **Hecho:** 42 archivos con `vi.*` pasaron a `jest.*`, y el mock de módulo pasó a `jest.unstable_mockModule`. 77 suites y 365 pruebas en verde; `tsc`, `lint` y `build` sin errores el 21 nov 2026.
- [x] **T2003** Pasar las e2e. **Hecho:** las 10 suites (68 pruebas) pasan con Jest contra PostgreSQL 17 portable en una base desechable, el 21 nov 2026.
- [x] **T2004** Cobertura en la CI con Jest. **Hecho:** `npm run test:cov` genera `coverage/` como antes. Líneas 58,1 %, ramas 83,7 % y funciones 61,2 %, medidas con Jest (CL-20-01).
- [ ] **T2005** CI de GitHub en verde con Jest en el PR.
