# Verificación de la convergencia con Stitch, fase B: backend

**Fecha:** 7 de noviembre de 2026 · **Tareas:** [T1161–T1163 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Plan:** [sección del 7 de noviembre](../../specs/011-manay-app-design/plan.md#convergencia-con-stitch--7-de-noviembre-de-2026) · **Rama:** `feat/011-stitch-backend`

## Qué cambió

Tres consultas de solo lectura, sin migración, filtradas por el negocio de la sesión y protegidas con `@Roles`.

| Tarea | Ruta | Detalle |
| --- | --- | --- |
| T1161 | `GET /purchases/history` y `GET /purchases/history/summary` | `purchase/purchase-history.ts`. Una fila por recepción con su última liquidación, sus sacos vigentes, variedades, kilos netos, total liquidado, pagado, saldo y estado de pago (`paid`, `debt`, `voided`, `unsettled`) según CL-MD05. El listado acepta `paymentState`; el resumen devuelve los conteos por estado y las sumas de total, pagado y saldo con los mismos filtros (`from`, `to`, `search`, `providerId`). Mayorista y Encargado, como `payment-status` |
| T1162 | `GET /sales` (ampliado) y `GET /sales/summary` | `sales/sales-history.ts`. Cada venta suma variedades, sacos, kilos, pagado, saldo y `paymentState` (`paid`, `debt`, `voided`) desde su cuenta por cobrar. El listado acepta `paymentState`; `summary` va antes de `:id` en el controlador |
| T1163 | `GET /reports/rows?report=daily` | Una fila por día en hora de Lima con operaciones, sacos, kilos e importe de las compras liquidadas o ventas confirmadas del periodo. Solo para la pantalla: `export` no acepta `daily` |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Sin errores |
| `npm run lint` | Sin errores; ningún aviso en los archivos nuevos |
| `npx vitest run` | 335 pruebas en 73 archivos |
| `npm run build` | Correcto |
| `npm audit --omit=dev --audit-level=high` | Sin vulnerabilidades altas (2 moderadas, las mismas que en `main`) |
| `test/stitch-history.e2e-spec.ts` en PostgreSQL 17 portable | 4 pruebas: compras al contado, a crédito con deuda, a crédito pagada, anulada y sin liquidar, con el mismo estado que `payment-status` y el resumen `{ all: 5, paid: 2, debt: 1, voided: 1, unsettled: 1 }`; ventas al contado, a crédito con abono y anulada, con su resumen; 300 recepciones con listado y resumen en menos de 2 s; informe diario que agrupa 23:30 de Lima en el mismo día. Otro negocio nunca aparece; filtros inválidos dan 400, fechas invertidas 422 y sin sesión 401 |
| Suite e2e completa (`vitest.config.e2e.ts`) | 68 pruebas en 10 archivos, en verde |

## Observaciones

- La regla de estado de pago vive en dos lugares: en TypeScript (`purchase/domain/payment-status.ts`, para `payment-status`) y en SQL (para poder filtrar y contar en el servidor). La prueba e2e compara ambas para cada recepción liquidada.
- La prueba de 300 recepciones las crea con el servicio y no por HTTP, porque la API limita la frecuencia de escrituras (429).
