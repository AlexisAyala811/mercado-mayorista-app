# Verificación de la segunda instancia del backend

> **Spec:** [016](../../specs/016-second-instance/spec.md) · **Fecha:** 17 de noviembre de 2026 · **Atributos:** [AC01 y AC06](../01-analisis-de-sistema/04-atributos-de-calidad.md)

Con una segunda instancia, la API atendió 1019 solicitudes por segundo frente a 553 con una sola (1,84 veces más), con el p95 de 102 ms a 68 ms. AC06 queda demostrado en este equipo.

## Capacidad máxima, sin pausas

Cuarenta usuarios virtuales enviando consultas sin descanso durante un minuto, sobre la base con volumen de la spec 014.

| Medida | Una instancia | Dos instancias |
| --- | --- | --- |
| Solicitudes | 60 964 | 112 274 |
| Solicitudes por segundo | 553,4 | 1019,0 |
| Duración mediana | 58 ms | 24 ms |
| Duración p95 | 102 ms | 68 ms |
| Duración máxima | 186 ms | 192 ms |
| Fallidas | 0,00 % | 0,00 % |

El balanceador repartió exactamente la mitad a cada instancia: 56 137 y 56 137 solicitudes.

## Carga realista, con pausas

Cuarenta usuarios con pausas de 2 a 4 segundos entre consultas.

| Medida | Una instancia | Dos instancias |
| --- | --- | --- |
| Solicitudes por segundo | 69,6 | 70,2 |
| Duración p95 | 22 ms | 21 ms |
| Fallidas | 0,00 % | 0,00 % |

Con pausas realistas una instancia no se satura, así que la segunda no cambia los tiempos: hoy 40 usuarios caben de sobra en una instancia. La segunda instancia importa cuando la carga se acerca a la capacidad máxima.

Datos completos en `backend/test/load/resultados/2026-11-17-ac06-*.json`.

## Entorno

| Elemento | Valor |
| --- | --- |
| Equipo | Intel Core i7-14650HX, 24 hilos, 16 GB, conectado a la corriente |
| API | Dos procesos NestJS (puertos 3101 y 3102) detrás de `balanceador.mjs` (puerto 3100), `TRUST_PROXY=loopback` |
| Base | PostgreSQL 17 portable, base con 24 012 recepciones y 184 092 sacos |
| Herramienta | k6 2.4.0, `backend/test/load/consultas.k6.js` con `PAUSA=0` y con la pausa normal |

## Qué no demuestra

- **Un solo equipo.** Las dos instancias, la base y k6 compartieron CPU; en servidores separados la mejora puede ser mayor o menor.
- **Balanceador de prueba.** Es un script de medición, no el de producción.
- **Estado por instancia.** El límite de solicitudes y el caché de catálogos no se comparten entre instancias (spec 016, T1604).
- **Solo lecturas.**
