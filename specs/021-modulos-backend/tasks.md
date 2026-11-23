# Tareas 021: Carpetas del backend agrupadas por módulo

**Especificación:** [spec 021](spec.md) · **Estado:** cerrada el 22 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T2101** Mover las 21 carpetas a `modules/`, `shared/`, `platform/` y `retired/` con `git mv`, y reescribir las rutas relativas. **Hecho:** 164 archivos con rutas ajustadas, entre ellos `import`, `import()` dinámicos, `jest.unstable_mockModule`, `new URL(…)` y las rutas `dist/…` de los scripts `.mjs`. `tsc` sin errores.
- [x] **T2102** Ajustar el arranque y los scripts: [`backend/docker-entrypoint.sh`](../../backend/docker-entrypoint.sh) y `migration:*` y `bootstrap:wholesaler` en `backend/package.json` usan `dist/platform/database/…`; Jest excluye `src/platform/database/migrations/**` de la cobertura.
- [x] **T2103** Actualizar la documentación: 67 rutas en 18 documentos; el verificador revisó 300 documentos sin enlaces rotos.
- [x] **T2104** Verificar el comportamiento, el 22 nov 2026:
  - Lint sin errores, 77 suites y 365 pruebas unitarias, `build`, y 10 suites e2e (68 pruebas) en PostgreSQL 17.
  - Arranque simulado como en el contenedor, sobre una base vacía: las 30 migraciones se aplicaron con `dist/platform/database/data-source.js` y `/api/v1/health/ready` respondió `200`.
- [x] **T2105** CI de GitHub en verde, incluida la imagen Docker, y despliegue en Render con `/api/v1/health/ready` en `200`. **Hecho el 22 nov 2026:**
  - La [CI de la rama](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/runs/45112362444) pasó, incluida la imagen Docker. En `main`, la CI de documentación y la publicación de la imagen también pasaron.
  - Los eventos de Render muestran «Deploy live for a63845f» a las 11:36 p. m., al primer intento.
  - `/api/v1/health/ready` respondió `200` con la base `up`.
