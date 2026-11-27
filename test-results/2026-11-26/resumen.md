# Resultados de pruebas · 2026-11-26

> **Spec:** [024](../../specs/024-reporte-resultados-pruebas/spec.md) · **Commit:** `c1dff33` · **Resultado:** ✅ todas las pruebas pasaron

## Resumen

| Conjunto | Suites | Pruebas | Exitosas | Fallidas | Omitidas | Duración | Cobertura de líneas | Cobertura de ramas | Ejecutado |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Backend · pruebas unitarias | 77 | 369 | 369 | 0 | 0 | 21.2 s | 55.33 % | 83.49 % | 26 de noviembre de 2026 a las 10:15 p. m. |
| Backend · pruebas e2e en PostgreSQL | 11 | 76 | 76 | 0 | 0 | 36.7 s | — | — | 26 de noviembre de 2026 a las 10:17 p. m. |
| App · pruebas unitarias y de pantallas | 111 | 760 | 760 | 0 | 0 | 74.5 s | 84.02 % | 70.98 % | 26 de noviembre de 2026 a las 10:16 p. m. |
| **Total** | **199** | **1205** | **1205** | **0** | **0** | | | | |

Las pruebas e2e corren contra PostgreSQL 17 y no miden cobertura. La cobertura de cada conjunto cuenta todos los archivos fuente, tengan o no pruebas.

## Archivos

- [`backend-unitarias-junit.xml`](backend-unitarias-junit.xml): detalle de Backend · pruebas unitarias en formato JUnit.
- [`backend-e2e-junit.xml`](backend-e2e-junit.xml): detalle de Backend · pruebas e2e en PostgreSQL en formato JUnit.
- [`app-junit.xml`](app-junit.xml): detalle de App · pruebas unitarias y de pantallas en formato JUnit.
