# Verificación del Administrador de comerciantes

> **Spec:** [023](../../specs/023-administrador-comerciantes/spec.md) · **Fecha:** 26 de noviembre de 2026 · **Rama:** `feat/023-administrador` · **Decisión:** [ADR-07](../01-analisis-de-sistema/07-decisiones-arquitectonicas.md)

Verificación local del backend y la app antes de fusionar. No incluye el emulador, el celular ni Render y Supabase (ver «Pendiente»).

## Backend

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit --incremental false` | Sin errores |
| `npm run lint` | Sin errores (solo advertencias que ya existían) |
| `npm test` (Jest, unitarias) | 77 suites, 369 pruebas, todas en verde |
| `npm run test:e2e` en PostgreSQL 17 portable, base nueva | 11 suites, 76 pruebas, todas en verde |
| `npm run build` | Correcto |
| `bootstrap:admin` en una base nueva | La primera vez crea el negocio de plataforma y el Administrador; la segunda se niega («an administrator already exists») |
| Postman ([colección del Administrador](../../backend/test/postman/administrador.postman_collection.json)) | 14 peticiones y 23 aserciones sin fallos ([salida](../../backend/test/postman/resultados/2026-11-26-administrador.txt)); la contraseña del Administrador no aparece en la salida |
| [`openapi.json`](../api/openapi.json) | Regenerado con la API local: siete rutas del Administrador y `PATCH /auth/password`, cada una con resumen en español |

La prueba e2e [`merchant-administration.e2e-spec.ts`](../../backend/test/merchant-administration.e2e-spec.ts) cubre:

- alta idempotente (mismo `clientOperationId` → mismo comerciante; otros datos → `409 operation-id-conflict`; usuario repetido → `409 username-taken`);
- primer acceso con la contraseña temporal: `GET /auth/session` responde, cualquier otra ruta `403 password-change-required`, y tras `PATCH /auth/password` se trabaja con normalidad;
- búsqueda sin distinguir mayúsculas; el negocio de plataforma nunca aparece ni se puede suspender (`404`);
- estado de soporte: intentos fallidos, último acceso y sesiones abiertas; un acceso correcto reinicia el contador;
- suspensión inmediata (sesión abierta `401`, inicio de sesión `401`), con motivo auditado en el comerciante y en la plataforma; reactivación;
- contraseña temporal nueva: la anterior y las sesiones abiertas dejan de valer;
- **barrido del contrato OpenAPI**: cada ruta protegida fuera de `/auth`, `/admin` y `/health` responde `403` al Administrador.

El barrido encontró un hueco: las lecturas del catálogo (`GET /catalog/buyers`, proveedores y variedades) no declaraban roles y respondían `200` al Administrador. Como filtran por negocio, solo habría visto el negocio de plataforma, que está vacío. Aun así se cerró en dos niveles: el `RolesGuard` niega al Administrador toda ruta que no lo nombre, y el catálogo declara sus roles por clase.

## App

| Comprobación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores |
| `npm test -- --runInBand` | 111 suites, 759 pruebas, todas en verde |

Las pruebas nuevas ([`merchant-administration.test.tsx`](../../app/tests/merchants/merchant-administration.test.tsx) y [`root-navigation.test.tsx`](../../app/tests/auth/root-navigation.test.tsx)) comprueban:

- la sesión del Administrador y el cambio obligatorio se guardan y se validan;
- la contraseña temporal no usa caracteres que se confunden;
- el alta muestra la contraseña temporal una sola vez;
- cada acción de soporte exige motivo, pide confirmación y, tras perder la conexión, reintenta con el mismo `clientOperationId`;
- el Administrador solo tiene la pantalla «Comerciantes» y no ve la barra inferior;
- con una contraseña temporal, la capa bloqueante muestra «Crea tu contraseña».

## Pendiente

- **T2314:** recorrido en el emulador y en el celular, con capturas.
- **T2316:** despliegue en Render y primer Administrador en Supabase. El usuario lo crea con `npm run bootstrap:admin` desde su propia terminal.
- Lector de pantalla: no verificado.
