# Verificación del backend: integridad, seguridad y entrega continua

**Fecha:** 29 de octubre de 2026 · **Decisiones:** [integridad y seguridad del backend](decision-integridad-seguridad-backend-2026-10-29.md) · **Código:** `backend/` del repositorio `mercado-mayorista-app`

## Alcance verificado

| Cambio | Commits | PR |
| --- | --- | --- |
| Reintento con datos distintos → `409 operation-id-conflict` (D1) | `32c6ed5` (estado inicial versionado, incluye el cambio) | #1 |
| Vulnerabilidades altas de dependencias | `42eccfd` | #1 |
| E2E secuenciales y conteo de migraciones sin número fijo | `b86cda5` | #1 |
| Monorepo, CI, entrega y despliegue continuos (D5) | `b8e4f9a`, `77fce4c`, `5bd90be` | #1 |
| `TRUST_PROXY` y OpenAPI en producción (D4) | `9327edf` | #2 |
| Cuotas `voided` y migración 027 (D2) | `9d0a5f3` | #2 |
| Auditoría de intentos entre negocios (D3) | `9e42667` | #2 |

## Resultados locales

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Sin errores |
| `oxlint --type-aware` | Sin errores (avisos preexistentes en `test/report-rows-readonly.mjs` y `report-workbook.ts`) |
| Pruebas unitarias (Vitest) | 264 aprobadas en 64 archivos; antes de los cambios eran 243 |
| `nest build` | Correcto |
| `npm audit --omit=dev --audit-level=high` | Sin vulnerabilidades altas; queda `uuid` moderada vía `exceljs` ([auditoría de dependencias](../../backend/docs/security/dependency-audit.md)) |
| E2E en PostgreSQL 17 portable (`scripts/test-postgres-portable.ps1`) | 35/35 en tres ejecuciones consecutivas con la migración 027; respaldo y restauración verificados |
| Reproducción de la CI desde `npm ci` limpio | Correcta |

Observación: una ejecución e2e previa falló una vez con un `500` de TypeORM al iniciar sesión dentro de las pruebas HTTP y no pudo reproducirse con registro detallado en tres intentos posteriores ni en la CI. Se registra como posible intermitencia del entorno local; si reaparece, se investigará con el mensaje completo.

## Resultados en GitHub Actions

| Ejecución | Rama / evento | Commit | Resultado |
| --- | --- | --- | --- |
| Backend · CI 41003116966 | `feat/backend`, PR #1 | `5bd90be` | Tipos/lint/pruebas/build, e2e PostgreSQL e imagen Docker aprobados |
| Documentación · CI 41003115959 | `feat/backend`, PR #1 | `5bd90be` | Enlaces aprobados |
| Backend · CD 41003641527 | `main`, push | `81b71ca` | CI aprobada, imagen publicada en GHCR, despliegue omitido (sin entorno `production`) |
| Backend · CI 41005187687 | `fix/backend-seguridad-cuotas`, PR #2 | `3b148c5` | Tipos/lint/pruebas/build, e2e PostgreSQL e imagen Docker aprobados |
| Documentación · CI 41005187760 | `fix/backend-seguridad-cuotas`, PR #2 | `3b148c5` | Enlaces aprobados |

## No verificado

- Comportamiento de la aplicación Android ante `409 operation-id-conflict` y presentación de cuotas `voided`.
- Prueba e2e HTTP con dos negocios para el evento `authorization.cross-business-denied` (solo hay pruebas unitarias).
- Límite de inicio de sesión detrás de un proxy real y despliegue continuo en un servidor.
- Tablet, Figma y lector de pantalla: estos cambios no modifican pantallas, pero las tareas de convergencia móvil siguen abiertas.
