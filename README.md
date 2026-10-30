# Mercado API

Backend central del sistema de gestión comercial de papa. Usa NestJS 12, TypeScript estricto, PostgreSQL 17, TypeORM y Vitest.

## Configuración local

1. Copiar `.env.example` como `.env` y reemplazar la contraseña de desarrollo.
2. Iniciar PostgreSQL con `docker compose up -d postgres`.
3. Ejecutar `npm run migration:run`.
4. Configurar temporalmente las variables `BOOTSTRAP_*` y ejecutar una sola vez `npm run bootstrap:wholesaler`.
5. Retirar las variables `BOOTSTRAP_*` y ejecutar `npm run start:dev`.

La máquina de desarrollo necesita Docker Desktop o una instalación PostgreSQL 17 compatible. Para pruebas en Windows se preparó PostgreSQL portátil 17.11 en `.local/postgres17/pgsql`, excluido del repositorio. Desde PowerShell 7, `./scripts/test-postgres-portable.ps1` crea una base exclusiva por ejecución, ejecuta las migraciones y la suite E2E, conserva la evidencia y detiene el servidor. Requiere acceso al perfil de Windows para DPAPI. No instala servicios y solo escucha en `127.0.0.1:55437`.

## Ejecución en contenedores

Con `DATABASE_PASSWORD` definido en `.env`, `docker compose up --build` crea PostgreSQL, espera su estado saludable, ejecuta todas las migraciones una sola vez y arranca el API únicamente si finalizaron correctamente. El contenedor del API corre como usuario sin privilegios y expone el puerto configurado por `PORT`.

La conexión admite `DATABASE_POOL_SIZE`, `DATABASE_CONNECT_TIMEOUT_MS`, `DATABASE_SSL` y `DATABASE_SSL_REJECT_UNAUTHORIZED`. `EVIDENCE_RETENTION_YEARS` configura la retención de auditoría y comprobantes con un mínimo validado de cinco años. El Compose local desactiva TLS dentro de su red privada; un servicio PostgreSQL externo debe habilitarlo y conservar la validación del certificado.

Para revisar migraciones desde el entorno local se dispone de `npm run migration:show`. Los comandos `migration:run`, `migration:revert` y `bootstrap:wholesaler` apuntan al árbol compilado real en `dist/database`.

La API se publica bajo `/api/v1`:

- `GET /api/v1/health/live`: proceso disponible.
- `GET /api/v1/health/ready`: conexión PostgreSQL disponible.
- `GET /api/v1/docs`: explorador OpenAPI configurable mediante `OPENAPI_ENABLED`.
- `GET /api/v1/openapi.json`: contrato OpenAPI JSON para clientes y pruebas.
- `POST /api/v1/auth/sessions`: crear sesión.
- `GET /api/v1/auth/session`: consultar la sesión protegida.
- `DELETE /api/v1/auth/session`: revocar la sesión actual.
- `GET|POST|PATCH|DELETE /api/v1/catalog/providers`: catálogo de proveedores según operación permitida.
- `GET|POST|PATCH|DELETE /api/v1/catalog/buyers`: catálogo de compradores y destino habitual.
- `GET|POST|PATCH|DELETE /api/v1/catalog/varieties`: catálogo de variedades según operación permitida.
- `GET|POST|PATCH|DELETE /api/v1/logistics/carriers`: transportistas.
- `GET|POST|PATCH|DELETE /api/v1/logistics/vehicles`: vehículos.
- `/api/v1/identity/assistants` y `/api/v1/identity/delegations`: administración de Encargados y reemplazos de hasta 24 horas.
- `/api/v1/receptions`: recepción, captura/corrección/retiro de sacos, cierre versionado y consulta.
- `/api/v1/purchases/receptions/:receptionId/settlement`: liquidación idempotente de compra, flete, caja o cuenta por pagar.
- `/api/v1/inventory/lots`: lotes, movimientos, correcciones, mermas y devoluciones trazables.
- `/api/v1/sales`: venta y despacho, crédito, descuento de stock, anulación compensatoria y devolución comercial idempotente con cuenta o caja.
- `/api/v1/accounts`: cuentas por pagar/cobrar, vencimientos, abonos, cobros y reversos.
- `/api/v1/stowage`: grupos, registros y liquidaciones de carga o descarga.
- `/api/v1/freight`: costos derivados de compras o ventas y liquidaciones idempotentes a transportistas.
- `GET /api/v1/operations/:clientOperationId?type=...`: recuperación de una confirmación tras una respuesta perdida.
- `/api/v1/audit`: consulta de auditoría del negocio para el Mayorista.
- `/api/v1/reports`: resumen comercial, margen comercial estimado, cuentas vencidas, alertas parametrizadas y evolución de precios.
- `/api/v1/receipts/purchases/:id.pdf`, `/api/v1/receipts/sales/:id.pdf` y `/api/v1/receipts/sale-returns/:id.pdf`: comprobantes PDF internos versionados.

