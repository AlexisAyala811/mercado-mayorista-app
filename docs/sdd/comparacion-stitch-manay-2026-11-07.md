# Comparación de la app MAÑAY con el diseño de Stitch

**Fecha:** 7 de noviembre de 2026 · **Tarea:** [T1150 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Referencia:** diseño de Google Stitch del usuario, `stitch_ui_feature_enhancement (2).zip` (16 pantallas), y las [aclaraciones CL-FM01 a CL-FM20](aclaraciones-frontend-manay-2026-11-04.md)

## Método

Cada pantalla de Stitch se comparó con su equivalente en la app, capturada en el emulador a 1280 × 800 ([verificación en el emulador](verificacion-emulador-manay-2026-11-07.md) y fases 2 a 5). La comparación es visual, por bloques: estructura, jerarquía, contenido y acciones. No es píxel a píxel, porque Stitch es una referencia y la app se rehízo en React Native (CL-FM, introducción).

Cada diferencia queda en uno de tres grupos:

- **Coincide:** la app sigue a Stitch.
- **Diferencia aprobada:** una aclaración del 4 de noviembre de 2026 decidió apartarse de Stitch.
- **Brecha:** la app no sigue a Stitch y ninguna decisión lo justifica. Cerrarla o aceptarla es decisión del usuario.

## Elementos de Stitch retirados por decisión

Se aplican a todas las pantallas y la app ya los cumple.

| Elemento de Stitch | Decisión | Estado en la app |
| --- | --- | --- |
| «AgroGestión Terra», «AgroPapa», «Bodega central», «Terra Console» | CL-FM01: marca única MAÑAY | Solo MAÑAY |
| Ícono generado por Stitch | CL-FM02: logo propio | `BrandMark` con el logo del usuario |
| «Balanza conectada», «Báscula #1 calibrada», «Carga rápida (10 sacos a 50 kg)» | CL-FM04: pesaje a mano | Sin balanza ni carga automática |
| Interruptor Compra / Venta del menú | CL-FM19: las dos secciones a la vista | Compra, Venta y Gestión visibles a la vez |
| «Guías SUNAT» en Reportes | CL-FM12: fuera de alcance | Sin SUNAT |
| Botones de devolución y «eliminar» en las listas | CL-FM14: sin devoluciones; anular solo el Mayorista, con motivo | Sin devoluciones; «Anular» con motivo en el detalle |
| Barra de estado simulada (Red 5G, batería, hora) | La pone Android | Barra del sistema y barra de sincronización propia |

## Comparación por pantalla

| Pantalla de Stitch | Coincide | Diferencia aprobada | Brecha |
| --- | --- | --- | --- |
| Inicio de sesión | Panel verde a la izquierda con logo, nombre y lema; tarjeta blanca con usuario, contraseña y botón oscuro a ancho completo | Sin «balanza conectada» (CL-FM04) | Stitch ofrece selección rápida de operador y «Mantener estación activa». La app no la tiene: mostrar los usuarios en la pantalla de acceso los expone, y la sesión ya se restaura sola. **Se propone aceptar la diferencia** |
| Menú (Compra) y menú (Venta) | Tarjetas blancas en cuadrícula con título, descripción y flecha; usuario y cierre de sesión arriba | Secciones a la vista en lugar del interruptor (CL-FM19) | **B1.** Las tarjetas de Stitch llevan número (01–06), ícono ilustrado de color, una insignia con un dato vivo («12 hoy», «3 pendientes») y un resumen al pie («Por pagar S/ 8,420»). La app muestra iniciales (AN, VC) sin datos |
| Todas | — | — | **B2.** Stitch tiene una barra inferior fija en todas las pantallas: «Atrás», «Menú principal» y «Siguiente». La app pone «Volver», «Menú» o «Volver al menú» en lugares distintos según la pantalla (arriba en los historiales, abajo en la compra, en la cabecera en Reportes) |
| Todas | Cabecera con el logo en Compra, Deudas, Cobranzas, Carros y Reportes | — | **B3.** Stitch repite la misma cabecera en cada pantalla: usuario con su estado en línea y título al centro. En la app, Historial de compras y de ventas, Analítica, Administración, Pendientes de envío y Estado de cuenta usan otra cabecera, sin logo |
| Registro de compra con varios lotes (2 pantallas) | Lotes A y B con variedad, base y precio propios; subtotal por lote; flete con tarifa por saco y su subtotal; resumen de liquidación con adelanto y neto | Bruto **y** tara por saco (CL-FM05); lista con «Ir al saco» en vez de la cuadrícula de 5 columnas, pensada para 200 o más sacos (CL-FM06); elección de quién paga el flete (CL-FM10) | Stitch reúne pesaje y liquidación en una sola pantalla larga con pestañas por lote. La app los separa en dos pasos (pesaje, luego liquidación) con el detalle bloqueado al liquidar. **Se propone aceptar la diferencia**: el cierre del pesaje antes de liquidar es una regla de la spec 002 |
| Guardado exitosamente (venta y compra) | Mensaje de éxito y resumen de la operación | — | **B4.** Stitch centra una tarjeta con variedad, sacos y peso, precio y total neto, y botones «Imprimir», «Nueva venta», «Enviar WhatsApp», «Enviar correo» y «Enviar foto». La app muestra los pasos, el aviso y la lista de lotes; compartir el comprobante está en Comprobantes y Mensajería, no en la confirmación |
| Ver compras y Ver ventas | Estado de pago con texto y color: «Pagada» en verde y «Con deuda» en rojo con su saldo (CL-MD05) | Sin «eliminar» (CL-FM14) | **B5.** Stitch abre directamente la lista, con buscador y fecha en una barra, filtros con conteo (Todos 4 · Pagados 2 · Falta pagar 2), tres totales (compras, pagado y saldo pendiente) y tarjetas con variedad, sacos y kilos, precio, total y el botón «Abonar / liquidar». La app abre con un formulario de búsqueda, filtra por etapa del ciclo (borrador, en pesaje, liquidada, anulada) y sus tarjetas muestran proveedor, fecha, etapa, estado de pago y «Abrir detalle» |
| Deudas y Cobranzas | Pantallas separadas (CL-FM18); buscador; tarjeta por cuenta con estado y saldo; botón «Estado de cuenta» del comprador (CL-FM13) | — | **B6.** Stitch pone arriba tres totales (deuda acumulada, abonado este mes, saldo vencido) y los filtros Pendientes / Todos / Al día, y cada tarjeta trae la operación, el volumen, el total con el adelanto y el botón «Abonar» o «Registrar cobro». La app muestra abajo los totales de caja (entradas, salidas y neto), deja el filtro por estado al final y pide «Ver detalle» antes de pagar |
| Carros (2 pantallas) | Buscador, tarjeta por vehículo con placa y conductor, alta de vehículo | — | Stitch usa un botón flotante «+»; la app, el botón «Nuevo» junto al buscador. Diferencia menor; **se propone aceptarla** |
| Reportes de compras y de ventas | Período (hoy, semana, mes, personalizado), exportar PDF y Excel, filtros por variedad | Sin SUNAT (CL-FM12) | **B7.** Stitch abre con cuatro indicadores (inversión, volumen, precio promedio, productores), un gráfico por día, la distribución por variedad y una tabla consolidada. La app muestra los indicadores y las tablas debajo de los filtros, sin gráficos. **R1.** Además, el resumen de ventas todavía dice «Devoluciones confirmadas en el período: N · S/ X» (`report-indicators.tsx`), aunque CL-FM14 retiró las devoluciones de la app |
| Analítica | Precios por variedad; «datos insuficientes» cuando no alcanza la historia | Precios sugeridos solo con datos suficientes (CL-FM20); sin «margen» inventado | **B8.** Stitch abre con la pizarra de precios: un precio grande por variedad con su tendencia y un gráfico de 7 días. La app abre con el formulario de período, variedad y participantes y muestra los resultados debajo |

## Resumen

- **Coincide:** paleta, tipografía, tarjetas blancas con borde fino, estados de pago con texto y color, lotes con precio propio, flete opcional, Deudas y Cobranzas separadas, estado de cuenta del comprador y Carros.
- **Diferencias aprobadas:** marca y logo, pesaje a mano con bruto y tara, lista para 200 o más sacos, menú sin interruptor, sin SUNAT y sin devoluciones.
- **Se proponen aceptar:** selección rápida de operador en el acceso, pesaje y liquidación en dos pasos y el botón «Nuevo» de Carros.
- **Resto de devoluciones (R1):** contradice CL-FM14 y se corrige sin decisión nueva.
- **Brechas abiertas (B1–B8):** pendientes de la decisión del usuario. Cerrar B1, B5, B6, B7 y B8 cambia lo que muestra cada pantalla y necesita datos que hoy no pide (conteos y totales por estado), así que se especifica como enmienda de la spec 011 antes de implementarlo.

## Cierre — 9 de noviembre de 2026

Las brechas B1–B8 y R1 quedaron cerradas con las fases B a E; el estado de cada una está en la [verificación de cierre](verificacion-stitch-consultas-2026-11-09.md#estado-de-las-brechas-de-la-comparación).
