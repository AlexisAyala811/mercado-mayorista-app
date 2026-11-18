# Especificación 014: Escalabilidad de la base de datos con volumen

**Estado:** aprobada por el usuario el 17 de noviembre de 2026 · **Fecha:** 17 de noviembre de 2026
**Origen:** rúbrica del curso (criterio 9, «Escalabilidad de Base de datos») y la tarea [T1206](../012-load-testing/tasks.md) de la spec 012

## Objetivo

Comprobar que la base de datos sigue respondiendo bien cuando el negocio acumula dos años de operaciones, y corregir las consultas que no escalen.

## Alcance

| Elemento | Regla |
| --- | --- |
| Volumen | La base de simulación multiplicada por 2000: 24 012 recepciones, 184 092 sacos, 6003 ventas y 8004 cuentas, en dos años |
| Siembra | `backend/test/load/sembrar-volumen.mjs`, solo en bases cuyo nombre contenga «test» o «carga» |
| Medición | Tiempo de cada consulta de lectura por mes y por año, y k6 con 20 y 40 usuarios |
| Análisis | `EXPLAIN ANALYZE` de las consultas lentas y de los índices que usan |

## Cambios

1. **Historial de compras.** Agrupaba todos los sacos del negocio en cada consulta, aunque la pantalla muestre 20 filas. Ahora suma los sacos solo de las recepciones de la página pedida. El resultado es el mismo: lo comprueba la prueba e2e del historial.
2. **Índice por fecha en las liquidaciones de compra.** Migración 030: `ix_purchase_settlements_business_time` sobre `(business_id, created_at DESC)`, igual al que ya tenían las ventas. Solo añade un índice; no toca datos.

## Fuera de alcance

- Particionar tablas, réplicas de lectura o `pgbouncer`: con este volumen no hacen falta.
- Los reportes por año, que siguen en cientos de milisegundos: dentro de AC01, y su costo es sumar los sacos de miles de liquidaciones.
- Las cuentas: el script de tiempos las llamó con parámetros que la API no acepta y quedaron sin medir.

## Criterios de aceptación

1. Con volumen, el p95 de k6 con 20 usuarios sigue por debajo de 3 segundos.
2. El historial de compras devuelve lo mismo que antes del cambio.
3. La migración pasa en la prueba de migraciones y es reversible.
