# Compra y Venta: revisión móvil, crédito y controles accesibles

Revisión con sesión Mayorista QA y backend real, sobre las reglas vigentes sin inventario de 002/003. Este corte no confirma compras, ventas, pagos ni devoluciones.

## Compra inicial

A 360 × 800, avanzar sin datos obligatorios informa que faltan fecha, proveedor, conductor y variedad. Se añadió únicamente al borrador un conductor de QA. El editor contextual de proveedores abre dentro de la operación. Nombre nuevo sin guardar: volver solicita descarte, Cancelar conserva el nombre; descartar ese registro devuelve a la recepción conservando el conductor. El botón Volver de Compra solicita aviso, Cancelar conserva la recepción y salir explícitamente limpia el borrador QA y regresa al menú.

Captura `tmp/purchase-phone-draft-preserved-20261021.png`. La llamada Atrás del navegador en esa entrada directa no produjo navegación ni aviso observables: no acredita el gate de traversal. No se inició recepción ni se pulsó Guardar proveedor.

## Venta previa a envío

Desde el menú, Venta inicia sin datos del borrador descartado. Línea vacía informa que falta variedad. Seleccionar Comprador QA completa Lima. Una línea de Canchán QA, 1 saco, 10 kg y S/2.50 por kg calcula S/25; la revisión muestra los conceptos correctos. Crédito sin cuotas se rechaza; una cuota de S/24 frente a total S/25 se rechaza por suma. Cuota S/25 con vencimiento 31 de octubre permite revisión. Cancelar la salida conserva importe/fecha y salir explícitamente descarta solo el borrador QA. Nunca se pulsó Confirmar venta.

Se mejoraron dos aspectos de la revisión conforme al plan 003 actualizado:

- Mostrar cada cuota con su fecha e importe junto con el acuerdo validado. No se añaden reglas de crédito nuevas.
- Nombres accesibles específicos: Quitar línea N y variedad; Quitar cuota N; Importe cuota N. Las etiquetas visuales breves se conservan.

La revisión de crédito posterior muestra `Cuota 1: 2026-10-31 · S/ 25.00`; captura `tmp/sale-phone-credit-review-20261021.png`.

## Defecto de ancho detectado y corregido

El grupo de cuotas podía imponer un ancho superior al de teléfono; enfocar un campo desplazaba también los demás controles hacia fuera de pantalla. Se limitó el grupo a la anchura disponible, permitiendo crecer y envolver sus columnas. A 360 × 800, los dos campos se apilan y todos los inputs quedan dentro del viewport, incluso con foco. A 1440 × 1024, fecha e importe quedan en la misma fila (top 762.8 en ambas lecturas) y dentro de pantalla. Evidencia: `tmp/sale-credit-width-before-20261021.png`, `tmp/sale-credit-width-after-20261021.png`, `tmp/sale-credit-width-after-20261021.json`. El tamaño del navegador fue restaurado y los borradores QA descartados sin envío.

## Validación y paquete

- 161 pruebas/16 suites de compra/venta, TypeScript y lint aprobados: `tmp/purchase-sale-phone-check-20261021.log`. Nueva regresión verifica suma de cuotas, información de revisión, nombres accesibles, cancelación conservada y cero llamadas de cola/envío al revisar.
- Tras corregir el ancho: 12 pruebas de SaleFlow, tipos y lint aprobados: `tmp/sale-installment-width-check-20261021.log`.
- Paquete vigente `web-export-sale-credit-mobile-20261021`; exportación correcta, 200 recursos PDF.js verificados, 280 archivos cotejados con respaldo; `tmp/sale-credit-mobile-activation-20261021.json`. Conserva los arreglos anteriores de Reportes, Carros, Deudas y Comprobantes.

## Pendientes

Estos recorridos cubren recepción inicial y preparación/revisión de venta web, no el cierre transaccional, pesaje/liquidación reales nuevos, despacho, operación offline prolongada, Android o TalkBack. Figma permanece limitado por cuota. Tareas nativas y convergencia global permanecen abiertas.
