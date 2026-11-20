# Especificación 018: Despliegue en Supabase y Render

**Estado:** aprobada por el usuario el 20 de noviembre de 2026 · **Fecha:** 20 de noviembre de 2026
**Origen:** pedido del usuario de llevar la base de datos a Supabase para que la tablet funcione fuera de la red local

## Objetivo

Que la API y la base de datos funcionen en internet, con HTTPS, sin depender de la computadora del desarrollador. La tablet deja de apuntar a `http://192.168.0.126:3100` y usa la dirección pública de la API.

## Decisiones

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Base de datos | Supabase, PostgreSQL 17, región São Paulo (`sa-east-1`) | Plan gratuito, PostgreSQL administrado y la región más cercana a Perú |
| API | Render, servicio web Docker con el `Dockerfile` de `backend/`, plan gratuito, región Virginia | Construye la misma imagen que la CI; HTTPS incluido. Render no tiene región en Sudamérica |
| Conexión | Pooler de sesión de Supabase (puerto 5432, IPv4) | La conexión directa de Supabase es solo IPv6 y Render no sale por IPv6; el pooler de transacciones (6543) no conserva el estado de sesión |
| TLS | `DATABASE_SSL=true` con validación del certificado y la CA de Supabase en `DATABASE_SSL_CA` | Supabase firma con su propia CA; desactivar la validación no es aceptable |
| Migraciones | Al arrancar el contenedor, antes de la API (`dockerCommand` en `render.yaml`) | El plan gratuito de Render no tiene `preDeployCommand`. TypeORM solo aplica las pendientes y hay una sola instancia |
| Primer Mayorista | `npm run bootstrap:wholesaler` desde la computadora del usuario, una vez, contra el pooler de sesión | Las credenciales iniciales nunca pasan por el repositorio, el chat ni Render |
| Secretos | `sync: false` en `render.yaml`; el usuario los pega en el panel de Render | Ningún secreto en el repositorio (regla 11) |

## Alcance

1. Variable opcional `DATABASE_SSL_CA` (PEM; admite los saltos de línea escritos como `\n`), validada al arrancar y usada por la API y por la fuente de datos de migraciones.
2. `render.yaml` en la raíz del repositorio.
3. Guía paso a paso para crear las cuentas y desplegar: [`docs/03-diseño-de-software/guia-despliegue-supabase-render.md`](../../docs/03-diseño-de-software/guia-despliegue-supabase-render.md).
4. Vista de despliegue actualizada.
5. APK de prueba que apunta a la dirección de Render.

Fuera de alcance: dominio propio, plan de pago, respaldos programados (Supabase gratuito no los ofrece con restauración a un punto en el tiempo) y la prueba de carga contra el entorno desplegado.

## Limitaciones conocidas del plan gratuito

- Render duerme el servicio tras 15 minutos sin tráfico; la primera petición tarda cerca de un minuto. La cola cifrada de la tablet reintenta, así que no se pierden operaciones.
- Supabase pausa el proyecto tras 7 días sin actividad; se reactiva desde su panel.
- El pooler de sesión gratuito admite pocas conexiones simultáneas: `DATABASE_POOL_SIZE=5`.

## Criterios de aceptación

1. `GET /api/v1/health/ready` en la dirección de Render responde `200` con la base de Supabase.
2. El Mayorista inicia sesión desde la APK sobre datos móviles, fuera de la red local.
3. Las migraciones aplicadas en Supabase coinciden con las de `data-source.ts`.
4. Ningún secreto aparece en el repositorio, el chat ni los registros de la CI.
5. Las pruebas del backend cubren `DATABASE_SSL_CA` (con y sin CA, PEM en una línea, valor inválido).
