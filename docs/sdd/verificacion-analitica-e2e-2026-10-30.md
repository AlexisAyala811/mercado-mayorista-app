# Verificación de analítica en PostgreSQL (T711 y T712)

**Fecha:** 30 de octubre de 2026 · **Especificación:** [007 analítica e IA progresiva](../../specs/007-analytics-and-progressive-ai/tasks.md) · **Código:** `backend/test/analytics.e2e-spec.ts`, rama `test/analitica-e2e`

## Por qué

La analítica tenía pruebas unitarias y scripts de verificación sueltos (`test/*.mjs`) que no corren en la CI. Esta prueba e2e corre en cada PR, contra PostgreSQL y por HTTP, con datos creados por la propia API.

## Datos de la prueba

Dos negocios. En el negocio A, una variedad y dos compradores:

| Venta | Comprador | Sacos | Kg | Importe | Después |
| --- | --- | --- | --- | --- | --- |
| 1 | Frecuente | 4 | 200 | S/ 400,00 | — |
| 2 | Ocasional | 2 | 100 | S/ 240,00 | Devolución de 1 saco, 50 kg, S/ 120,00 |
| 3 | Frecuente | 10 | 500 | S/ 900,00 | Anulada |

## T711 · Aislamiento, filtros y trazabilidad

| Comprobación | Resultado |
| --- | --- |
| Serie por variedad de la semana | Un punto: 2 ventas, 5 sacos, 250,000 kg, S/ 520,00, S/ 2,0800 por kg |
| Venta anulada | Fuera de la serie y de las referencias |
| Referencias | Ventas 1 y 2 como operaciones; la devolución como compensación |
| Filtro por comprador frecuente | Solo la venta 1: 4 sacos, S/ 400,00, sin compensaciones |
| Negocio B | Serie vacía, su lista de compradores no incluye los de A, `404` en suficiencia y evaluación con la variedad de A |
| Encargado de A | `403` en serie y suficiencia |

## T712 · Sin predicción con historial insuficiente

| Comprobación | Resultado |
| --- | --- |
| `GET /analytics/readiness` | 26 semanas evaluadas, `dataSufficient: false`, `predictionAvailable: false`, criterios de evaluación y revisión `pending` |
| Corte futuro | `422` |
| `POST /analytics/evaluations` | `422`; la lista de evaluaciones de la variedad queda en 0 |
| Publicaciones de la variedad | 0 |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit`, `oxlint --type-aware` del archivo | Sin errores ni avisos |
| `analytics.e2e-spec.ts` en PostgreSQL 17 portable | 5/5 (la primera ejecución falló por leer `id` en lugar de `saleReturn.id` en la respuesta de la devolución; error de la prueba, no de la API) |
| Suite e2e completa | 40/40 en 4 archivos (35 de `main` más las 5 nuevas) |

## No cubierto

- T713 (metadatos, incertidumbre, evaluación y versión de estimaciones con historial suficiente) sigue abierta junto con T709/T710: requiere 26 semanas de ventas y ya tiene pruebas unitarias y los scripts de concurrencia del 12 y 15 de octubre.
- Pantallas, Android y Figma (T714, T715).
