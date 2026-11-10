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

## Igualdad con Stitch — 9 de noviembre de 2026

El usuario pidió el 9 de noviembre de 2026: «el frontend hazlo igual a lo que te mande, igual al stich». Respuestas con la herramienta de preguntas de la sesión:

| ID | Pregunta | Respuesta literal | Decisión |
| --- | --- | --- | --- |
| CL-ST11 | ¿Qué decisiones anteriores se reabren para copiar Stitch? | «Menú con interruptor, Pesaje en una pantalla, Acceso con operadores» | Reemplaza CL-FM19 (menú con secciones a la vista), CL-ST03 en lo que aceptaba pesaje y liquidación en dos pasos y acceso sin selección de operador. CL-FM06 (200 sacos o más) sigue vigente: la cuadrícula de Stitch debe funcionar con esa cantidad |
| CL-ST12 | ¿Qué se hace con balanza, SUNAT, devoluciones y la marca de Stitch? | «Mantenerlos fuera» | Siguen fuera (CL-FM01, CL-FM04, CL-FM12, CL-FM14): no se dibujan funciones que la app no tiene ni otra marca |
| CL-ST13 | ¿Qué tan exacto es el parecido en el resto de pantallas? | «Igual a cada maqueta» | Cada pantalla se rehace con la disposición, tamaños, colores e íconos de su maqueta y se compara captura con captura |

## Propuestas adoptadas sin pregunta (9 de noviembre de 2026)

| ID | Tema | Decisión |
| --- | --- | --- |
| CL-ST14 | Cabecera y barra | No se eligió «Barra y cabecera de Stitch»: se conservan la cabecera MAÑAY y la barra «Atrás · Menú principal» de la fase C, y se iguala a la maqueta el contenido de cada pantalla. La barra oscura de Stitch con red, batería y hora es simulada; Android ya muestra la suya |
| CL-ST15 | Opciones sin lugar en el interruptor | Stitch pone seis tarjetas por lado y no tiene Pendientes de envío, Comprobantes, Mensajería, Usuarios y reemplazos, Auditoría ni Flete y estiba. Esas entradas van en una fila «Más opciones» bajo las tarjetas, con el mismo permiso por rol |
| CL-ST16 | Selección rápida de operador | La lista sale de los usuarios que ya iniciaron sesión en esta tablet, guardada solo en el dispositivo; nunca de una consulta al servidor sin sesión. Tocar un operador llena el usuario; la contraseña se escribe siempre. «Mantener estación activa» recuerda al operador en la lista y se puede desmarcar para olvidarlo |
| CL-ST17 | Peso por saco en la cuadrícula | Stitch tiene un solo campo por celda; la app necesita bruto y tara (CL-FM05). Cada celda muestra el neto en grande y, al tocarla, abre bruto y tara en kilos enteros |

## Igualdad visual completa — 10 de noviembre de 2026

El usuario pidió el 10 de noviembre de 2026: «el frontend debe ser igual al stich igual a las diferentes pantallas/vistas, debe ser importante igual no cambies nada». Respuesta con la herramienta de preguntas de la sesión:

| ID | Pregunta | Respuesta literal | Decisión |
| --- | --- | --- | --- |
| CL-ST18 | ¿Qué se copia tal cual de Stitch? | «Todo lo visual (Recomendado)» | Reemplaza CL-ST14: la cabecera es la de Stitch (usuario con su estado de conexión, título o marca al centro, botón de sincronización) y la barra inferior es la de Stitch (Atrás, Menú principal y Siguiente con sus íconos, también en el menú). Tamaños de letra, colores y disposición iguales a cada maqueta. La barra de estado simulada (red, batería, hora) no se dibuja porque Android ya la muestra. Balanza, SUNAT y devoluciones siguen fuera (CL-ST12): la app no tiene esas funciones |

### Propuesta adoptada sin pregunta (10 de noviembre de 2026)

| ID | Tema | Decisión |
| --- | --- | --- |
| CL-ST19 | Sacos de la venta | La maqueta de venta pesa saco por saco. En tablet, cada lote se pesa así en kilos enteros y se envía como una línea con la cantidad de sacos y la suma de sus pesos; la API de ventas y sus reglas no cambian, y los pesos por saco no se guardan en el servidor |
