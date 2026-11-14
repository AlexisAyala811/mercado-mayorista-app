# Verificación de la convergencia con Stitch, fase E y cierre

**Fecha:** 9 de noviembre de 2026 · **Tareas:** [T1168–T1171 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-stitch-consultas` · **Comparación:** [comparación con Stitch](comparacion-stitch-manay-2026-11-07.md)

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1168 (B4) | `features/receipts/components/confirmation-card.tsx`: al guardar una compra o una venta, una tarjeta con la contraparte, las variedades, los sacos y kilos, la forma de pago y el total; «Compartir comprobante» abre la hoja de compartir del sistema con el PDF (WhatsApp, correo…) y «Nueva compra» o «Nueva venta» abre un formulario limpio (`?nueva=`). La venta guarda también sus líneas confirmadas para el resumen. Se retira «Volver al menú» (lo hace la barra) |
| T1169 (B7) | `ui/components/bar-chart.tsx`: barras con vistas, sin librería, con etiqueta y valor en texto y para el lector de pantalla. Reportes consulta solo el mes actual al abrir y al cambiar entre Compra y Venta; indicadores de Stitch (total, volumen, precio promedio por kilo con enteros, proveedores o compradores atendidos, saldo) y barras por día (`report=daily`) y por variedad, antes de las descargas y los filtros de precios |
| T1170 (B8) | `features/analytics/screens/price-board.tsx`: Analítica abre con la pizarra: por variedad, el precio pactado de compra y de venta de la última semana con datos (redondeado al céntimo para mostrar), su variación semanal y las barras de 8 semanas. El precio sugerido no se inventa: el texto remite a la disponibilidad de estimaciones (CL-FM20) |
| T1170 | Se quitan de Analítica, del diálogo de filas de Reportes y del aviso de descarte de Ver ventas las menciones a devoluciones que quedaban visibles (CL-FM14), como R1 |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 673 pruebas en 98 suites |
| Pruebas nuevas | `tests/reception/purchase-confirmation.test.tsx` (tarjeta, compartir y nueva compra), `tests/sales/sale-flow.test.tsx` (tarjeta de venta), `tests/reports/report-figures.test.tsx` (precio promedio con enteros, barras, gráficos del periodo), consulta automática en `reports-without-inventory.test.tsx`, `tests/analytics/price-board.test.tsx` (redondeo, ventana de 8 semanas, última semana y variación, sin precio sugerido inventado) |
| Emulador 1280 × 800, venta completa | Comprador, destino, variedad, 5 sacos, 250 kg a S/ 2.00; [«Revisar y confirmar» desde la barra](../../img/verificacion-stitch-consultas-2026-11-09/venta-revisar.png); [Venta guardada con Canchán, 5 sacos · 250 kg, Contado, S/ 500.00](../../img/verificacion-stitch-consultas-2026-11-09/venta-guardada.png); [«Compartir comprobante» abre la hoja de compartir con el PDF](../../img/verificacion-stitch-consultas-2026-11-09/venta-compartir.png); [«Nueva venta» abre el formulario vacío](../../img/verificacion-stitch-consultas-2026-11-09/nueva-venta.png) |
| Emulador 1280 × 800, consultas | [Reportes con barras por día y por variedad](../../img/verificacion-stitch-consultas-2026-11-09/reportes-barras.png); [pizarra de Analítica](../../img/verificacion-stitch-consultas-2026-11-09/analitica-pizarra.png) y [sus barras](../../img/verificacion-stitch-consultas-2026-11-09/analitica-barras.png) |
| T1171, teléfono de 360 dp | [Ver compras](../../img/verificacion-stitch-consultas-2026-11-09/telefono-ver-compras.png), [Deudas](../../img/verificacion-stitch-consultas-2026-11-09/telefono-deudas.png), [Reportes](../../img/verificacion-stitch-consultas-2026-11-09/telefono-reportes.png) y [Analítica](../../img/verificacion-stitch-consultas-2026-11-09/telefono-analitica.png) en una columna, sin texto cortado |
| T1171, texto al 200 % | [Ver compras](../../img/verificacion-stitch-consultas-2026-11-09/texto-200-ver-compras.png) y [Cobranzas](../../img/verificacion-stitch-consultas-2026-11-09/texto-200-cobranzas.png) sin cortes ni superposiciones |

## Defectos encontrados en el emulador y corregidos

- La tarjeta de la venta guardada quedaba debajo del aviso; ahora va primero, como en Stitch.
- Dos componentes de Reportes compartían la misma clave de React (aviso de desarrollo); la de las barras lleva prefijo.
- La pizarra mostraba los precios con cuatro decimales; se muestran al céntimo, redondeados con enteros.
- En el teléfono, la tarjeta de la pizarra se salía unos píxeles por la derecha; ahora se encoge.

## Estado de las brechas de la comparación

| Brecha | Estado | Evidencia |
| --- | --- | --- |
| B1 Menú con número, ícono y dato vivo | Cerrada | [Fase C](verificacion-stitch-navegacion-2026-11-08.md) |
| B2 Barra inferior fija | Cerrada | [Fase C](verificacion-stitch-navegacion-2026-11-08.md) |
| B3 Misma cabecera | Cerrada | [Fase C](verificacion-stitch-navegacion-2026-11-08.md) |
| B4 Confirmación con compartir | Cerrada | Esta verificación |
| B5 Ver compras y Ver ventas | Cerrada | [Fase D](verificacion-stitch-listas-2026-11-09.md) |
| B6 Deudas y Cobranzas | Cerrada | [Fase D](verificacion-stitch-listas-2026-11-09.md) |
| B7 Reportes con gráficos | Cerrada | Esta verificación |
| B8 Pizarra de Analítica | Cerrada | Esta verificación |
| R1 Restos de devoluciones | Cerrada | [Fase A](comparacion-stitch-manay-2026-11-07.md) y esta verificación |

## Lo que no se verificó

- TalkBack: la imagen del emulador no lo trae ([verificación del 7 de noviembre](verificacion-emulador-manay-2026-11-07.md)). Cada barra, tarjeta y estado tiene etiqueta accesible y está cubierto por pruebas, pero no se escuchó con un lector real.
- Envío real por WhatsApp o correo: el emulador no tiene esas aplicaciones; sí se abrió la hoja de compartir con el PDF.
- La confirmación de compra se probó con pruebas de componente; en el emulador se recorrió la de venta, que usa la misma tarjeta.
