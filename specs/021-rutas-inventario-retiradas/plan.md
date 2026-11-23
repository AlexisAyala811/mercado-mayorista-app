# Plan 021: Rutas de inventario retiradas

**Especificación:** [spec 021](spec.md) · **Estado:** aprobado por el usuario el 22 de noviembre de 2026 («Sí, hazla»)

## Diseño

| Pieza | Cambio |
| --- | --- |
| `inventory/inventory.controller.ts` | `@ApiGoneResponse` a nivel de controlador y `@ApiOperation({ deprecated: true })` en cada ruta (`@nestjs/swagger` 12, consultado en Context7 el 22 nov 2026). El cuerpo sigue lanzando `GoneException`. |
| `inventory/inventory.module.ts` | Registra las tres entidades con `TypeOrmModule.forFeature`. Con `autoLoadEntities: true`, así siguen en los metadatos de TypeORM aunque compras y ventas dejen de registrarlas. |
| `purchase.module.ts`, `sales.module.ts`, `receipts.module.ts` | Quitar `InventoryLotEntity`, `InventoryMovementEntity` e `InventoryLotValuationEntity` de `forFeature`. |
| `receipts/receipts.service.ts` | Quitar los parámetros `lots` y `movements` del constructor; ajustar los dos lugares de prueba que lo construyen a mano. |
| `operations` | Sin cambios: sigue resolviendo `inventory-movement` (R5). |
| `openapi/operation-summaries.ts` | Resúmenes «Retirada (410): …». |
| `docs/api/openapi.json` | Regenerado con `OPENAPI_ENABLED=true`, según `docs/api/README.md`. |

## Pruebas

- `operation-summaries.spec.ts`: nueva prueba que exige `deprecated` y respuesta `410` en toda operación de `/inventory` del contrato exportado.
- `inventory-scope.spec.ts` se mantiene (410 sin servicio).
- `sales.service.spec.ts` se mantiene: ya comprueba que la venta no consulta ni guarda lotes ni movimientos.
- Suite completa, build y e2e en PostgreSQL portable (las e2e construyen `ReceiptsService` a mano).

## Riesgos y alternativas

- **Quitar entidades de `forFeature` sin registrarlas en otro módulo** las sacaría de TypeORM y romperían las consultas de operaciones antiguas. Por eso se registran en `InventoryModule`.
- **`@ApiExcludeController`** ocultaría las rutas, pero seguirían existiendo sin documentar. Descartado: mejor declararlas retiradas.

## Cambios durante la implementación

- `operation-summaries.ts`: los resúmenes de las cuatro rutas pasan a «Retirada (410): …».
- `openapi.json` se guarda con sangría de dos espacios, como el archivo anterior, para que el diff solo muestre las cuatro rutas.
