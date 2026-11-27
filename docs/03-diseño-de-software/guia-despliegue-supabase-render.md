# Guía de despliegue en Supabase y Render

> **Proyecto:** MAÑAY · **Fecha:** 20 de noviembre de 2026 · **Especificación:** [spec 018](../../specs/018-despliegue-supabase-render/spec.md)

Pasos para poner la base de datos en Supabase y la API en Render, ambos en plan gratuito. Las contraseñas y el certificado se pegan solo en los paneles de Supabase y Render o en tu propia terminal: nunca en el repositorio ni en un chat.

## Orden

1. Supabase: proyecto, cadena del pooler de sesión y certificado (desmarca **Enable Data API**: la API se conecta directo a PostgreSQL).
2. Fusionar en `main` el PR de la spec 018 (Render lee `render.yaml` de `main`).
3. Render: crear el servicio desde el Blueprint.
4. Crear el primer Mayorista desde tu computadora.
5. Comprobar la salud y generar la APK con la nueva dirección.

## 1. Supabase

1. Entra a <https://supabase.com> e inicia sesión con tu cuenta de GitHub.
2. **New project**:
   - Nombre: `manay`.
   - **Database Password**: pulsa *Generate a password* y guárdala en tu gestor de contraseñas. Supabase no vuelve a mostrarla.
   - **Region**: *East US (North Virginia)* (`us-east-1`), la misma región que Render. Si solo ves «Americas», pulsa **Need a specific region?**
   - Plan: *Free*.
3. Cuando el proyecto termine de crearse, pulsa **Connect** (arriba) y elige **Session pooler**. Anota:
   - **host**: algo como `aws-1-us-east-1.pooler.supabase.com`;
   - **user**: `postgres.` seguido de la referencia del proyecto;
   - puerto `5432` y base `postgres` (ya están en `render.yaml`).
4. **Project Settings → Database → SSL Configuration → Download certificate**. Se descarga `prod-ca-2021.crt` (es público; no es un secreto, pero tampoco hace falta subirlo al repositorio).

No uses la *Direct connection*: solo funciona por IPv6 y Render no la alcanza. Tampoco el *Transaction pooler* (puerto 6543).

## 2. Fusionar el PR

Render necesita `render.yaml` en `main`. Fusiona el PR de la spec 018 con la CI en verde.

## 3. Render

1. Entra a <https://render.com> e inicia sesión con GitHub. Autoriza el acceso al repositorio `mercado-mayorista-app`.
2. **New → Blueprint**, elige el repositorio y la rama `main`. Render muestra el servicio `manay-api` y pide los valores marcados con `sync: false`:

   | Variable | Valor |
   | --- | --- |
   | `DATABASE_HOST` | El host del pooler de sesión |
   | `DATABASE_USER` | `postgres.<referencia>` |
   | `DATABASE_PASSWORD` | La contraseña de la base de datos de Supabase |
   | `DATABASE_SSL_CA` | Abre `prod-ca-2021.crt` con el Bloc de notas y pega todo su contenido, desde `-----BEGIN CERTIFICATE-----` hasta `-----END CERTIFICATE-----` |

3. **Apply**. El primer despliegue construye la imagen (unos minutos), aplica las migraciones y arranca la API. En **Logs** debe aparecer el listado de migraciones y luego el inicio de NestJS.
4. Copia la dirección del servicio: `https://manay-api-xxxx.onrender.com`.

Si el despliegue falla con `self-signed certificate in certificate chain`, el certificado no se pegó completo. Si falla con `password authentication failed` (`28P01`):

- El campo de valor de Render es un área de texto y, al pegar, puede guardar un **salto de línea al final**. Tras pegar la contraseña pulsa Ctrl+End y Backspace si el cursor queda en una segunda línea, y comprueba con el ojo que la longitud sea la esperada.
- Tras un «Reset password», el pooler de Supabase puede tardar unos minutos en aceptar la nueva.
- Si el usuario fuera incorrecto, el error sería `Tenant or user not found`, no `28P01`.

## 4. Primer Mayorista

Solo después de que Render haya aplicado las migraciones. En Windows PowerShell, desde la carpeta `backend` del repositorio, cambia los valores entre comillas por los tuyos:

```powershell
$env:DATABASE_HOST = "aws-1-us-east-1.pooler.supabase.com"
$env:DATABASE_USER = "postgres.tu-referencia"
$env:DATABASE_NAME = "postgres"
$env:DATABASE_SSL = "true"
$env:DATABASE_SSL_CA = Get-Content -Raw "$HOME\Downloads\prod-ca-2021.crt"
$env:DATABASE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString "Contraseña de Supabase")))
$env:BOOTSTRAP_BUSINESS_NAME = "Nombre del negocio"
$env:BOOTSTRAP_USERNAME = "usuario-del-mayorista"
$env:BOOTSTRAP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString "Contraseña del Mayorista (12+ caracteres)")))
npm run bootstrap:wholesaler
```

Las contraseñas se escriben ocultas y no quedan en el historial. Debe terminar con `Initial business and wholesaler created.` Si ya existe un usuario, el comando se niega y no cambia nada. Cierra la ventana de PowerShell al terminar para borrar las variables.

## 4b. Primer Administrador (spec 023)

El Administrador da de alta a los comerciantes y atiende sus cuentas sin ver sus operaciones ([ADR-07](../01-analisis-de-sistema/07-decisiones-arquitectonicas.md)). Se crea una sola vez, después de que Render haya aplicado la migración 031. En Windows PowerShell, desde la carpeta `backend`, con las mismas variables de conexión del paso 4:

```powershell
$env:DATABASE_HOST = "aws-1-us-east-1.pooler.supabase.com"
$env:DATABASE_USER = "postgres.tu-referencia"
$env:DATABASE_NAME = "postgres"
$env:DATABASE_SSL = "true"
$env:DATABASE_SSL_CA = Get-Content -Raw "$HOME\Downloads\prod-ca-2021.crt"
$env:DATABASE_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString "Contraseña de Supabase")))
$env:BOOTSTRAP_ADMIN_USERNAME = "soporte"
$env:BOOTSTRAP_ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR((Read-Host -AsSecureString "Contraseña del Administrador (12+ caracteres)")))
npm run bootstrap:admin
```

Debe terminar con `Platform business and administrator created.` Si ya existe un Administrador, el comando se niega y no cambia nada. Los comerciantes y Mayoristas que ya existen siguen funcionando igual. Cierra la ventana de PowerShell al terminar para borrar las variables. En la app, inicia sesión con ese usuario: entra directo a «Comerciantes».

## 5. Comprobación

1. Abre `https://manay-api-xxxx.onrender.com/api/v1/health/ready` en el navegador: debe responder `200`. La primera vez tras un rato de inactividad tarda cerca de un minuto (el plan gratuito duerme el servicio).
2. Genera la APK con `EXPO_PUBLIC_API_URL=https://manay-api-xxxx.onrender.com/api/v1` e inicia sesión desde la tablet con datos móviles.

## Plan gratuito: qué esperar

| Servicio | Límite | Efecto |
| --- | --- | --- |
| Render | Duerme tras 15 minutos sin tráfico | La primera petición tarda ~1 minuto; la cola de la tablet reintenta |
| Supabase | Pausa el proyecto tras 7 días sin uso | Se reactiva con **Restore** en su panel |
| Supabase | Pocas conexiones en el pooler de sesión | `DATABASE_POOL_SIZE=5` en `render.yaml` |
