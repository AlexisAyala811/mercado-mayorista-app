# Operación del backend Mercado

**Fecha de verificación:** 28 de septiembre de 2026

## Inicio controlado

1. Configurar las variables documentadas en `mercado-api/.env.example` mediante el gestor de secretos del entorno.
2. Comprobar conectividad con PostgreSQL 17 y TLS cuando la conexión sale de una red privada controlada.
3. Ejecutar `npm run migration:run:prod` antes de iniciar una nueva versión del API.
4. Iniciar `node dist/main` y comprobar `/api/v1/health/live` y `/api/v1/health/ready`.
5. Mantener `OPENAPI_ENABLED=false` si el contrato no debe publicarse en el entorno desplegado.

## Respaldo

El operador establece las variables `DATABASE_*` y ejecuta:

```powershell
./mercado-api/scripts/backup-postgres.ps1 -OutputDirectory D:/respaldos/mercado
```

El resultado incluye un `.dump` custom y un `.json` con SHA-256, tamaño, origen y versión de `pg_dump`. Ambos archivos deben conservarse juntos. La frecuencia y retención operativa deben fijarse según los objetivos de recuperación del entorno; este proyecto no inventa un RPO o RTO no aprobado.

## Simulacro de restauración

Restaurar primero en una base nueva y aislada:

```powershell
./mercado-api/scripts/restore-postgres.ps1 `
  -ArchivePath D:/respaldos/mercado/archivo.dump `
  -TargetDatabase mercado_restore `
  -ConfirmTargetDatabase mercado_restore `
  -CreateDatabase
```

El script valida el hash disponible, exige confirmación exacta del nombre y rechaza bases con tablas. Después de restaurar se deben comprobar migraciones, salud, conteos de auditoría y un recorrido de lectura autorizado antes de considerar recuperado el servicio.

## Evidencia automatizada

`mercado-api/scripts/test-postgres-portable.ps1` crea una base efímera, ejecuta las 19 migraciones y 28 pruebas E2E, genera un respaldo, lo restaura en otra base y comprueba migraciones y auditoría. La evidencia más reciente del 29/09/2026 está registrada en `backend-postgres-verification.md`.
