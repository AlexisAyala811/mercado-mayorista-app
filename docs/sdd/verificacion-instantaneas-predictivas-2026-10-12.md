# Instantáneas históricas predictivas — 12 de octubre de 2026

## Implementación contra el plan

Continuación de T709/T710 según `predictive-engine-plan.md`. El lector central reconstruye ventas de una variedad y negocio dentro de semanas completas. Su corte es exclusivo: lunes a las 00:00 en America/Lima. Incluye ventas creadas antes del corte, conserva ventas anuladas posteriormente y aplica solamente devoluciones comerciales anteriores a ese límite. Orden estable por semana, operación y línea; referencias de devoluciones ordenadas.

Se generan ocho instantáneas de entrenamiento de 18 a 25 semanas, ocho instantáneas de valor real al cierre de cada objetivo y una final de 26 semanas. Cada una conserva ventana, corte, negocio, variedad, zona horaria, observaciones retenidas, puntos agregados y exclusiones. Las entradas alimentan el motor ya probado, sin reutilizar los datos descriptivos vigentes. Ausencia de valor real no se sustituye por cero ni por una estimación.

El llamador debe aportar una conexión transaccional coherente. En este corte los lectores son internos; todavía no existe endpoint ni publicación. La conservación inmutable de largo plazo sigue requiriendo la migración y el repositorio de versiones.

## Evidencia

Tipos, lint y compilación aprobaron. El conjunto analítico aprobó 24 pruebas en siete archivos. Las nuevas pruebas comprueban los 17 cortes, prefijos crecientes, ausencia de valor real y rechazo de ventanas incompletas o fechas inválidas.

`mercado-api/test/historical-prediction-snapshots.mjs` ejecutó el servicio compilado sobre PostgreSQL real, dentro de la base UI aislada, con tablas temporales y transacción REPEATABLE READ. Creó únicamente hechos sintéticos temporales de 26 semanas, seis ventas por semana, y verificó:

- Una venta anulada exactamente a las 00:00 de Lima del lunes objetivo permanece en el entrenamiento anterior y sale del siguiente.
- Una devolución un segundo antes del límite se incorpora al primer entrenamiento; devoluciones exactamente en el límite y una hora después solo aparecen en el siguiente. El peso retenido de la semana pasa de 59.000 a 57.000 kg, con las referencias correctas.
- Ocho comparaciones calculadas por el motor, conservando publicación no disponible.
- Consultar otro negocio o variedad no devuelve puntos.
- Añadir una devolución posterior al último corte no cambia ninguna de las 17 instantáneas reconstruidas: comparación completa de entradas antes/después, no solo del precio final.

La transacción terminó con rollback, sin escrituras comerciales persistentes y sin estimaciones publicadas. Evidencia guardada en `tmp/historical-prediction-snapshots-2026-10-12.json`.

## Pendientes

Integrar la lectura transaccional en el servicio de evaluación autorizado, persistir entradas/evaluaciones/versiones inmutables con conservación mínima de cinco años y añadir revisión/revalidación del Mayorista, API y frontend DS-045. La prueba temporal no demuestra precisión con historial real ni completa el módulo analítico o el frontend general.
