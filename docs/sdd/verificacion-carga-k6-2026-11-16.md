# Verificación de carga con k6

> **Spec:** [012](../../specs/012-load-testing/spec.md) · **Fecha:** 16 de noviembre de 2026 · **Atributos:** [AC01 y AC06](../01-analisis-de-sistema/04-atributos-de-calidad.md)

La API cumplió AC01 en este equipo: con 20 usuarios concurrentes el 95 % de las consultas respondió en 16 ms, frente al límite de 3000 ms, sin ninguna solicitud fallida.

## Resultados

| Medida | 20 usuarios | 40 usuarios |
| --- | --- | --- |
| Solicitudes | 6763 | 13 497 |
| Solicitudes por segundo | 39,0 | 78,8 |
| Duración mediana | 6 ms | 6 ms |
| Duración promedio | 7,7 ms | 7,6 ms |
| Duración p90 | 13,3 ms | 14,2 ms |
| Duración p95 | 16 ms | 18 ms |
| Duración máxima | 336 ms | 197 ms |
| Solicitudes fallidas | 0,00 % | 0,00 % |
| Comprobaciones correctas | 6762 de 6762 | 13 496 de 13 496 |
| Umbrales de AC01 | Cumplidos | Cumplidos |

Datos completos: [20 usuarios](../../backend/test/load/resultados/2026-11-16-20-usuarios.json) y [40 usuarios](../../backend/test/load/resultados/2026-11-16-40-usuarios.json).

## Cómo se midió

| Elemento | Valor |
| --- | --- |
| Herramienta | k6 2.4.0 |
| Script | [`backend/test/load/consultas.k6.js`](../../backend/test/load/consultas.k6.js) |
| Carga | 30 s de subida, 2 min sostenidos y 20 s de bajada; pausa de 2 a 4 s por iteración |
| Consultas | Siete lecturas por iteración: resúmenes y filas de reportes, historial y totales de compras y de ventas |
| API | Una instancia de NestJS en el mismo equipo, con `THROTTLE_LIMIT=100000` |
| Base de datos | PostgreSQL 17 portable con la base de simulación |
| Equipo | Intel Core i7-14650HX, 24 hilos, 16 GB de memoria, Windows 11 |

## Qué no demuestra

- **No es el servidor de producción.** Generador de carga, API y base de datos corrieron en el mismo equipo de desarrollo, sin red de por medio.
- **Base pequeña.** La base de simulación tiene pocas operaciones (cuatro compras en el mes consultado). Con el volumen real los reportes tardarán más; falta repetir la prueba con datos sembrados.
- **Solo lecturas.** No se midieron pesajes, compras, ventas ni pagos.
- **AC06 sigue sin evidencia.** La corrida de 40 usuarios usó una sola instancia; AC06 pide añadir una segunda y eso no se probó.
- **Una sola sesión.** Todos los usuarios virtuales compartieron un token; no se midió el inicio de sesión.

## Hallazgo

Con el límite por defecto de 100 solicitudes por minuto y por dirección, esta misma prueba habría recibido respuestas `429`: 20 usuarios generan unas 2300 solicitudes por minuto desde una dirección. Las tablets de un local comparten dirección de salida, así que el límite por dirección puede frenar un uso legítimo. Queda abierto en T1205.
