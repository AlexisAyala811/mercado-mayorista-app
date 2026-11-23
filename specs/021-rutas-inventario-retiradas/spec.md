# Especificación 021: Rutas de inventario retiradas en el contrato y sin dependencias residuales

**Estado:** aprobada por el usuario el 22 de noviembre de 2026 («Sí, hazla») · **Fecha:** 22 de noviembre de 2026
**Origen:** revisión del Sprint 2 (actividades 4 y 6) · **Relacionada:** [ADR-01](../../docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md), [cambio de alcance sin inventario](../../docs/sdd/cambio-alcance-sin-inventario.md), T1707 de la [spec 017](../017-sprint2-quality/tasks.md)

## Objetivo

El sistema no maneja inventario: compras y ventas son registros independientes. El backend conserva cuatro rutas antiguas de `/inventory` que responden `410 Gone` y las tablas con su historial, como se decidió en T1707. Hoy quedan dos incoherencias:

1. **El contrato OpenAPI las presenta como activas.** Swagger muestra «Lista los lotes de inventario» o «Registra un ajuste de un lote», sin marca de retiro y sin la respuesta `410`. Quien lea `/api/v1/docs` ve un módulo de inventario funcionando.
2. **Dependencias que nadie usa.** `ReceiptsService` recibe los repositorios de lotes y movimientos y no los usa; `PurchaseModule`, `SalesModule` y `ReceiptsModule` registran entidades de inventario que no necesitan. Sugiere que compras y ventas tocan stock, y contradice la segregación de interfaces (SOLID).

## Requisitos

| Id | Requisito |
| --- | --- |
| R1 | Las cuatro operaciones de `/inventory` aparecen en OpenAPI con `deprecated: true`, una respuesta `410` documentada y un resumen que diga que están retiradas. |
| R2 | Las rutas siguen respondiendo `410 Gone` con el mismo mensaje; ninguna lee ni escribe stock. |
| R3 | Recepciones, compras y ventas no inyectan ni registran entidades de inventario. |
| R4 | Las entidades y tablas de inventario se conservan con sus filas históricas y quedan registradas solo en `InventoryModule`; ninguna migración borra datos. |
| R5 | La consulta de operaciones por `clientOperationId` sigue resolviendo movimientos antiguos (`inventory-movement`), para que la tablet obtenga respuesta de operaciones viejas en cola. |
| R6 | `docs/api/openapi.json` se regenera desde la API y se mantiene el número de operaciones (121). |

## Criterios de aceptación

1. **Dado** el contrato exportado, **cuando** se leen las operaciones de `/inventory`, **entonces** las cuatro tienen `deprecated: true` y respuesta `410`.
2. **Dado** un usuario autenticado, **cuando** llama a cualquier ruta de `/inventory`, **entonces** recibe `410` con «El control de existencias fue retirado…».
3. **Dado** el código de `receipts`, `purchase` y `sales`, **cuando** se buscan importaciones de `inventory/entities` fuera de pruebas, **entonces** no hay ninguna.
4. Typecheck, lint, pruebas unitarias, build y e2e en PostgreSQL 17 en verde.

## Fuera de alcance

- Borrar tablas, entidades o migraciones de inventario.
- Quitar las rutas `410`: siguen como aviso explícito para clientes antiguos.
- Cambiar la cola de sincronización de la app.

## Aclaraciones

Sin dudas abiertas. Se adoptó la propuesta presentada al usuario el 22 de noviembre de 2026: marcar como retiradas en el contrato, quitar las inyecciones y registros sin uso, y conservar entidades, tablas, rutas `410` y la consulta de operaciones antiguas.
