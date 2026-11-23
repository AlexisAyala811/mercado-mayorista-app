# Plan 022: Retirar el inventario del código

**Especificación:** [spec 022](spec.md) · **Estado:** aprobado por el usuario el 23 de noviembre de 2026 («Sí, hazla»)

## Backend

| Pieza | Cambio |
| --- | --- |
| `retired/inventory/` | Se borra la carpeta completa: controlador, módulo, entidades y su prueba. |
| `app.module.ts` | Deja de importar `InventoryModule`. |
| `platform/database/data-source.ts` | Deja de listar las tres entidades. Las migraciones no cambian: son SQL y siguen creando las tablas. |
| `modules/documents/receipts.module.ts`, `receipts.service.ts` | Quitar el registro y la inyección de lotes y movimientos. |
| `modules/reception-and-purchases/purchase/purchase.module.ts`, `modules/sales/sales.module.ts` | Quitar el registro de las tres entidades. |
| `shared/operations` | Quitar el tipo `inventory-movement`, su repositorio y su registro. |
| `platform/openapi/operation-summaries.ts` | Quitar los cuatro resúmenes. |
| Pruebas | `operations.service.spec.ts`, `sales.service.spec.ts` y `test/commercial-database-scenarios.ts` dejan de usar las entidades; las comprobaciones de «sin inventario» pasan a SQL sobre las tablas. Ejemplos neutros en `roles.guard.spec.ts` y `api-exception.filter.spec.ts`. |

## App

| Pieza | Cambio |
| --- | --- |
| `domain/sync/retired-contract.ts` | Quitar la rama de `inventory.adjustment`; se conserva la de ventas con lotes. |
| `domain/sync/operation-order.ts` | Quitar el origen por `/inventory/lots`. |
| `features/auth/authorization/permissions.ts` | Quitar `inventory` de `ModuleId`. |
| `features/sync/sync-queue-provider.tsx` | Quitar `inventory.adjustment` del mapa de tipos. |
| `ui/operation-labels.ts` | Quitar la etiqueta y `inventoryMovementLabel`, que nadie usa. |
| Pruebas | Ajustar `permissions.test.ts` y `sync-provider.test.tsx`. |

## Documentación

`docs/api/openapi.json` regenerado, `docs/api/README.md`, `componentes-arquitectonicos.md` y la tabla de la spec 021 (sección fechada).

## Pruebas

Suite completa, build y e2e en PostgreSQL 17 portable en el backend; typecheck, lint y Jest en la app; CI de GitHub.

## Riesgos

- **Entidades usadas solo por TypeORM:** si alguna relación de otra entidad apuntara a inventario, quitar las entidades rompería los metadatos. No hay relaciones; se comprueba al arrancar la API y en las e2e.
- **Operación en cola:** ver CL-22-01.

## Cambios durante la implementación

Ninguno por ahora.
