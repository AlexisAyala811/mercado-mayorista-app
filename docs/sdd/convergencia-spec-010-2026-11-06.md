# Convergencia de la spec 010: lotes con precio propio y flete elegible

**Fecha:** 6 de noviembre de 2026 · **Especificación:** [spec 010](../../specs/010-purchase-lines-and-freight-choice/spec.md) · **Tareas:** T1001–T1042 cerradas, este documento cierra T1050

Lista de convergencia de [`specs/convergence-checklist.md`](../../specs/convergence-checklist.md) aplicada a la spec 010. Fuentes: [verificación del backend](verificacion-lotes-compra-backend-2026-11-04.md), [fase 3 de la app](verificacion-manay-fase3-2026-11-04.md), [lotes en el detalle y la cola](verificacion-lotes-app-2026-11-06.md) y la medición de este documento.

## Requisitos funcionales

| # | Requisito | Evidencia | Estado |
| --- | --- | --- | --- |
| 1 | Un lote por variedad y calidad; sin calidad forma su grupo; base, precio > 0 y nombre ≤ 60 | `purchase-lots.spec.ts` (letras, grupo sin calidad); `purchase-preview.test.ts` (misma regla en la app); DTO con `@Min(1)` y `@MaxLength(60)` | Cumple |
| 2 | Falta, sobra o se repite un grupo → `422`, nada guardado | `purchase-lots.spec.ts`; e2e «rejects lots that leave sacks out without saving anything» | Cumple |
| 3 | Sacos, neto e importe los calcula el servidor; la app solo previsualiza | e2e «prices two lots…»; emulador con 250 sacos: vista previa igual a la respuesta del servidor | Cumple |
| 4 | Bruto = suma de lotes; líquido según quién asume el flete | `purchase-lots.spec.ts` (S/ 4 137,40; S/ 3 907,40; S/ 4 037,40); e2e de flete | Cumple |
| 5 | Elección del flete obligatoria con flete; «proveedor» si no se envía | `requireSettlementShape`; e2e con cuerpo anterior; la app siempre envía `freightChargedTo` con flete | Cumple |
| 6 | Flete pendiente con el transportista igual en ambos casos | e2e de flete: S/ 130,00 en los dos casos | Cumple |
| 7 | Reintento igual → misma liquidación; mismo UUID con otros datos → `409` | e2e de cinco reenvíos simultáneos y `409 operation-id-conflict`; `purchase-lots-queue.test.tsx` (un solo envío con el mismo UUID) | Cumple |
| 8 | Liquidaciones antiguas sin cambios, leídas como un lote | e2e «keeps the single-price body…» (S/ 3 787,40, un lote de 52 sacos); `presentSettlement` | Cumple |
| 9 | Una app anterior con un solo precio sigue funcionando | mismo e2e; `400` si llegan lotes y precio único a la vez | Cumple |
| 10 | Comprobante con cada lote y «Flete asumido por el comprador» sin restarlo | e2e del comprobante; revisión a ojo de este documento | Cumple |
| 11 | Reportes y analítica con el importe de cada lote | e2e de analítica (S/ 1,8000 por kg de la variedad); reportes por lote (T1031) | Cumple |
| 12 | Anulación como hoy: solo el Mayorista, con motivo, revierte cuenta o caja y flete | e2e «voids a purchase with lots…» | Cumple |
| 13 | Auditoría de creación y anulación con lotes, flete y usuario | e2e de reenvíos (un evento con sus lotes) y de anulación | Cumple |

## Requisitos de calidad

| Requisito | Evidencia | Estado |
| --- | --- | --- |
| Migración compatible y sin pérdida | Migración 029 solo agrega tipo, columna y tabla; `down` rechazado si ya hay compras con lotes (e2e) | Cumple |
| 300 sacos en 5 lotes en menos de 1 s en el servidor (AC01) | Medición del 6 de noviembre de 2026 en la API local (Node 24, PostgreSQL 17 portable): liquidación de 300 sacos en 5 lotes en **39 ms**; el reintento idempotente, en 12 ms | Cumple |
| Dinero solo con `bigint` | Servidor: `calculateAmountByBasis` y `planPurchaseLots`. App: `calculatePurchasePreview` con `BigInt` y la prueba de importes por encima de `Number.MAX_SAFE_INTEGER` | Cumple |

