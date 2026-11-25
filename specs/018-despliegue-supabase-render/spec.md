# Especificación 018: Despliegue en Supabase y Render

**Estado:** aprobada por el usuario el 20 de noviembre de 2026 · **Fecha:** 20 de noviembre de 2026
**Origen:** pedido del usuario de llevar la base de datos a Supabase para que la tablet funcione fuera de la red local

## Objetivo

Que la API y la base de datos funcionen en internet, con HTTPS, sin depender de la computadora del desarrollador. La tablet deja de apuntar a `http://192.168.0.126:3100` y usa la dirección pública de la API.

## Decisiones

| Tema | Decisión | Motivo |
| --- | --- | --- |
| Base de datos | Supabase, PostgreSQL 17, región East US (North Virginia, `us-east-1`) | Plan gratuito y PostgreSQL administrado, en la misma región que la API (ver «Cambio del 20 de noviembre») |
| API | Render, servicio web Docker con el `Dockerfile` de `backend/`, plan gratuito, región Virginia | Construye la misma imagen que la CI; HTTPS incluido. Render no tiene región en Sudamérica |
| Conexión | Pooler de sesión de Supabase (puerto 5432, IPv4) | La conexión directa de Supabase es solo IPv6 y Render no sale por IPv6; el pooler de transacciones (6543) no conserva el estado de sesión |
| TLS | `DATABASE_SSL=true` con validación del certificado y la CA de Supabase en `DATABASE_SSL_CA` | Supabase firma con su propia CA; desactivar la validación no es aceptable |
| Migraciones | Al arrancar el contenedor, antes de la API (`backend/docker-entrypoint.sh` con `RUN_MIGRATIONS_ON_START=true`) | El plan gratuito de Render no tiene `preDeployCommand`. TypeORM solo aplica las pendientes y hay una sola instancia |
| Primer Mayorista | `npm run bootstrap:wholesaler` desde la computadora del usuario, una vez, contra el pooler de sesión | Las credenciales iniciales nunca pasan por el repositorio, el chat ni Render |
| Secretos | `sync: false` en `render.yaml`; el usuario los pega en el panel de Render | Ningún secreto en el repositorio (regla 11) |

## Cambio del 20 de noviembre de 2026: región de la base

La primera versión ponía la base en São Paulo. Al crear el proyecto se eligió `us-east-1`: Render no tiene región en Sudamérica, y cada petición de la API hace varias consultas. Con la base en otra región cada consulta sumaría ~120 ms de ida y vuelta; con ambas en Virginia queda en ~1 ms. La tablet solo hace un viaje largo por petición.

## Corrección del 20 de noviembre de 2026: arranque del contenedor

El primer despliegue en Render terminó con el código 127: Render pasa `dockerCommand` sin interpretar las comillas, así que `sh` buscó un programa llamado como toda la línea. Las migraciones pasan a `backend/docker-entrypoint.sh`, que la imagen ejecuta por defecto; solo migra con `RUN_MIGRATIONS_ON_START=true`, de modo que Docker Compose sigue usando su servicio `migrate`.

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

## El despliegue en la documentación principal — 25 de noviembre de 2026

Hasta esta fecha, Render y Supabase solo aparecían en la vista y la guía de despliegue. Se incorporan donde un lector espera ver dónde corre el sistema, sin tocar los documentos de arquitectura que deciden *qué* usar (PostgreSQL 17) y no *dónde*:

- [`README.md`](../../README.md): despliegue actual y enlaces a la vista y la guía.
- [Decisiones arquitectónicas](../../docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md): nueva fila y **ADR-06 · Despliegue en Render y Supabase**, con sus consecuencias.
- [C4 nivel 2](../../docs/04-modelo-c4/Nivel2-DiagramadeContenedores.md): la API como contenedor en Render y PostgreSQL 17 gestionado en Supabase, en la tabla y en el diagrama (SVG editado y PNG renderizado de nuevo con Chrome sin interfaz).
- [Entrega y despliegue continuos](../../docs/03-diseño-de-software/entrega-y-despliegue-continuos.md): sección «Despliegue actual en Render»; el despliegue por SSH queda como opción para un servidor propio.
