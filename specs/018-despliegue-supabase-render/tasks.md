# Tareas 018: Despliegue en Supabase y Render

**Especificación:** [spec 018](spec.md) · **Estado:** en curso desde el 20 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1801** `DATABASE_SSL_CA` en el esquema de entorno, `postgres-options.ts`, `app.module.ts`, `data-source.ts` y `.env.example`. **Hecho:** `backend/src/database/postgres-options.spec.ts` y `backend/src/config/environment.schema.spec.ts`.
- [x] **T1802** `render.yaml` con migraciones al arrancar, chequeo de salud y secretos con `sync: false`. **Hecho:** [`render.yaml`](../../render.yaml).
- [x] **T1803** Guía de despliegue y vista de despliegue actualizada. **Hecho:** [guía](../../docs/03-diseño-de-software/guia-despliegue-supabase-render.md), [vista de despliegue](../../docs/03-diseño-de-software/vista-de-despliegue.md).
- [ ] **T1804** Crear el proyecto en Supabase y el servicio en Render (lo hace el usuario con la guía).
- [ ] **T1805** Crear el primer Mayorista en Supabase con `bootstrap:wholesaler`.
- [ ] **T1806** Comprobar `GET /api/v1/health/ready` en la dirección de Render y registrar la evidencia.
- [ ] **T1807** APK de prueba con la dirección de Render; inicio de sesión desde la tablet con datos móviles.
