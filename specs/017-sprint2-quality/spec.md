# Especificación 017: Validación de calidad del Sprint 2

**Estado:** aprobada por el usuario el 18 de noviembre de 2026 · **Fecha:** 18 de noviembre de 2026
**Origen:** consigna del Sprint 2, «Implementación y validación de la arquitectura de software»

## Objetivo

Cerrar lo que la consigna del Sprint 2 pide y el proyecto aún no tenía: la documentación OpenAPI completa, el reporte de cobertura de las pruebas y una prueba de carga que suba progresivamente hasta 2000 usuarios.

## Lo que ya estaba

| Actividad del Sprint 2 | Dónde está |
| --- | --- |
| 1 y 2. Estilo y patrón arquitectónico | Monolito modular en capas; `docs/02-arquitectura-software/` y `docs/03-diseño-de-software/` |
| 3. Especificaciones SDD | `specs/001` a `specs/016` |
| 5. Base de datos y caché | Specs 013 y 014 |
| 6. SOLID y patrones | `docs/03-diseño-de-software/diseño-interno/` |
| 7. Pruebas en CI/CD | GitHub Actions en cada PR |

## Alcance

| Elemento | Regla |
| --- | --- |
| OpenAPI | Un resumen en español por operación, en `backend/src/openapi/operation-summaries.ts`, con prueba de completitud; contrato exportado en `docs/api/openapi.json` |
| Cobertura | `npm run test:cov` en el backend (Vitest) y en la app (Jest), sobre todos los archivos de `src`; la CI sube el informe HTML como artefacto |
| Carga | `backend/test/load/escalonada.k6.js`: 100, 250, 500, 1000, 1500 y 2000 usuarios, con el p95 de cada nivel |

## Criterios de aceptación

1. Las 121 operaciones del contrato tienen resumen, y la prueba falla si una nueva no lo tiene.
2. La CI de backend y app genera el informe de cobertura en cada PR.
3. Hay un documento con el nivel de usuarios en que AC01 deja de cumplirse.
