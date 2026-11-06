# Tareas 010: Lotes con precio propio y flete elegible en la compra

**Especificación:** [spec 010](spec.md) · **Plan:** [plan 010](plan.md) · **Estado:** backend implementado y verificado el 4 de noviembre de 2026; app pendiente

Cada tarea se marca `[x]` solo con evidencia enlazable. Las de backend van en una rama y un PR; las de la app, cuando la app esté en el monorepo (T900).

## Fase 1 · Cálculo (backend, sin base de datos)

- [x] **T1001** `purchase/domain/purchase-lots.ts`: `groupSacks` (grupos por variedad y calidad con sacos y neto, letras estables) y `planPurchaseLots` (cobertura exacta, importe por lote, bruto). *Verificación:* ejemplo de la spec (S/ 2 337,40 + S/ 1 800,00 = S/ 4 137,40), redondeo por lote mitad hacia arriba, grupo faltante, sobrante y repetido, saco sin calidad, mismo orden de letras con sacos en otro orden. **Hecho:** 7 pruebas de `groupSacks` y `planPurchaseLots`. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1002** Regla del líquido según `freightChargedTo`. *Verificación:* S/ 3 907,40 con flete del proveedor y S/ 4 037,40 del Mayorista; líquido negativo rechazado en ambos casos. **Hecho:** `purchaseLiquidCents`, prueba de ambos casos. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).

## Fase 2 · Datos (backend)

- [x] **T1010** Migración 029 `PurchaseSettlementLots`: tipo `freight_charge_party`, columna `freight_charged_to`, `price_basis` y `unit_price_cents` opcionales, tabla `purchase_settlement_lots` con sus restricciones. *Verificación:* e2e de migraciones; una liquidación existente conserva sus importes; `down` rechazado si hay lotes y correcto si no los hay. **Hecho:** `PurchaseSettlementLots1793750400029`; e2e de migraciones y `down` rechazado con lotes. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1011** Entidad `PurchaseSettlementLotEntity` y campos nuevos de `PurchaseSettlementEntity`; actualizar el modelo de datos. *Verificación:* tipos y suite unitaria. **Hecho:** entidad del lote, `freightChargedTo` y modelo de datos actualizado. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).

## Fase 3 · API (backend)

- [x] **T1020** DTO: `lots` (1–20, base, precio > 0, nombre ≤ 60) y `freightChargedTo`; exclusión con `priceBasis`/`unitPriceCents`. *Verificación:* pruebas del DTO para los casos `400` del plan. **Hecho:** DTO con `lots` y `freightChargedTo`; `400` cubierto por e2e. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1021** `PurchaseService.settle` con lotes: guarda lotes y liquidación en la misma transacción, flete pendiente igual en ambos casos, reintento comparando lotes y responsable del flete, auditoría con ambos. Camino anterior sin cambios. *Verificación:* pruebas del servicio, incluida la del cuerpo actual con el mismo resultado de hoy. **Hecho:** camino con lotes y camino anterior; reintento y auditoría. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1022** Lectura uniforme: `lots` y `freightChargedTo` en la respuesta; liquidación antigua como un único lote calculado al leer. Ruta `settlement-groups`. *Verificación:* pruebas del controlador y del servicio; permisos iguales a la liquidación. **Hecho:** respuesta con `lots` y ruta `settlement-groups`. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1023** E2E PostgreSQL con los escenarios de la spec: dos lotes con bases distintas, flete del Mayorista, flete del proveedor, sacos sin lote (`422`), cinco reenvíos simultáneos y `409`, compra antigua, aplicación anterior; anulación de una compra con lotes. *Verificación:* suite e2e en local y en la CI. **Hecho:** `test/purchase-lots.e2e-spec.ts` 11/11; suite e2e 61/61. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).

## Fase 4 · Documentos, reportes y analítica (backend)

- [x] **T1030** Comprobante de compra con una línea por lote y línea informativa del flete asumido. *Verificación:* PDF de muestra revisado a ojo; prueba de contenido. **Hecho:** comprobante por lote; PDF generado en e2e. La revisión a ojo en dispositivo queda pendiente. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1031** Reportes de compra por lote cuando existen. *Verificación:* filas y totales iguales a la suma de lotes; compras antiguas sin cambios. **Hecho:** historial de precios por lote. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1032** Analítica: importe por variedad con la suma de sus lotes. *Verificación:* e2e con una compra nueva y una antigua de la misma variedad. **Hecho:** analítica por variedad y calidad con el precio del lote; e2e a S/ 1,8000 por kg. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).
- [x] **T1033** Contrato en OpenAPI y verificación del backend con evidencia (`docs/sdd/`). *Verificación:* CI de backend y de documentación en verde. **Hecho:** OpenAPI por el plugin de Swagger desde los DTO. CI de GitHub pendiente del push. Evidencia: [verificación del backend](../../docs/sdd/verificacion-lotes-compra-backend-2026-11-04.md).

## Fase 5 · App MAÑAY

- [x] **T1040** Pantalla de liquidación con los lotes de `settlement-groups`: base y precio por lote, nombre opcional, vista previa en céntimos con `BigInt`, elección del flete. *Verificación:* pruebas Jest y recorrido en tablet 1280 × 800. **Hecho:** la app agrupa con la misma regla que `settlement-groups` para trabajar sin conexión; recorrido en tablet con 250 sacos y tres lotes. Evidencia: [verificación de la fase 3 de la spec 011](../../docs/sdd/verificacion-manay-fase3-2026-11-04.md).
- [x] **T1041** Cola sin conexión: la orden con lotes se guarda cifrada y se reenvía con el mismo UUID; un `409` se muestra como aviso sin reintentar (CL-FM16). *Verificación:* pruebas de la cola. **Hecho:** sin cambios de código; prueba nueva de la cola con lotes. Evidencia: [verificación de lotes en la app](../../docs/sdd/verificacion-lotes-app-2026-11-06.md).
- [x] **T1042** Detalle de compra y comprobante con lotes en la app. *Verificación:* pruebas de componente y tablet. **Hecho:** lotes en la confirmación y en el detalle de «Ver compras»; el PDF ya los incluía desde el backend. Evidencia: [verificación de lotes en la app](../../docs/sdd/verificacion-lotes-app-2026-11-06.md).

## Convergencia

- [x] **T1050** Lista de convergencia de la spec 010 con evidencia; actualizar el estado en el índice de specs y la spec 002. **Hecho.** Evidencia: [convergencia de la spec 010](../../docs/sdd/convergencia-spec-010-2026-11-06.md).

## Orden y dependencias

```text
T1001 → T1002 ─┐
T1010 → T1011 ─┼→ T1020 → T1021 → T1022 → T1023 → T1030 / T1031 / T1032 → T1033
               │                                               └→ T1040 → T1041 → T1042 (requiere T900)
               └──────────────────────────────────────────────────────────────────→ T1050
```

Las fases 1 a 4 son backend y pueden avanzar ya. La fase 5 necesita la app en el monorepo.
