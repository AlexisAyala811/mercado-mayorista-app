# Tareas 010: Lotes con precio propio y flete elegible en la compra

**Especificación:** [spec 010](spec.md) · **Plan:** [plan 010](plan.md) · **Estado:** pendiente de aprobación del plan

Cada tarea se marca `[x]` solo con evidencia enlazable. Las de backend van en una rama y un PR; las de la app, cuando la app esté en el monorepo (T900).

## Fase 1 · Cálculo (backend, sin base de datos)

- [ ] **T1001** `purchase/domain/purchase-lots.ts`: `groupSacks` (grupos por variedad y calidad con sacos y neto, letras estables) y `planPurchaseLots` (cobertura exacta, importe por lote, bruto). *Verificación:* ejemplo de la spec (S/ 2 337,40 + S/ 1 800,00 = S/ 4 137,40), redondeo por lote mitad hacia arriba, grupo faltante, sobrante y repetido, saco sin calidad, mismo orden de letras con sacos en otro orden.
- [ ] **T1002** Regla del líquido según `freightChargedTo`. *Verificación:* S/ 3 907,40 con flete del proveedor y S/ 4 037,40 del Mayorista; líquido negativo rechazado en ambos casos.

## Fase 2 · Datos (backend)

- [ ] **T1010** Migración 029 `PurchaseSettlementLots`: tipo `freight_charge_party`, columna `freight_charged_to`, `price_basis` y `unit_price_cents` opcionales, tabla `purchase_settlement_lots` con sus restricciones. *Verificación:* e2e de migraciones; una liquidación existente conserva sus importes; `down` rechazado si hay lotes y correcto si no los hay.
- [ ] **T1011** Entidad `PurchaseSettlementLotEntity` y campos nuevos de `PurchaseSettlementEntity`; actualizar el modelo de datos. *Verificación:* tipos y suite unitaria.

## Fase 3 · API (backend)

- [ ] **T1020** DTO: `lots` (1–20, base, precio > 0, nombre ≤ 60) y `freightChargedTo`; exclusión con `priceBasis`/`unitPriceCents`. *Verificación:* pruebas del DTO para los casos `400` del plan.
- [ ] **T1021** `PurchaseService.settle` con lotes: guarda lotes y liquidación en la misma transacción, flete pendiente igual en ambos casos, reintento comparando lotes y responsable del flete, auditoría con ambos. Camino anterior sin cambios. *Verificación:* pruebas del servicio, incluida la del cuerpo actual con el mismo resultado de hoy.
- [ ] **T1022** Lectura uniforme: `lots` y `freightChargedTo` en la respuesta; liquidación antigua como un único lote calculado al leer. Ruta `settlement-groups`. *Verificación:* pruebas del controlador y del servicio; permisos iguales a la liquidación.
- [ ] **T1023** E2E PostgreSQL con los escenarios de la spec: dos lotes con bases distintas, flete del Mayorista, flete del proveedor, sacos sin lote (`422`), cinco reenvíos simultáneos y `409`, compra antigua, aplicación anterior; anulación de una compra con lotes. *Verificación:* suite e2e en local y en la CI.

## Fase 4 · Documentos, reportes y analítica (backend)

- [ ] **T1030** Comprobante de compra con una línea por lote y línea informativa del flete asumido. *Verificación:* PDF de muestra revisado a ojo; prueba de contenido.
- [ ] **T1031** Reportes de compra por lote cuando existen. *Verificación:* filas y totales iguales a la suma de lotes; compras antiguas sin cambios.
- [ ] **T1032** Analítica: importe por variedad con la suma de sus lotes. *Verificación:* e2e con una compra nueva y una antigua de la misma variedad.
- [ ] **T1033** Contrato en OpenAPI y verificación del backend con evidencia (`docs/sdd/`). *Verificación:* CI de backend y de documentación en verde.

## Fase 5 · App MAÑAY

- [ ] **T1040** Pantalla de liquidación con los lotes de `settlement-groups`: base y precio por lote, nombre opcional, vista previa en céntimos con `BigInt`, elección del flete. *Verificación:* pruebas Jest y recorrido en tablet 1280 × 800.
- [ ] **T1041** Cola sin conexión: la orden con lotes se guarda cifrada y se reenvía con el mismo UUID; un `409` se muestra como aviso sin reintentar (CL-FM16). *Verificación:* pruebas de la cola.
- [ ] **T1042** Detalle de compra y comprobante con lotes en la app. *Verificación:* pruebas de componente y tablet.

## Convergencia

- [ ] **T1050** Lista de convergencia de la spec 010 con evidencia; actualizar el estado en el índice de specs y la spec 002.

## Orden y dependencias

```text
T1001 → T1002 ─┐
T1010 → T1011 ─┼→ T1020 → T1021 → T1022 → T1023 → T1030 / T1031 / T1032 → T1033
               │                                               └→ T1040 → T1041 → T1042 (requiere T900)
               └──────────────────────────────────────────────────────────────────→ T1050
```

Las fases 1 a 4 son backend y pueden avanzar ya. La fase 5 necesita la app en el monorepo.
