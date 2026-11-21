# Verificación de escenarios de calidad con Postman

> **Spec:** [017](../../specs/017-sprint2-quality/spec.md), tarea T1708 · **Fecha:** 21 de noviembre de 2026 · **Atributos:** [AC01, AC03, AC04 y seguridad](../01-analisis-de-sistema/08-escenarios-atributos-calidad.md)

Postman CLI 1.90.0 ejecutó la colección [`escenarios-calidad.postman_collection.json`](../../backend/test/postman/escenarios-calidad.postman_collection.json) contra la API local, conectada a PostgreSQL 17 portable. La base era nueva, con dos negocios y un Mayorista en cada uno. **Resultado: 29 peticiones y 46 aserciones, sin fallas.** La salida está en [`2026-11-21-api-local.txt`](../../backend/test/postman/resultados/2026-11-21-api-local.txt) y el resumen en [`2026-11-21-api-local.summary.yaml`](../../backend/test/postman/resultados/2026-11-21-api-local.summary.yaml).

## Qué comprueba

| Carpeta | Escenario | Comprobación | Resultado |
| --- | --- | --- | --- |
| AC01 · Disponibilidad | Salud de la API y la base | `200`, base `up`, respuesta < 3 s | Cumple |
| Autenticación | Inicio de sesión | `201` con token y rol; contraseña incorrecta `401` sin token; consulta sin token `401` | Cumple |
| AC03 · Idempotencia | La misma recepción cinco veces | Los cinco envíos devuelven la misma recepción y el filtro por proveedor da un solo registro | Cumple |
| AC03 · Idempotencia | UUID reutilizado con otros datos | `409` con código `operation-id-conflict`; el registro original conserva su conductor | Cumple |
| AC04 · Aislamiento | El negocio B pide la recepción de A | `404` sin datos de A; cero registros al filtrar por el proveedor de A | Cumple |
| AC04 · Aislamiento | Registro del intento | La auditoría de B incluye `authorization.cross-business-denied` sobre la recepción de A | Cumple |
| Roles (HU12) | Encargado sin reemplazo | Su inicio de sesión responde `401` | Cumple |
| Roles (HU12) | Encargado con reemplazo de 2 h | Inicia sesión y registra una recepción (`201`) | Cumple |
| Roles (HU12) | Funciones del Mayorista | Administración de usuarios y auditoría responden `403`, y la auditoría del Mayorista registra la denegación (`authorization.denied`) | Cumple |
| Roles (HU12) | Revocación | Al revocar el reemplazo (`204`), la sesión abierta del Encargado responde `401` | Cumple |
| Seguridad | Límite de intentos | El sexto inicio de sesión en un minuto responde `429` | Cumple |

## Cómo repetirla

Pasos:

1. Levantar la API contra una base de prueba con dos negocios.
2. Generar la colección con `node test/postman/build-collection.mjs` (desde `backend/`).
3. Ejecutar:

```powershell
postman collection run test/postman/escenarios-calidad.postman_collection.json -e test/postman/local.postman_environment.json --env-var userA=... --env-var passwordA=... --env-var userB=... --env-var passwordB=...
```

Las contraseñas no están en el repositorio: se pasan al ejecutar. La colección crea su proveedor, variedad y Encargado con nombres únicos por corrida, así que puede repetirse sobre la misma base. Entre dos corridas hay que esperar un minuto, por el límite de cinco inicios de sesión.

Una segunda corrida lanzada antes de ese minuto recibió `429` desde el primer inicio de sesión. Es el comportamiento esperado del límite, y la corrida válida es la que se repitió después de esperar.

## Qué no demuestra

- **Una sola petición por escenario.** AC01 bajo carga se mide con k6 ([verificación del Sprint 2](verificacion-sprint2-2026-11-18.md)).
- **API local, no producción.** Contra Render habría que esperar el arranque en frío, de cerca de un minuto, y crear los usuarios de prueba allí.
- **El informe detallado de Postman** (`collection-run-executions.yaml`) no se publica, porque guarda las contraseñas de prueba de la corrida.
