# Catálogos de calidad y procedencia — 14 de octubre de 2026

CL-13 y RF04: `propuesta-calidad-procedencia-2026-10-14.md` conserva la respuesta «eso esta bien» y la interpretación comunicada al usuario. El plan transversal `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md` define contratos, alcance y secuencia completa. Especificaciones 002/003/004/006/007 y fuente RF04 en `build_propuesta.py` reconciliadas; regeneración y QA del DOCX académico todavía pendientes.

## Implementación de este corte

- Entidad comercial independiente por negocio y dimensión quality/origin. Migración 024 aditiva registrada, sin catálogos precargados ni relleno histórico. Nombres activos únicos sin distinguir mayúsculas por negocio/dimensión; desactivación conserva la fila. Down rechaza filas conservadas.
- Ocho rutas de catálogo: consulta paginada de calidades/procedencias, creación, renombrado y desactivación. Guards de sesión y rol en el controlador; mutaciones solo Mayorista. Servicio limita lecturas/escrituras por negocio y dimensión, actualiza y audita en la misma transacción. Reutiliza validación de nombre 1–120 y UUID de los patrones existentes. «No informada» es ausencia de dato, no una fila que se pueda crear en estas listas.
- Datos maestros incorpora ambas pestañas con formulario de Nombre, listas completas paginadas por servicio, selección accesible, carga/vacío/error/reintento y confirmación nominal de desactivación. Campos/pestañas/acciones bloqueados durante escritura y protección contra doble envío. Workspace reiniciado por token y resultados tardíos ignorados después de salir. Guardado central confirmado se conserva aunque falle la recarga; reintentar solo consulta.
- `loadCatalogs` mantiene su contrato anterior de tres listas para Reportes. `loadMasterCatalogs` incorpora las dos nuevas para administración. La primera comprobación de tipos detectó la dependencia de Reportes; se separaron estas funciones en vez de alterar su contrato sin necesidad.

## Evidencia ejecutada

- Frontend: tipos/lint y **459 pruebas / 67 suites** aprobados. Enfocadas de catálogos: 30 pruebas / 4 suites. Casos nuevos: carga de la referencia 101 de ambas dimensiones, cuerpo con nombre sin teléfono, confirmación conservada ante error de lectura, reintento sin otra escritura, desactivación nominal/doble envío, error sin falso vacío y rechazo tardío de sesión anterior.
- Backend: tipos/lint/compilación y **190 pruebas / 53 archivos** aprobados; 10 pruebas nuevas del servicio. La primera suite completa falló por lista esperada de 23 migraciones; se agregó explícitamente la 024 al contrato de registro. No se ocultó la prueba fallida.
- PostgreSQL real: `mercado-api/test/commercial-characteristics.pg.mjs`, base QA cuyo nombre se exige por regex, esquema único creado dentro de transacción y rollback raíz completo. Entidad y servicio TypeORM reales; adaptador transaccional del mismo QueryRunner con savepoints, no una simulación de SQL. Migraciones reales 004/024, negocio/actor ficticios acotados, ninguna operación comercial.
- Comprobados: nombres únicos por negocio/dimensión, nombres iguales entre dimensiones/negocios, 404 por ID ajeno o dimensión incorrecta, renombrado, desactivación con fila conservada/nombre reutilizable, rollback del registro ante auditoría fallida, seis eventos esperados y rechazo de down con datos. Tras rollback, pg_namespace confirmó ausencia del esquema creado. Evidencia `tmp/commercial-characteristics-pg-20261014.json`, 2026-10-14T14:41:04Z.
- Export web aislado de 20 rutas completado en `tmp/web-export-characteristics-20261014`, entry `entry-ca75313d7423426fc0c40f150ce46143.js`. No se sustituyó dist ni se reinició la API que ya estaba sirviendo QA.
- SHA-256 del entry `B1B031EDD306C23F337BC7410E82DED527DE0A3645C82CFDC5E168EC3879BB65`. Verificador PDF 6.4.299 aprobado con 200 archivos por raíz y hashes iguales a la dependencia instalada, 2026-10-14T14:45:07Z.

## Límites

Migración 024 **no aplicada a la base UI compartida**; prueba PostgreSQL terminó en rollback. Backend compilado no equivale a API reiniciada con rutas nuevas. El export aislado tampoco es la aplicación servida. Falta recorrido HTTP/UI real de roles, Android, lector de pantalla y Figma; el conector volvió a responder límite Starter al consultar User 1:12 el 14 de octubre, sin repetir llamadas después del rechazo.

Este corte solo administra listas. **No está implementada todavía la captura de características por saco/línea**, su conservación en hechos/cola antigua, herencia de devoluciones, detalle/PDF ni filtros analíticos de calidad/procedencia. No cerrar RF04/T707 ni declarar concluido el frontend. Mantener predicciones por variedad y ausencia de inventario. Siguiente corte: captura y persistencia histórica con migración aditiva y compatibilidad offline, seguido de consultas y comprobantes.
