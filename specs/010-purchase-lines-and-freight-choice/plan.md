# Plan 010: Lotes con precio propio y flete elegible en la compra

**Estado:** borrador pendiente de aprobación (`plan`) · **Fecha:** 4 de noviembre de 2026 · **Especificación:** [spec 010](spec.md), aprobada el 4 de noviembre de 2026

## Punto de partida

| Pieza actual | Comportamiento |
| --- | --- |
| `purchase_settlements` | Una sola `price_basis` y un solo `unit_price_cents` (ambos `NOT NULL`); `gross = calculateAmountByBasis(base, precio, sacos totales, peso total)` |
| `PurchaseService.settle` | `liquid = gross − freight − advances − discounts`; crea el flete pendiente (`freight_entries`) si `freight > 0`; contado → salida de caja; crédito → cuenta por pagar con cuotas |
| `requireSameOperation` | Compara base, precio, pago, adelantos, descuentos y flete |
| Comprobante (`receipts.service.ts`) | Una línea por variedad con el precio único de la compra |
| Reportes (`reports.service.ts`) | Filas de compra con `ps.price_basis` y `ps.unit_price_cents` |
| Analítica (`analytics.service.ts`) | Importe de compra por variedad = peso o sacos de la variedad × precio único |

## Decisiones de diseño

1. **Dos caminos de liquidación, un solo servicio.** La orden trae `lots` (nuevo) o `priceBasis` + `unitPriceCents` (anterior), nunca ambos. El camino anterior se guarda **exactamente como hoy**, sin filas de lote, para que una tablet antigua obtenga los mismos céntimos: repartir el redondeo entre lotes podría diferir en un céntimo del cálculo sobre el total.
2. **Lotes en tabla propia** (`purchase_settlement_lots`), con los sacos, el neto y el importe **calculados por el servidor** y guardados como hechos de la liquidación. No se recalculan si después cambia un catálogo.
3. **Grupos por variedad y calidad** (CL-PL01). La clave del grupo es `(variety_id, quality_id)`; un saco sin calidad forma el grupo `(variedad, null)`. La orden debe declarar exactamente los grupos presentes en los sacos activos.
4. **Letras estables.** El servidor asigna A, B, C… ordenando los grupos por nombre de variedad, nombre de calidad (sin calidad al final) e identificadores, para que la tablet y el servidor muestren las mismas letras.
5. **Flete:** columna `freight_charged_to` (`provider` | `wholesaler`), por defecto `provider`. El flete pendiente con el transportista se crea igual en ambos casos.
6. **Lectura uniforme.** La API siempre devuelve `lots`. Una liquidación antigua se presenta como un único lote calculado al leer («Todas las variedades», con su base, precio e importe = bruto), sin escribir nada.
7. **Cálculo puro y probado aparte.** `planPurchaseLots(groups, lots)` en `purchase/domain/purchase-lots.ts` valida la cobertura y calcula cada importe con `calculateAmountByBasis`; el servicio solo lo orquesta.

## Modelo de datos — migración 029 `PurchaseSettlementLots`

```sql
CREATE TYPE freight_charge_party AS ENUM ('provider', 'wholesaler');
ALTER TABLE purchase_settlements
  ADD COLUMN freight_charged_to freight_charge_party NOT NULL DEFAULT 'provider',
  ALTER COLUMN price_basis DROP NOT NULL,
  ALTER COLUMN unit_price_cents DROP NOT NULL;
CREATE TABLE purchase_settlement_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  settlement_id uuid NOT NULL REFERENCES purchase_settlements(id),
  letter varchar(2) NOT NULL,
  name varchar(60),
  variety_id uuid NOT NULL REFERENCES potato_varieties(id),
  quality_id uuid,
  quality_name varchar(120),
  price_basis calculation_basis NOT NULL,
  unit_price_cents bigint NOT NULL CHECK (unit_price_cents > 0),
  sacks integer NOT NULL CHECK (sacks > 0),
  net_weight_kg numeric(14,3) NOT NULL CHECK (net_weight_kg > 0),
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  UNIQUE (settlement_id, letter),
  UNIQUE NULLS NOT DISTINCT (settlement_id, variety_id, quality_id)
);
CREATE INDEX ix_purchase_settlement_lots_business ON purchase_settlement_lots (business_id, settlement_id);
```

- Las liquidaciones existentes conservan `price_basis` y `unit_price_cents`; solo las nuevas con lotes los dejan en `NULL`.
- Invariante comprobada en el servicio y en las pruebas: o la liquidación tiene base y precio, o tiene lotes, nunca ambos ni ninguno.
- `down`: falla con mensaje claro si existen liquidaciones con lotes (no se pueden expresar con un solo precio); si no, elimina la tabla, la columna y el tipo, y restaura `NOT NULL`.
- `UNIQUE NULLS NOT DISTINCT` ya se usa en la migración 025 (líneas de venta); `quality_name` copia el nombre que guarda el saco (`varchar(120)`).