Las órdenes comerciales usan un UUID `clientOperationId`. Las mutaciones sobre recepción, venta, inventario o cuenta exigen la versión central conocida; una versión obsoleta devuelve `409` con `code` y `currentVersion`. Los PDF se persisten con SHA-256, versión de la operación, invalidación y retención mínima de cinco años.

La migración 18 alinea la unicidad de caja con CL-04: negocio, categoría de efecto y UUID. La migración 19 agrega valoración por lote, costo fijado por línea y devoluciones comerciales sin modificar los hechos originales.

## Respaldo y restauración

`scripts/backup-postgres.ps1` crea un archivo PostgreSQL custom mediante `pg_dump`, sin propietarios ni privilegios del entorno de origen. Genera al lado un JSON con nombre de base, versión de `pg_dump`, tamaño y SHA-256; nunca escribe la contraseña. Usa las variables `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME`.

```powershell
./scripts/backup-postgres.ps1 -OutputDirectory D:/respaldos/mercado
```

`scripts/restore-postgres.ps1` valida el hash cuando existe el JSON, exige repetir exactamente el nombre destino, rechaza por defecto nombres que no contengan `test` o `restore`, y solo restaura sobre una base vacía. `-AllowProductionTarget` habilita deliberadamente otro nombre, pero no omite la comprobación de base vacía.

```powershell
./scripts/restore-postgres.ps1 `
  -ArchivePath D:/respaldos/mercado/mercado-AAAAMMDDTHHMMSSZ.dump `
  -TargetDatabase mercado_restore `
  -ConfirmTargetDatabase mercado_restore `
  -CreateDatabase
```

El ejecutor portátil realiza un simulacro completo después de las pruebas E2E: respalda la base efímera, restaura en otra base nueva y comprueba las 19 migraciones y los eventos de auditoría.

## Respaldo y restauración

`scripts/backup-postgres.ps1` crea un archivo PostgreSQL custom mediante `pg_dump`, sin propietarios ni privilegios del entorno de origen. Genera al lado un JSON con nombre de base, versión de `pg_dump`, tamaño y SHA-256; nunca escribe la contraseña. Usa las variables `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD` y `DATABASE_NAME`.

```powershell
./scripts/backup-postgres.ps1 -OutputDirectory D:/respaldos/mercado
```

`scripts/restore-postgres.ps1` valida el hash cuando existe el JSON, exige repetir exactamente el nombre destino, rechaza por defecto nombres que no contengan `test` o `restore`, y solo restaura sobre una base vacía. `-AllowProductionTarget` habilita deliberadamente otro nombre, pero no omite la comprobación de base vacía.

```powershell
./scripts/restore-postgres.ps1 `
  -ArchivePath D:/respaldos/mercado/mercado-AAAAMMDDTHHMMSSZ.dump `
  -TargetDatabase mercado_restore `
  -ConfirmTargetDatabase mercado_restore `
  -CreateDatabase
```

El ejecutor portátil realiza un simulacro completo después de las pruebas E2E: respalda la base efímera, restaura en otra base nueva y comprueba las 19 migraciones y los eventos de auditoría.

Los filtros de fecha de reportes (`from`, `to`, `asOf`, `through`) requieren fechas reales en formato `YYYY-MM-DD`, sin hora ni zona horaria. Un periodo invertido o una fecha límite de alertas anterior a `asOf` se rechaza antes de consultar datos.

El aprovisionamiento inicial se niega si ya existe cualquier usuario. No incluye credenciales predeterminadas ni imprime contraseñas.

## Verificación

La suite PostgreSQL aplica las 19 migraciones y comprueba salud, sesiones y roles HTTP, cuentas/caja, recepción, pesaje, compra, inventario, ventas al contado y crédito, devolución física y comercial, margen, concurrencia, flete, estiba y comprobantes PDF. También verifica reintentos y recuperación tras respuesta perdida sin efectos duplicados. Estos escenarios usan repositorios reales y requieren ejecutar `npm run test:e2e` contra la base exclusiva de pruebas; el resultado de `npm run check` no los acredita. Cada escenario crea identificadores únicos y conserva la evidencia en esa base efímera, sin borrar auditoría ni datos preexistentes.

```powershell
npm run check
```

El comando ejecuta `typecheck` sobre código y pruebas (incluidas E2E), lint tipado, pruebas unitarias y compilación de producción. Así se detectan errores en pruebas que la compilación de producción excluye. TypeORM mantiene `synchronize: false`; todo cambio de esquema deberá incorporarse mediante migración.

Las pruebas E2E y `npm run migration:run` requieren PostgreSQL. El comando `npm run test:e2e` exige `RUN_DATABASE_E2E=true`, `NODE_ENV=test` y un `DATABASE_NAME` que contenga `test`. Si falta una condición, termina con código distinto de cero antes de conectar, sin presentar suites omitidas como una ejecución aprobada. Esta protección se aplica a todas las suites E2E, incluida salud; no modifica el comando de migración de producción. El nombre de la base es una guarda adicional, no una verificación de su contenido: usar siempre una base efímera PostgreSQL 17 exclusiva de pruebas.
