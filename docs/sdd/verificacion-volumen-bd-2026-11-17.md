# Verificación de la base de datos con volumen

> **Spec:** [014](../../specs/014-database-volume/spec.md) · **Fecha:** 17 de noviembre de 2026 · **Atributo:** [AC01](../01-analisis-de-sistema/04-atributos-de-calidad.md)

Con dos años de operaciones la API siguió cumpliendo AC01, pero el historial de compras se volvió lento. Tras corregirlo, el p95 de k6 con 20 usuarios bajó de 330 ms a 41 ms.

## Volumen sembrado

| Tabla | Filas |
| --- | --- |
| Recepciones | 24 012 |
| Sacos | 184 092 |
| Liquidaciones de compra | 10 005 |
| Ventas | 6003 |
| Cuentas | 8004 |
| Tamaño de la base | 113 MB |

Las fechas van del 11 de noviembre de 2024 al 16 de noviembre de 2026.

## Carga con k6

| Medida | Antes del arreglo, 20 usuarios | Después, 20 usuarios | Después, 40 usuarios |
| --- | --- | --- | --- |
| Solicitudes | 3578 | 3837 | 7666 |
| Duración mediana | 15 ms | 23 ms | 24 ms |
| Duración p95 | 330 ms | 41 ms | 45 ms |
| Duración máxima | 505 ms | 475 ms | 297 ms |
| Fallidas | 0,00 % | 0,00 % | 0,00 % |

Datos completos: [antes](../../backend/test/load/resultados/2026-11-17-volumen-antes.json), [después con 20](../../backend/test/load/resultados/2026-11-17-volumen-despues-20-usuarios.json) y [después con 40](../../backend/test/load/resultados/2026-11-17-volumen-despues-40-usuarios.json). Como referencia, con la base pequeña el p95 era de 16 ms ([spec 012](verificacion-carga-k6-2026-11-16.md)).

## Hallazgo 1: historial de compras

| Periodo | Antes | Después |
| --- | --- | --- |
| Mes | 327 ms | 23 ms |
| Año | 390 ms | 61 ms |

Mediana de siete llamadas a `/purchases/history`. La consulta sumaba los 184 092 sacos del negocio antes de elegir las 20 filas de la página; ahora suma solo los de esas 20 recepciones.

## Hallazgo 2: índice de liquidaciones por fecha

Las ventas tenían un índice por negocio y fecha; las liquidaciones de compra no, así que cada reporte de compras recorría la tabla entera.

| Consulta del mes, 10 005 liquidaciones | Plan | Tiempo en la base |
| --- | --- | --- |
| Sin índice | Recorrido completo, 9879 filas descartadas | 11,4 ms |
| Con `ix_purchase_settlements_business_time` | Índice | 0,12 ms |

Medido con `EXPLAIN ANALYZE`. La diferencia crece con el número de liquidaciones.

## Pruebas

- 336 pruebas unitarias del backend, tipos, lint y build en verde.
- En PostgreSQL: `migrations.e2e-spec.ts` (23 pruebas) y `stitch-history.e2e-spec.ts` (4 pruebas) en verde.

## Qué no demuestra

- **Datos repetidos.** El volumen se obtuvo copiando las mismas operaciones; los datos reales tendrán más proveedores, variedades y montos distintos.
- **Equipo de desarrollo.** k6, la API y PostgreSQL corrieron en la misma máquina.
- **Medición posterior al índice no comparable.** Una corrida de k6 tras aplicar la migración dio p95 de 36 ms, pero se hizo con la laptop a batería y en plan de energía equilibrado: todas las consultas, incluso las que no usan el índice, tardaron el doble. Por eso el efecto del índice se documenta con `EXPLAIN ANALYZE` y no con k6.
- **Cuentas sin medir** y reportes por año todavía en cientos de milisegundos.
