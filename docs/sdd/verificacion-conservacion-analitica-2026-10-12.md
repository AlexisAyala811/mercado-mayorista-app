# Conservación de evaluaciones analíticas — 12 de octubre de 2026

## Implementación

Parte de T703/T709/T710, conforme al contrato de conservación de 007. Migración 021 registrada después de las veinte existentes; sincronización de esquema sigue deshabilitada. Tabla nueva de versiones por UUID, negocio, variedad, corte, petición, algoritmo, creador, fechas, huella canónica SHA-256 y evidencia reproducible JSON. No modifica tablas comerciales ni migraciones previas.

Retención mínima de cinco años comprobada por constraint. Triggers rechazan UPDATE, DELETE y TRUNCATE. La reversión de migración solo procede cuando la tabla está vacía; rechaza borrar versiones conservadas. El repositorio recibe un EntityManager transaccional para almacenar evaluación y auditoría en la misma transacción; todavía no existe servicio público que complete reconstrucción, reintentos concurrentes y guardado. Las consultas de versiones incluyen negocio y no recalculan evidencia.

Un UUID de petición repetido devuelve la versión original si corte y variedad coinciden, sin repetir auditoría. Cambiar los filtros con ese UUID produce conflicto. Otra petición genera otra versión. La huella ordena claves de objetos de forma canónica, conserva el orden de arrays y puede comprobarse después de leer JSONB; no depende del orden de claves que devuelva PostgreSQL.

## Verificación real

Tipos, lint y compilación aprobaron. Analítica y registro de migraciones aprobaron 25 pruebas en ocho archivos. Se consultó la documentación de transacciones/EntityManager de TypeORM 1.1.1 mediante Context7 y se contrastó QueryRunner con su firma instalada.

`mercado-api/test/analytics-evaluation-store.mjs` ejecutó la migración y el repositorio sobre PostgreSQL real, con esquema aislado dentro de la base UI de pruebas y transacción REPEATABLE READ que terminó con rollback. El esquema contiene únicamente fixtures mínimos para claves foráneas, sin credenciales, roles ni delegaciones; no crea actores persistentes ni acceso al sistema.

Verificó reversión de migración vacía, rechazo de reversión con evidencia, conservación completa de entradas/métricas, misma versión al reintentar, versión distinta con otra petición, una auditoría por versión, conflicto por reutilización con otro corte, aislamiento del negocio, rechazo de UPDATE/DELETE/TRUNCATE, rechazo de cuatro años de retención, huella estable después de lectura JSONB y rollback de la evaluación cuando falla auditoría. Las entradas de esta prueba son sintéticas: reconstrucción histórica SQL se probó por separado en `verificacion-instantaneas-predictivas-2026-10-12.md`.

Resultado: `tmp/analytics-evaluation-store-2026-10-12.json`. No se aplicó aún esta migración al esquema público de la base UI, no se publicaron estimaciones y no quedaron escrituras comerciales persistentes.

## Pendientes

Servicio autorizado de evaluación/reintento concurrente, aplicación de la migración en el entorno de integración, revisión/revalidación del Mayorista, publicación y evaluaciones posteriores vinculadas, contratos HTTP y frontend DS-045. La protección y conservación operativas en producción requieren verificación con el despliegue de CL-10; una prueba local no acredita cifrado, backups o retención efectiva durante cinco años. El objetivo general permanece abierto.
