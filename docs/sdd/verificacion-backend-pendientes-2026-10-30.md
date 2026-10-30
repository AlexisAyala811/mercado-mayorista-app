# Verificación del backend: pendientes de aislamiento, anulación y registro

**Fecha:** 30 de octubre de 2026 · **Antecedente:** [verificación del backend del 29 de octubre](verificacion-backend-2026-10-29.md) · **Código:** `backend/` del repositorio `mercado-mayorista-app`, rama `fix/backend-pendientes`

## Alcance verificado

| Pendiente | Especificación | Cambio |
| --- | --- | --- |
| E2E HTTP con dos negocios: `404` y evento `authorization.cross-business-denied` solo en el negocio que intenta | 001 | `backend/test/voided-credit-and-isolation.e2e-spec.ts` |
| E2E de anulación de venta a crédito: cuenta y cuotas `voided` con saldo cero, sin caja | 004 | `backend/test/voided-credit-and-isolation.e2e-spec.ts` |
| Registro de consultas sin parámetros enlazados | 001 | `backend/src/database/query-logger.ts`, `postgres-options.ts` |

## Registro de consultas

Con `NODE_ENV=development`, TypeORM imprimía cada consulta con sus parámetros, entre ellos el hash de contraseña al crear usuarios, los tokens de sesión y datos personales de compradores. `ParameterlessQueryLogger` imprime solo el SQL y es el logger de toda conexión creada con `createPostgresOptions` (aplicación y `data-source.ts` de migraciones).

Un logger propio decide por sí mismo qué imprimir, así que replica las reglas que TypeORM 1.1.1 aplica a una opción `logging` booleana: consultas y fallos solo si está activada; consultas lentas (más de 1000 ms) y migraciones siempre; esquema e información nunca. La primera ejecución e2e mostró consultas impresas con `logging` desactivado; se corrigió y se añadió la prueba del caso desactivado.

## Resultados locales

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Sin errores |
| `oxlint --type-aware` en los archivos cambiados | Sin errores ni avisos |
| Pruebas unitarias (Vitest) | 267 aprobadas en 65 archivos; antes eran 264 en 64 |
| E2E en PostgreSQL 17 portable | 37/37 en 4 archivos (antes 35/35 en 3), con `NODE_ENV=test`; ninguna línea de consulta impresa |

## No verificado

- El límite de 5 intentos de inicio de sesión detrás del proxy HTTPS de producción sigue pendiente hasta que exista el entorno.
- La visualización de cuotas `voided` como «Anulada» en Android corresponde a la app.
