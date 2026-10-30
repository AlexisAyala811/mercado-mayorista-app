# Consulta posterior conectada a API y frontend — 12 de octubre de 2026

## Corte de T710

GET de resultado posterior exclusivo del Mayorista y delimitado por negocio. Lee la publicación conservada y, para una semana cerrada, las ventas/compensaciones de su variedad/periodo dentro de REPEATABLE READ y con corte timestamp. Una semana en curso devuelve estado sin precio real ni error, sin consultar cantidades parciales como si fueran definitivas. Las referencias y exclusiones acompañan el resultado calculado. Esta consulta todavía no guarda una versión posterior inmutable.

El panel se integra en el detalle del historial publicado con consulta explícita, carga/error/reintento, ausencia de real diferenciada de precio real cero y muestra identificada por ventas/peso. Indica corte comercial de consulta y separa error de una publicación del MAE del piloto. No modifica el pronóstico original.

## Verificación

- Frontend: tipos/lint aprobados; 31 pruebas analíticas en ocho suites. El panel comprueba semana en curso sin precio inventado y reintento que muestra un cero realmente observado con error y cobertura.
- Backend: tipos/lint/compilación aprobados; 38 pruebas analíticas en diez archivos.
- PostgreSQL/HTTP aislados: el ensayo concurrente volvió a probar fuentes, publicaciones e inmutabilidad y ahora consulta el resultado posterior. El estado actual fue semana en curso; una subclase de prueba simula fecha posterior al domingo mediante el método protegido de tiempo del servicio, sin cambiar reloj del equipo ni la aplicación de integración. Sin ventas devolvió ausencia de real; con una venta sintética de 10 kg e importe cero devolvió precio real 0.0000, error 3.0000 y una venta válida. Se comprobó que la publicación original siguió idéntica. El controlador HTTP devolvió 200 para la consulta en curso con real null.

Evidencia: `tmp/analytics-evaluation-race-2026-10-12.json`. El esquema desechable y servidor se retiraron; no hubo publicaciones ni cambios comerciales públicos. Siguen aplicando las limitaciones de adaptador pg y sesión de prueba de los ensayos anteriores.

## Pendientes

Persistir comparaciones posteriores como versiones vinculadas con auditoría/retención; recuperar su historial y cubrir cambios posteriores de compensaciones. La consulta actual no sustituye esa conservación. Reconciliación de disponibilidad, recorrido visual/nativo y Figma/TalkBack continúan pendientes. No se declara T710 ni el objetivo general completos.
