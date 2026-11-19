# Verificación del Sprint 2

> **Spec:** [017](../../specs/017-sprint2-quality/spec.md) · **Fecha:** 18 de noviembre de 2026 · **Atributo:** [AC01](../01-analisis-de-sistema/04-atributos-de-calidad.md)

Con dos instancias de la API en un solo equipo, AC01 se cumple hasta 500 usuarios concurrentes y deja de cumplirse desde 1000. Las 121 operaciones están documentadas en OpenAPI, y la cobertura de líneas es del 63 % en el backend y del 85 % en la app.

## Carga progresiva hasta 2000 usuarios

Cada nivel sube en 30 s y se sostiene 1 min. Cada usuario repite cinco consultas (resumen de compras, compras por día, historial de compras, totales de ventas y proveedores) con 2 a 4 s de pausa.

| Usuarios | Solicitudes | Mediana | p95 | Fallidas | AC01 (p95 < 3 s) |
| --- | --- | --- | --- | --- | --- |
| 100 | 12 230 | 22 ms | 46 ms | 0,00 % | Cumple |
| 250 | 26 230 | 136 ms | 544 ms | 0,00 % | Cumple |
| 500 | 28 570 | 915 ms | 1647 ms | 0,00 % | Cumple |
| 1000 | 29 045 | 2033 ms | 4607 ms | 0,00 % | No cumple |
| 1500 | 28 505 | 3518 ms | 7144 ms | 0,06 % | No cumple |
| 2000 | 34 784 | 4073 ms | 9761 ms | 8,56 % | No cumple |

Desde 500 usuarios el número de solicitudes por nivel deja de crecer (unas 29 000 por minuto y medio): las dos instancias llegaron a su capacidad en este equipo y lo que sube es la espera. El balanceador repartió 79 683 solicitudes a cada instancia. Datos completos: [`2026-11-18-escalonada-2000.json`](../../backend/test/load/resultados/2026-11-18-escalonada-2000.json).

**Hallazgo.** A 2000 usuarios, 2994 solicitudes terminaron en `500`, todas tras unos 8 s de espera, en `/reports/operation-overview` y `/sales/summary`. El registro solo dice «Error», así que la causa exacta no está confirmada; lo más probable es la espera de una conexión libre en la base de datos. Una API saturada debería responder `503` para que la tablet reintente (T1704).

## Respuesta ante saturación

**Actualizado el 18 de noviembre de 2026.** La causa de los `500` quedó confirmada en el código: cuando todas las conexiones del pool están ocupadas, `pg-pool` espera `DATABASE_CONNECT_TIMEOUT_MS` (5 s por defecto) y falla con «timeout exceeded when trying to connect». Ahora la API responde `503` con `Retry-After: 5`, el código `service-saturated` y el mensaje «El servidor está ocupado. La operación se reintentará en unos segundos.», y el registro anota la causa `database-pool-saturated`.

Comprobación contra la API real con una sola conexión y 1 s de espera: de 60 lecturas pesadas lanzadas a la vez, 5 respondieron `200` y 55 `503`, todas con `Retry-After: 5`. La cola de la tablet ya trataba cualquier `5xx` como falla de red: conserva la operación y la reintenta.

## Cobertura de las pruebas

| Proyecto | Herramienta | Pruebas | Líneas | Ramas | Funciones |
| --- | --- | --- | --- | --- | --- |
| Backend | Vitest | 349 | 62,8 % | 53,0 % | 53,9 % |
| App | Jest | 752 | 85,4 % | 72,9 % | 74,1 % |

La cobertura se mide sobre todos los archivos de `src`, tengan prueba o no. En el backend no incluye las 10 pruebas de integración en PostgreSQL, que cubren la mayor parte de servicios y consultas; por eso módulos como logística (27 %), estiba (32 %), inventario (40 %) y reportes (41 %) aparecen bajos. En la app, el dominio está al 98,6 % y las pantallas al 87,2 %.

**Actualizado el 19 de noviembre de 2026.** Pruebas nuevas de logística y estiba, sobre un gestor de base de datos en memoria, cubren altas, ediciones, bajas, aislamiento por negocio, reintentos con el mismo `clientOperationId` y la liquidación de estiba con su total en céntimos y su salida de caja.

| Medida del backend | 18 de noviembre | 19 de noviembre |
| --- | --- | --- |
| Pruebas | 349 | 363 |
| Líneas | 62,8 % | 68,2 % |
| Ramas | 53,0 % | 57,8 % |
| Logística | 26,9 % | 86,1 % |
| Estiba | 31,7 % | 84,9 % |
| Reportes | 40,8 % | 40,8 % |

De la subida total, cerca de 1,5 puntos se deben a excluir el servicio de inventario retirado, que nadie llama porque el sistema no maneja inventario; el resto se debe a las pruebas nuevas. Reportes sigue bajo porque son consultas SQL, que se prueban contra PostgreSQL en las pruebas de integración.

La CI genera ambos informes en cada PR y los guarda 14 días como artefactos `cobertura-backend` y `cobertura-app`.

## Documentación OpenAPI

121 operaciones en 94 rutas, 59 esquemas, 18 etiquetas y 118 operaciones protegidas por token. Detalle en [`docs/api/README.md`](../api/README.md).

## Entorno

| Elemento | Valor |
| --- | --- |
| Equipo | Intel Core i7-14650HX, 24 hilos, 16 GB, Windows 11 |
| API | Dos instancias NestJS detrás de `balanceador.mjs`, `DATABASE_POOL_SIZE=20` cada una |
| Base | PostgreSQL 17 portable con dos años de datos (24 012 recepciones, 184 092 sacos) |
| Generador | k6 2.4.0 en el mismo equipo |

## Qué no demuestra

- **El generador compite con la API.** k6 con 2000 usuarios, las dos instancias y PostgreSQL compartieron CPU; en servidores separados el límite estará más arriba.
- **Los niveles incluyen su subida.** Cada nivel cuenta sus 30 s de subida, así que mezcla un poco de carga del nivel anterior.
- **Solo lecturas.**
- **Una prueba de Jest** falló una vez en cuatro corridas completas anteriores y no se repitió en las dos de esta fecha.
