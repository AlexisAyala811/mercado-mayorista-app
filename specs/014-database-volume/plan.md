# Plan 014: Escalabilidad de la base de datos con volumen

**Especificación:** [spec 014](spec.md) · **Fecha:** 17 de noviembre de 2026

1. Clonar la base de simulación a una desechable (`createdb -T`) y multiplicar sus operaciones con `sembrar-volumen.mjs`: nuevos identificadores, referencias internas coherentes y fechas repartidas en dos años.
2. Medir cada consulta de lectura por mes y por año, y correr k6.
3. Leer el plan de las consultas lentas con `EXPLAIN ANALYZE` y corregir la consulta o añadir el índice que falte.
4. Repetir las mediciones y documentarlas.

## Cómo sembrar

```bash
DATABASE_NAME=mercado_test_carga_x DATABASE_USER=... DATABASE_PASSWORD=... DATABASE_PORT=55437 COPIES=2000 node backend/test/load/sembrar-volumen.mjs
```

La base debe existir y tener las migraciones. Las credenciales no se escriben en el repositorio.
