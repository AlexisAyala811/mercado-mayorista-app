# Decisión 002: plataforma de backend y base central

**Estado:** aprobada  
**Fecha:** 24 de septiembre de 2026

## Decisión

El backend se implementa como monolito modular con NestJS 12, TypeScript estricto, API REST versionada y PostgreSQL 17 como base transaccional central. La integración con PostgreSQL usa TypeORM con migraciones explícitas y `synchronize: false`.

## Justificación

- Mantiene TypeScript en aplicación y servidor sin mezclar responsabilidades.
- NestJS proporciona módulos, inyección de dependencias, validación y pruebas apropiadas para separar identidad, recepción, inventario, cuentas, auditoría y reportes.
- PostgreSQL ofrece transacciones, restricciones, índices y concurrencia para inventario, saldos y auditoría.
- El monolito modular reduce complejidad operativa inicial y conserva límites que pueden evolucionar sin convertir cada módulo en un servicio independiente.
- Las rutas se versionan bajo `/api/v1`; la tablet nunca accede directamente a PostgreSQL.

## Reglas derivadas

1. La API es la autoridad final para autenticación, autorización por negocio y efectos centrales.
2. Los cambios de esquema se realizan mediante migraciones revisables; no se habilita sincronización automática de TypeORM.
3. Configuración y secretos entran por variables de entorno validadas y no se guardan en el repositorio.
4. `/api/v1/health/live` informa vida del proceso y `/api/v1/health/ready` comprueba PostgreSQL.
5. Cada módulo conserva capas de aplicación, dominio e infraestructura según su complejidad.
6. La selección no resuelve por sí sola CL-04 a CL-10 ni autoriza inventar reglas comerciales pendientes.

## Evidencia

- Proyecto `mercado-api` generado con NestJS 12, ESM, TypeScript estricto y Vitest.
- Configuración PostgreSQL mediante `@nestjs/typeorm`, `typeorm` y `pg`.
- Validación del entorno con `@nestjs/config` y Joi.
- Health checks con `@nestjs/terminus`.
- `npm run check` ejecuta lint, pruebas y compilación.
- Auditoría npm inicial: cero vulnerabilidades después de retirar `@nestjs/mau`, herramienta opcional no utilizada.
- Dockerfile multi etapa y Compose reproducible con PostgreSQL saludable, migraciones obligatorias antes de iniciar el API y ejecución sin privilegios.
- Conexión PostgreSQL configurable para TLS con validación de certificado, límite de pool, tiempo de conexión y registro de consultas lentas.
