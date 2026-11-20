# Tareas 018: Despliegue en Supabase y Render

**Especificación:** [spec 018](spec.md) · **Estado:** en curso desde el 20 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1801** `DATABASE_SSL_CA` en el esquema de entorno, `postgres-options.ts`, `app.module.ts`, `data-source.ts` y `.env.example`. **Hecho:** `backend/src/database/postgres-options.spec.ts` y `backend/src/config/environment.schema.spec.ts`.
- [x] **T1802** `render.yaml` con migraciones al arrancar, chequeo de salud y secretos con `sync: false`. **Hecho:** [`render.yaml`](../../render.yaml).
- [x] **T1803** Guía de despliegue y vista de despliegue actualizada. **Hecho:** [guía](../../docs/03-diseño-de-software/guia-despliegue-supabase-render.md), [vista de despliegue](../../docs/03-diseño-de-software/vista-de-despliegue.md).
- [x] **T1804** Crear el proyecto en Supabase (`us-east-1`, Data API desactivada) y el Blueprint en Render. **Hecho el 20 nov 2026:** la validación TLS contra el pooler de sesión con la CA oficial (huella SHA-256 `80:70:25:AD:…:CA:FA`) respondió `28P01` con una contraseña falsa y `SELF_SIGNED_CERT_IN_CHAIN` sin la CA.
- [x] **T1808** Arranque con `docker-entrypoint.sh`: el primer despliegue falló con el código 127 por las comillas de `dockerCommand`. **Hecho el 20 nov 2026:** PR #42; desde entonces el contenedor ejecuta las migraciones y solo fallaba por la contraseña (T1806).
- [x] **T1805** Crear el primer Mayorista en Supabase con `bootstrap:wholesaler`. **Hecho el 20 nov 2026** por el usuario desde su PowerShell; las credenciales no pasaron por el repositorio ni el chat.
- [x] **T1806** Comprobar `GET /api/v1/health/ready` en la dirección de Render y registrar la evidencia. **Hecho el 20 nov 2026 a las 16:18 (hora de Perú):** `https://manay-api.onrender.com/api/v1/health/ready` respondió `200` con la base `up` (4 ms); `health/live` `200` con certificado válido; `POST /auth/sessions` con datos falsos `401 Credenciales no válidas` (las tablas existen); `/api/docs` `404` (OpenAPI desactivado en producción). Antes, cinco despliegues fallaron con `28P01`: el campo de Render guardaba la contraseña con un salto de línea final al pegarla (15 caracteres frente a 14). Se detectó comparando una huella SHA-256 truncada de ambos valores, sin mostrar la contraseña.
- [ ] **T1807** APK de prueba con la dirección de Render; inicio de sesión desde la tablet con datos móviles.
