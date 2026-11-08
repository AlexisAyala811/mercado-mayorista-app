# Aclaraciones de la convergencia con Stitch

**Fecha:** 7 de noviembre de 2026 · **Fase SDD:** `clarify` · **Especificación:** [spec 011, sección del 7 de noviembre de 2026](../../specs/011-manay-app-design/spec.md#convergencia-con-stitch--7-de-noviembre-de-2026) · **Origen:** [comparación con Stitch](comparacion-stitch-manay-2026-11-07.md)

Respuestas del usuario del 7 de noviembre de 2026, con la herramienta de preguntas de la sesión.

| ID | Pregunta | Respuesta literal | Decisión |
| --- | --- | --- | --- |
| CL-ST01 | ¿Qué brechas generales se cierran? | «B1 Menú más rico, B2 Barra inferior fija, B3 Misma cabecera, B4 Confirmación con compartir» | Se cierran las cuatro |
| CL-ST02 | ¿Qué brechas de listas y consultas se cierran? | «B5 Ver compras/ventas, B6 Deudas y Cobranzas, B7 Reportes con gráficos, B8 Analítica pizarra» | Se cierran las cuatro |
| CL-ST03 | ¿Se aceptan sin selección rápida de operador, pesaje y liquidación en dos pasos y «Nuevo» en Carros? | «Sí, acéptalas» | Diferencias aceptadas; no se implementan |
| CL-ST04 | ¿Se amplía el backend para B5? | «Sí, amplía la API» | Listas de compras y ventas con variedades, sacos, kilos, total y saldo por operación, y un resumen con conteos y totales del filtro. Solo lectura, sin migración, con pruebas e2e |
| CL-ST05 | ¿Cómo se dibujan los gráficos? | «Barras simples sin librería» | Barras con vistas de React Native, con el valor en texto; sin dependencia nueva |
| CL-ST06 | ¿Qué periodo muestra la pizarra de Analítica? | «Semanas, últimas 8» | Precio pactado de la última semana por variedad y su evolución en 8 semanas; precio sugerido solo con datos suficientes (CL-FM20) |
| CL-ST07 | ¿Cómo queda la barra inferior? | «Atrás y Menú siempre» | «Atrás» y «Menú principal» en todas las pantallas; «Siguiente» solo en compra y venta, para avanzar de paso |

## Propuestas adoptadas sin pregunta

El usuario no expresó preferencia sobre estos puntos; se adopta la propuesta y se informa.

| ID | Tema | Decisión |
| --- | --- | --- |
| CL-ST08 | Datos vivos del menú (B1) | Cada tarjeta muestra un dato que la API ya entrega: Deudas «Por pagar S/ X», Cobranzas «Por cobrar S/ X», Ver compras y Ver ventas «N hoy», Pendientes de envío «N en cola» (local). Sin conexión, la tarjeta oculta el dato y sigue funcionando; nunca muestra un valor viejo como actual |
| CL-ST09 | «Abonar» desde la tarjeta (B6) | El botón abre el mismo formulario de pago o cobro del detalle, con la misma confirmación, idempotencia y versión; no crea un camino nuevo de escritura |
| CL-ST10 | Gráfico diario de Reportes (B7) | El backend agrega un informe diario de solo lectura (`report=daily` en `/reports/rows`): operaciones, sacos, kilos e importe por día del periodo, en hora de Lima |
