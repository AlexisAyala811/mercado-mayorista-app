# Especificación 012: Pruebas de carga con k6

**Estado:** aprobada por el usuario el 16 de noviembre de 2026 · **Fecha:** 16 de noviembre de 2026
**Origen:** rúbrica del curso (criterio 13, «Pruebas de carga k6») y los atributos de calidad [AC01 y AC06](../../docs/01-analisis-de-sistema/04-atributos-de-calidad.md)

## Objetivo

Medir con k6 si la API central cumple AC01: responder el 95 % de las consultas en menos de 3 segundos con 20 usuarios concurrentes. Hoy ese atributo no tiene evidencia.

## Alcance

| Elemento | Regla |
| --- | --- |
| Herramienta | k6, con el script en `backend/test/load/consultas.k6.js` |
| Carga | 20 usuarios virtuales: 30 s de subida, 2 min sostenidos y 20 s de bajada |
| Consultas | Resumen de compras y de ventas, filas del reporte por día y por variedad, historial de compras y totales de compras y de ventas |
| Umbrales | p95 de duración menor que 3000 ms, fallos menores que 1 % y comprobaciones correctas mayores que 99 % |
| Entorno | Base de datos desechable con datos de simulación; nunca producción |
| Segunda medición | 40 usuarios virtuales en una sola instancia, como referencia para AC06 |

## Fuera de alcance

- Escrituras (pesajes, compras, ventas, pagos): cambian saldos y necesitan su propio diseño de datos.
- La segunda instancia del backend que pide AC06: este equipo no tiene Docker ni balanceador.
- La app: el script llama a la API directamente.

## Cambio en el backend

El límite global de solicitudes es de 100 por minuto y por dirección. Veinte usuarios desde una sola dirección lo superan, así que la prueba recibiría respuestas `429`. El límite pasa a leerse de `THROTTLE_LIMIT`, con 100 como valor por defecto: el comportamiento no cambia salvo que la variable se declare.

## Hallazgo previo

Las tablets de un mismo local salen a Internet por una sola dirección. Con el límite por dirección, pocas tablets consultando a la vez pueden recibir `429`. Queda como pregunta abierta para el despliegue: ¿el límite debe ser por sesión y no por dirección?

## Criterios de aceptación

1. El script corre con un comando y termina con código distinto de cero si no se cumple un umbral.
2. El resultado queda en un archivo JSON y en un documento de verificación con fecha, datos del equipo y cifras.
3. El backend conserva 100 solicitudes por minuto cuando `THROTTLE_LIMIT` no se declara.