## Contrato de la API

`POST /api/v1/purchases/receptions/:receptionId/settlement` — sin cambio de ruta ni de permisos.

```jsonc
{
  "clientOperationId": "uuid",
  "expectedReceptionVersion": 3,
  "lots": [
    { "varietyId": "uuid", "qualityId": "uuid", "priceBasis": "kilogram", "unitPriceCents": 145, "name": "Canchán #1" },
    { "varietyId": "uuid", "qualityId": null, "priceBasis": "sack", "unitPriceCents": 9000 }
  ],
  "freightBasis": "sack", "freightRateCents": 250, "freightChargedTo": "wholesaler",
  "advancesCents": 10000, "discountsCents": 0,
  "paymentMode": "cash", "installments": []
}
```

| Caso | Respuesta |
| --- | --- |
| `lots` y `priceBasis`/`unitPriceCents` a la vez, o ninguno | `400` |
| `freightChargedTo` sin flete | `400` |
| Falta, sobra o se repite un grupo de variedad y calidad | `422` con los grupos esperados |
| Precio ≤ 0, base inválida, nombre > 60 caracteres | `400` |
| Reintento igual | Misma liquidación |
| Mismo UUID con otros lotes, precios, bases o `freightChargedTo` | `409 operation-id-conflict` |

Lectura: `GET /api/v1/purchases/receptions/:receptionId/settlement` y la creación devuelven además `freightChargedTo` y `lots: [{ letter, name, varietyId, varietyName, qualityId, qualityName, priceBasis, unitPriceCents, sacks, netWeightKg, amountCents }]`.

Nuevo: `GET /api/v1/purchases/receptions/:receptionId/settlement-groups` → grupos de variedad y calidad de los sacos activos con su letra, sacos y neto, para que la tablet arme la liquidación con las mismas letras que el servidor. Mismos permisos que la liquidación.

## Cambios por componente

| Componente | Cambio |
| --- | --- |
| `purchase/domain/purchase-lots.ts` (nuevo) | `groupSacks(sacks)` y `planPurchaseLots(groups, lots)`: cobertura exacta, letras, importes y bruto; errores de dominio |
| `purchase/entities/purchase-settlement-lot.entity.ts` (nuevo) | Entidad del lote |
| `purchase-settlement.entity.ts` | `freightChargedTo`; `priceBasis` y `unitPriceCents` opcionales |
| `http/settle-purchase.dto.ts` | `lots?: SettlePurchaseLotDto[]` (1–20), `freightChargedTo?`; validación cruzada |
| `purchase.service.ts` | Camino con lotes, líquido según `freightChargedTo`, comparación de reintento con lotes, lectura uniforme, auditoría con lotes y responsable del flete |
| `purchase.controller.ts` | Ruta `receptions/:receptionId/settlement-groups` |
| `receipts.service.ts` | Una línea por lote; línea informativa «Flete asumido por el comprador» cuando corresponde |
| `reports.service.ts` | Filas de compra por lote cuando existen |
| `analytics.service.ts` | Importe por variedad con la suma de sus lotes; liquidaciones antiguas con la fórmula actual |
| `docs/03-diseño-de-software/modelo-de-datos.md`, OpenAPI | Tabla, columna y contrato |

Sin cambios: venta, cuentas y cuotas, liquidación de fletes, anulación (solo el Mayorista, con motivo), permisos del Encargado.

## Pruebas

| Nivel | Qué prueba |
| --- | --- |
| Unitaria (`purchase-lots.spec.ts`) | Ejemplo de la spec (S/ 2 337,40 + S/ 1 800,00 = S/ 4 137,40); redondeo por lote; grupo faltante, sobrante y repetido; saco sin calidad; letras estables |
| Unitaria (servicio, repositorios simulados) | Líquido con flete del proveedor (S/ 3 907,40) y del Mayorista (S/ 4 037,40); flete pendiente S/ 130,00 en ambos; reintento y `409`; camino anterior idéntico al actual |
| E2E PostgreSQL | Los seis escenarios de la spec por HTTP; cinco reenvíos simultáneos; compra antigua leída igual; comprobante y reporte con lotes; analítica por variedad |
| Migración | `up` sobre datos existentes sin cambiar importes; `down` rechazado si hay lotes |
| Rendimiento | 300 sacos en 5 lotes < 1 s |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Tablets con la versión anterior durante la transición | Camino anterior intacto y probado con el mismo cuerpo de hoy |
| Diferencia de céntimos entre vista previa y servidor | La tablet calcula con la misma regla en céntimos y `BigInt`; el servidor es la autoridad y devuelve el resultado oficial |
| Letras distintas entre tablet y servidor | El servidor publica los grupos con su letra (`settlement-groups`) |
| Reportes y analítica mezclando liquidaciones antiguas y nuevas | Ambas formas cubiertas por e2e con los mismos totales esperados |
