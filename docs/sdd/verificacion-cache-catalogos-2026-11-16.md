# Verificación del caché de catálogos

> **Spec:** [013](../../specs/013-catalog-cache/spec.md) · **Fecha:** 16 de noviembre de 2026

Con el caché encendido, las lecturas de catálogos respondieron en 12,3 ms de promedio frente a 43,1 ms sin él, y un cambio en un catálogo se vio en la lectura siguiente.

## Medición con k6

Veinte usuarios durante un minuto leyendo proveedores, variedades y compradores.

| Medida | Con caché (60 s) | Sin caché (0 s) |
| --- | --- | --- |
| Solicitudes | 17 566 | 12 628 |
| Solicitudes por segundo | 217,7 | 157,0 |
| Duración promedio | 12,34 ms | 43,12 ms |
| Duración mediana | 8,79 ms | 46,01 ms |
| Duración p95 | 34,12 ms | 79,00 ms |
| Solicitudes fallidas | 0,00 % | 0,00 % |

Datos completos: [con caché](../../backend/test/load/resultados/2026-11-16-catalogos-con-cache.json) y [sin caché](../../backend/test/load/resultados/2026-11-16-catalogos-sin-cache.json). Script: [`backend/test/load/catalogos.k6.js`](../../backend/test/load/catalogos.k6.js).

Con caché cada solicitud sigue tardando unos milisegundos porque la API valida la sesión en la base de datos en cada llamada. Esa consulta no se guarda a propósito: una sesión revocada debe dejar de servir de inmediato.

## Invalidación en la API real

Con la API encendida y el caché en 60 segundos:

| Paso | Total de proveedores |
| --- | --- |
| Antes | 3 |
| Tras crear un proveedor | 4 |
| Tras desactivarlo | 3 |

La lectura posterior a cada cambio ya lo reflejaba, sin esperar los 60 segundos. El proveedor de prueba quedó desactivado en la base de simulación.

## Pruebas automáticas

346 pruebas unitarias del backend en verde, entre ellas cinco del caché, cuatro del servicio con caché y una del esquema de entorno.

## Qué no demuestra

- **Una sola instancia.** No se probó el retraso de hasta 60 segundos entre dos instancias.
- **Equipo de desarrollo.** k6, la API y PostgreSQL corrieron en la misma máquina, con una base pequeña.
- **Sin prueba e2e nueva en PostgreSQL** dentro de la suite: la comprobación contra la API fue manual, con un script.