## Medición y comprobante del 6 de noviembre de 2026

Recepción de 300 sacos (48 a 54 kg brutos, 1 kg de tara) en cinco grupos, liquidada al contado. Flete de S/ 2,50 por saco a cargo del Mayorista y adelanto de S/ 100,00.

| Lote | Grupo | Sacos | Neto | Base y precio | Importe |
| --- | --- | --- | --- | --- | --- |
| A | Amarilla Tumbay · 2da | 60 | 2 999 kg | S/ 88,00 por saco | S/ 5 280,00 |
| B | Canchán · 1ra | 60 | 2 997 kg | S/ 1,80 por kg | S/ 5 394,60 |
| C | Canchán · 2da | 60 | 3 001 kg | S/ 1,50 por kg | S/ 4 501,50 |
| D («Peruanita selecta») | Peruanita · 1ra | 60 | 2 998 kg | S/ 95,00 por saco | S/ 5 700,00 |
| E | Yungay · sin calidad | 60 | 3 002 kg | S/ 1,20 por kg | S/ 3 602,40 |

Bruto S/ 24 478,50; flete asumido por el comprador S/ 750,00, sin restar; adelanto S/ 100,00; líquido S/ 24 378,50. Los importes de la respuesta, del comprobante PDF y del cálculo a mano coinciden. El PDF muestra cada lote con su nombre o su variedad y calidad, sus sacos, su neto, su base, su precio y su importe.

## Lista de convergencia

- [x] Reglas y aclaraciones resueltas (CL-PL01–CL-PL04, CL-FM08–CL-FM10) y reflejadas en la spec.
- [x] Criterios de aceptación observables y sin contradicciones; los siete escenarios tienen prueba.
- [x] Plan y tareas con contratos, riesgos y pruebas; T1001–T1042 cerradas con evidencia.
- [ ] Figma: el diseño de referencia es Stitch (spec 011); no se hizo una comparación píxel a píxel. Queda registrado y no bloquea.
- [x] Interfaz, dominio y datos separados: `purchase-lots.ts` (servidor) y `purchase-preview.ts` (app) sin dependencias de pantalla.
- [x] Reglas de dominio con los ejemplos aprobados de la spec.
- [x] Recorrido crítico en tablet representativa: emulador 1280 × 800 con 250 sacos y tres lotes; falta una tablet física (T1150 de la spec 011).
- [x] Autorización en el servidor: `@Roles` en la liquidación y la anulación (solo el Mayorista anula); `businessId` de la sesión.
- [x] Auditoría y operación sin conexión sin efectos duplicados: cinco reenvíos → una compra y un evento; la cola guarda la orden con lotes y la reenvía con el mismo UUID.
- [x] Sin divergencias abiertas, salvo las registradas abajo.

## Divergencias registradas

| Divergencia | Decisión |
| --- | --- |
| La app no consulta `GET settlement-groups`; agrupa con la misma regla para trabajar sin conexión | Aceptada. La regla está duplicada a propósito y probada en los dos lados; en el emulador, los lotes de la app coincidieron con los de la ruta |
| El comprobante muestra el neto con tres decimales («2999.000 kg») y la app en kilos enteros | Aceptada. El dominio guarda tres decimales y el PDF es un documento de constancia |
| El pie del comprobante decía «Generado por Mercado» y la cabecera, «MAÑAY» | **Resuelta el 6 de noviembre de 2026:** el pie del comprobante dice «Generado por MAÑAY»; también el pie de los reportes PDF («MAÑAY · Documento interno») y el autor de los libros Excel. Revisado a ojo en un PDF de muestra |
| Comparación con Stitch píxel a píxel | No hecha; se hace con T1150 |

## Resultado

La spec 010 queda **convergida**: los trece requisitos funcionales y los tres de calidad tienen evidencia. La única divergencia abierta es la comparación con Stitch, asignada a T1150 de la spec 011.
