# Especificación 022: Retirar el inventario del código

**Estado:** aprobada por el usuario el 23 de noviembre de 2026 («Sí, hazla») · **Fecha:** 23 de noviembre de 2026
**Origen:** revisión del Sprint 2 · **Relacionada:** [ADR-01](../../docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md), [cambio de alcance sin inventario](../../docs/sdd/cambio-alcance-sin-inventario.md), T1707 de la [spec 017](../017-sprint2-quality/tasks.md), [spec 021](../021-modulos-backend/spec.md)

## Objetivo

El sistema no maneja inventario: compras y ventas son registros independientes. Aun así, el código conserva restos del control de existencias retirado: cuatro rutas `/inventory` que responden `410 Gone`, sus entidades TypeORM, registros en compras, ventas y documentos, un tipo de operación en la consulta de sincronización y, en la app, la operación «Ajustar inventario». Swagger muestra la etiqueta `inventory` como si fuera parte de la API.

Esta spec quita esos restos para que el código coincida con la decisión documentada. Sustituye al PR #50, que solo las marcaba como retiradas.

## Requisitos

| Id | Requisito |
| --- | --- |
| R1 | La API no expone ninguna ruta `/inventory`; el contrato OpenAPI no tiene la etiqueta `inventory`. |
| R2 | El backend no tiene módulo, controlador ni entidades de inventario, y ningún módulo activo los registra o inyecta. |
| R3 | La consulta de operaciones por `clientOperationId` ya no acepta el tipo `inventory-movement`. |
| R4 | La app no conoce la operación `inventory.adjustment`, el módulo `inventory` ni las etiquetas de movimientos de inventario. |
| R5 | Las tablas `inventory_lots`, `inventory_movements` e `inventory_lot_valuations` y sus migraciones se conservan con sus filas históricas (regla 7: no se borran hechos). |
| R6 | Se conservan las pruebas que comprueban que compras y ventas no escriben en esas tablas. |

## Criterios de aceptación

1. **Dado** el contrato exportado, **cuando** se buscan rutas o etiquetas `inventory`, **entonces** no hay ninguna y el contrato tiene 117 operaciones.
2. **Dado** un usuario autenticado, **cuando** llama a `/api/v1/inventory/lots`, **entonces** recibe `404`.
3. **Dado** el código de `backend/src` y `app/src`, **cuando** se busca `inventory` fuera de migraciones, pruebas de «sin inventario» y nombres de íconos, **entonces** no aparece.
4. Typecheck, lint, pruebas, build y e2e del backend, y typecheck, lint y pruebas de la app, en verde.

## Fuera de alcance

- Borrar o vaciar las tablas de inventario o cambiar sus migraciones.
- El contrato anterior de ventas con `lotId` en la cola de la app (`retired-contract.ts`): pertenece a ventas y sigue protegiendo operaciones históricas.
- Los íconos `inventory_2` de la interfaz: son el nombre de un ícono de caja.

## Aclaraciones

- **CL-22-01 · Operaciones de inventario en cola.** Se asume que ninguna tablet o celular tiene un ajuste de inventario pendiente sin sincronizar: la app dejó de ofrecerlo con el retiro del 7 de octubre de 2026, antes de las pruebas en dispositivos. Si apareciera uno, se vería como operación con error y el usuario podría descartarlo. Adoptada sin preferencia distinta del usuario.
- **CL-22-02 · Número de operaciones.** El contrato de `main` del 23 de noviembre de 2026 tiene 121 operaciones; al quitar las cuatro de inventario quedan 117.
