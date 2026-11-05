# Verificación del backend de lotes con precio propio y flete elegible

**Fecha:** 4 de noviembre de 2026 · **Especificación:** [spec 010](../../specs/010-purchase-lines-and-freight-choice/spec.md) · **Plan:** [plan 010](../../specs/010-purchase-lines-and-freight-choice/plan.md) · **Rama:** `feat/010-lotes-compra`

Tareas T1001–T1033 (backend). La fase de la app (T1040–T1042) y la convergencia (T1050) no forman parte de esta verificación.

## Qué cambió

| Pieza | Cambio |
| --- | --- |
| `purchase/domain/purchase-lots.ts` | `groupSacks` (grupos por variedad y calidad, letras estables), `planPurchaseLots` (cobertura exacta, importe por lote con redondeo propio, bruto), `purchaseLiquidCents` (flete descontado solo si lo asume el proveedor) |
| Migración 029 `PurchaseSettlementLots1793750400029` | Tipo `freight_charge_party`, columna `freight_charged_to` (por defecto `provider`), `price_basis` y `unit_price_cents` opcionales con restricción «ambos o ninguno», tabla `purchase_settlement_lots` |
| `SettlePurchaseDto` | `lots` (1–20) o `priceBasis` + `unitPriceCents` (versiones anteriores de la app); `freightChargedTo` |
| `PurchaseService` | Camino con lotes en la misma transacción; camino anterior sin cambios; reintento que compara lotes y responsable del flete; respuesta siempre con `lots` (una compra antigua se lee como un único lote); auditoría con lotes y `freightChargedTo` |
| `GET /purchases/receptions/:receptionId/settlement-groups` | Grupos con su letra, sacos y neto para que la tablet arme la liquidación |
| Comprobante | Una línea por lote con su precio e importe; «Flete asumido por el comprador» cuando corresponde |
| Reportes | Historial de precios con el precio del lote de cada variedad y calidad |
| Analítica | Importe de compra por variedad y calidad con el precio de su lote; las compras antiguas conservan su fórmula y su redondeo |
| OpenAPI | Generado por el plugin de `@nestjs/swagger` a partir de los DTO |
| Modelo de datos | Tabla, columna y restricciones documentadas |

## Pruebas

| Archivo | Comprueba |
| --- | --- |
| `src/purchase/domain/purchase-lots.spec.ts` (9) | Ejemplo de la spec: S/ 2 337,40 + S/ 1 800,00 = S/ 4 137,40; letras estables con sacos en otro orden; grupo sin calidad al final; redondeo por lote; grupo faltante, sobrante y repetido; más de 20 lotes; líquido S/ 3 907,40 (proveedor) y S/ 4 037,40 (Mayorista) |
| `test/purchase-lots.e2e-spec.ts` (11, PostgreSQL por HTTP) | Grupos con letras; dos lotes con bases distintas pagados al contado (caja S/ 4 137,40) y leídos igual; flete de S/ 130,00 pendiente con el transportista en ambos casos y líquido según quién lo asume; `422 purchase-lots-mismatch` sin guardar nada; cinco reenvíos simultáneos → una compra y un evento con sus lotes, y `409 operation-id-conflict` con otro precio; cuerpo anterior → S/ 3 787,40 como antes, leído como un lote de 52 sacos; comprobante PDF; analítica de la variedad a S/ 1,8000 por kg; `down` de la migración rechazado con compras con lotes; `400` con lotes y precio único a la vez; anulación de una compra con lotes |
| `test/migrations.e2e-spec.ts` | La 029 es la última migración registrada y `purchase_settlement_lots` existe |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Sin errores |
| `oxlint --type-aware` en los archivos cambiados | Sin errores ni avisos (se quitaron tres avisos por copiar instancias de clase con `...`) |
| Pruebas unitarias | 316 en 72 archivos |
| `nest build` | Correcto |
| `npm audit --omit=dev --audit-level=high` | Sin vulnerabilidades altas |
| E2E en PostgreSQL 17 portable | 61/61 en 8 archivos |

## Hallazgos durante la verificación

- La primera ejecución e2e recibió `429 Too Many Requests`: cargar 52 sacos por HTTP en cada prueba superaba el límite de 100 solicitudes por minuto de la API. El límite es correcto para producción y no se tocó; la prueba carga los sacos con `WeighingService`, el mismo servicio de la ruta.
- El filtro global de errores solo transmite `code`, `message` y `currentVersion`, así que el `422` lleva `code: purchase-lots-mismatch` en lugar de la lista de grupos. Registrado en el plan.
- Una primera aserción de analítica esperaba S/ 1,8000 por kg mezclando todas las compras del día; una compra con precio único a S/ 1,45 bajaba el promedio a S/ 1,7417, que es correcto. La prueba filtra por el proveedor de su recepción.

## Pendiente

- Pantallas de la app MAÑAY (T1040–T1042), después de llevar la app al monorepo (T900).
- Revisión a ojo del comprobante PDF con lotes en un dispositivo.
