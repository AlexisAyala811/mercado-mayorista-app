# Plan 023: Administrador de comerciantes y soporte

**Especificación:** [spec 023](spec.md) · **Fecha:** 26 de noviembre de 2026 · **Implementación:** después de la exposición del Sprint 2

## Enfoque

Todo vive en el módulo **Identidad y acceso** (`backend/src/modules/identity/`). Las rutas de operaciones no se tocan: declaran sus roles con `@Roles(...)` y, al no incluir `admin`, `RolesGuard` ya responde `403` al Administrador. La seguridad se demuestra con pruebas e2e y con Postman.

## Base de datos (solo agregar)

| Migración | Cambio | Compatibilidad |
| --- | --- | --- |
| 031 | Valor `admin` en el enum `user_role` | La versión anterior nunca lo lee |
| 031 | `businesses.kind` (`merchant` por defecto, o `platform`) | El negocio actual queda como `merchant` |
| 031 | `users.must_change_password` (`false` por defecto) | Los usuarios actuales no cambian |

## Backend

1. **Rol y negocio plataforma:** `UserRole.Admin` y `BusinessKind`. Script `bootstrap:admin` (crea el negocio `platform` y el Administrador una sola vez; se niega si ya existe un Administrador).
2. **Inicio de sesión:**
   - rechaza (`401`) a usuarios de negocios suspendidos;
   - con `must_change_password`, la sesión solo permite `PATCH /api/v1/auth/password`;
   - registra el último acceso y los intentos fallidos recientes.
3. **Rutas del Administrador** (`/api/v1/admin/merchants`, solo `@Roles(UserRole.Admin)`):
   - `GET` lista y búsqueda;
   - `POST` alta de negocio y Mayorista, en una transacción;
   - `POST …/:id/suspend` y `…/:id/reactivate`, con motivo;
   - `POST …/:id/password-reset`, con contraseña temporal;
   - `POST …/:id/sessions/revoke`;
   - `GET …/:id/status` (último acceso, sesiones abiertas, intentos fallidos).
4. **Auditoría:** cada acción del Administrador con motivo, en el negocio afectado y en el de plataforma.
5. **Idempotencia:** las escrituras llevan `clientOperationId` (regla 6 del proyecto).
6. **OpenAPI:** resumen en español para cada ruta nueva.

## App

1. Menú del Administrador, **«Comerciantes»**: lista, alta, detalle con estado y las acciones de soporte con confirmación.
2. Pantalla obligatoria **«Crea tu contraseña»** cuando la sesión llega con `must_change_password`.
3. Texto de **«¿Olvidó su clave?»** según el rol.
4. El Administrador no ve Compra, Venta ni los demás módulos de negocio.

## Pruebas

- Unitarias: inicio de sesión con negocio suspendido, cambio obligatorio de contraseña y guardas de rol.
- E2e en PostgreSQL: alta, suspensión con cierre de sesiones, reactivación, restablecimiento y `403` del Administrador en las rutas de operaciones.
- Postman: carpeta nueva «Administrador» en `escenarios-calidad`.
- App (Jest): menú por rol, pantalla de cambio de contraseña y flujo de alta.

## Despliegue

- Las migraciones se aplican solas al arrancar en Render.
- El primer Administrador en Supabase lo crea el usuario con `bootstrap:admin` desde su PowerShell. La contraseña se escribe ahí, nunca en el chat.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Una ruta de operaciones sin `@Roles` dejaría pasar al Administrador | Prueba que recorre todas las rutas del contrato OpenAPI y exige `403` al Administrador en las de negocio |
| El negocio `platform` aparece en reportes o listados | Filtro por `kind = 'merchant'` en el listado del Administrador; el Administrador no tiene acceso a las rutas de negocio |
| Romper el inicio de sesión antes de exponer | Se implementa después de la exposición (CL-23-04) |
