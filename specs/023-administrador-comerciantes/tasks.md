# Tareas 023: Administrador de comerciantes y soporte

**Especificación:** [spec 023](spec.md) · **Plan:** [plan 023](plan.md) · **Estado:** implementada en la rama `feat/023-administrador` el 26 de noviembre de 2026; quedan T2314 (celular) y T2316 (despliegue)

Cada tarea se marca `[x]` solo con evidencia enlazable.

## Backend

- [x] **T2301** Migración 031: `admin` en `user_role`, `businesses.kind` y `users.must_change_password`, solo agregando. Evidencia: [migración 031](../../backend/src/platform/database/migrations/202611260031-merchant-administration.ts), con la tabla `admin_operations` para la idempotencia; e2e en base nueva ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2302** `UserRole.Admin`, `BusinessKind` y script `bootstrap:admin`. Evidencia: [`bootstrap-admin.ts`](../../backend/src/platform/database/bootstrap-admin.ts); probado en base nueva: crea y luego se niega ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2303** Inicio de sesión: negocio suspendido → `401`; `must_change_password` limita la sesión; último acceso e intentos fallidos. Evidencia: e2e: suspendido → `401`, cambio obligatorio → `403 password-change-required`, contador de intentos ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2304** `PATCH /api/v1/auth/password` para el cambio obligatorio. Evidencia: [`change-password.use-case.ts`](../../backend/src/modules/identity/application/change-password.use-case.ts); e2e ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2305** Rutas `/api/v1/admin/merchants…`: listar, alta, suspender, reactivar, restablecer contraseña, cerrar sesiones y estado. Evidencia: [`merchant-administration.controller.ts`](../../backend/src/modules/identity/http/merchant-administration.controller.ts); e2e ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2306** Auditoría de cada acción del Administrador, con motivo. Evidencia: auditoría en el comerciante y en la plataforma con motivo y `clientOperationId`; e2e ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2307** OpenAPI con resumen para cada ruta nueva. Evidencia: [`openapi.json`](../../docs/api/openapi.json) regenerado; prueba de resúmenes en verde ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).

## App

- [x] **T2308** Menú del Administrador «Comerciantes» con lista, alta, detalle y acciones de soporte. Evidencia: [`merchants-screen.tsx`](../../app/src/features/merchants/screens/merchants-screen.tsx); pruebas de la app ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2309** Pantalla obligatoria «Crea tu contraseña». Evidencia: [`change-password-screen.tsx`](../../app/src/features/auth/screens/change-password-screen.tsx); prueba de navegación ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2310** «¿Olvidó su clave?» según el rol. Evidencia: [`login-screen.tsx`](../../app/src/features/auth/screens/login-screen.tsx): el Encargado acude al Mayorista y el Mayorista al soporte de MAÑAY ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).

- [x] **T2317** Selección rápida limitada al último negocio que ingresó en la tablet (CL-23-06). Evidencia: [recent-operators.ts](../../app/src/domain/auth/recent-operators.ts) y su prueba [recent-operators.test.tsx](../../app/tests/auth/recent-operators.test.tsx); app con 760 pruebas en verde el 26 nov 2026. No probado aún en el emulador.

## Pruebas y verificación

- [x] **T2311** Unitarias del backend y de la app. Evidencia: backend 369 y app 759 pruebas en verde ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2312** E2e en PostgreSQL, incluida la prueba que exige `403` al Administrador en todas las rutas de negocio. Evidencia: [`merchant-administration.e2e-spec.ts`](../../backend/test/merchant-administration.e2e-spec.ts); 76 e2e en verde ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [x] **T2313** Carpeta «Administrador» en la colección de Postman. Evidencia: [colección aparte](../../backend/test/postman/administrador.postman_collection.json), porque la otra ya usa el límite de 5 inicios de sesión por minuto: 14 peticiones y 23 aserciones sin fallos ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [ ] **T2314** Recorrido en el emulador y en el celular con capturas. Avance: emulador hecho el 26 de noviembre de 2026 con ocho capturas ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md#emulador)); falta el celular.

## Documentación y despliegue

- [x] **T2315** Actores y matriz de autorización, requisitos, ADR-07, componentes y C4. Evidencia: [actores](../../docs/01-analisis-de-sistema/01-actores.md), [RF28](../../docs/01-analisis-de-sistema/03-requisitos-funcionales.md), [ADR-07](../../docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md), [componentes](../../docs/02-arquitectura-software/componentes-arquitectonicos.md) y [C4 nivel 1](../../docs/04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md) ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md)).
- [ ] **T2316** Despliegue en Render y primer Administrador en Supabase con `bootstrap:admin`.
