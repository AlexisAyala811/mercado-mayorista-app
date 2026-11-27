# Tareas 023: Administrador de comerciantes y soporte

**Especificación:** [spec 023](spec.md) · **Plan:** [plan 023](plan.md) · **Estado:** pendiente; se implementa después de la exposición del Sprint 2

Cada tarea se marca `[x]` solo con evidencia enlazable.

## Backend

- [ ] **T2301** Migración 031: `admin` en `user_role`, `businesses.kind` y `users.must_change_password`, solo agregando.
- [ ] **T2302** `UserRole.Admin`, `BusinessKind` y script `bootstrap:admin`.
- [ ] **T2303** Inicio de sesión: negocio suspendido → `401`; `must_change_password` limita la sesión; último acceso e intentos fallidos.
- [ ] **T2304** `PATCH /api/v1/auth/password` para el cambio obligatorio.
- [ ] **T2305** Rutas `/api/v1/admin/merchants…`: listar, alta, suspender, reactivar, restablecer contraseña, cerrar sesiones y estado.
- [ ] **T2306** Auditoría de cada acción del Administrador, con motivo.
- [ ] **T2307** OpenAPI con resumen para cada ruta nueva.

## App

- [ ] **T2308** Menú del Administrador «Comerciantes» con lista, alta, detalle y acciones de soporte.
- [ ] **T2309** Pantalla obligatoria «Crea tu contraseña».
- [ ] **T2310** «¿Olvidó su clave?» según el rol.

## Pruebas y verificación

- [ ] **T2311** Unitarias del backend y de la app.
- [ ] **T2312** E2e en PostgreSQL, incluida la prueba que exige `403` al Administrador en todas las rutas de negocio.
- [ ] **T2313** Carpeta «Administrador» en la colección de Postman.
- [ ] **T2314** Recorrido en el emulador y en el celular con capturas.

## Documentación y despliegue

- [ ] **T2315** Actores y matriz de autorización, requisitos, ADR-07, componentes y C4.
- [ ] **T2316** Despliegue en Render y primer Administrador en Supabase con `bootstrap:admin`.
