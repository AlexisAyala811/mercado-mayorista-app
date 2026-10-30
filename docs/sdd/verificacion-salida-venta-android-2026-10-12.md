# Salida de venta y etiquetas de confirmación en Android — 12 de octubre de 2026

## Recorrido observado

En el AVD Mercado_Tablet_API36, Android API 36 y 1280 × 800, se reutilizaron el cliente de desarrollo y la base local aislada de pruebas. Las acciones se realizaron mediante el SDK Callstack agent-device 0.21.22, con referencias observadas y generaciones frescas; no mediante coordenadas o entrada adb.

La cuenta ficticia Mayorista abrió Venta y luego Ventas. Se editó únicamente el conductor. Atrás del sistema mostró «¿Salir de la venta?». Cancelar conservó el texto. La sesión venció durante la consulta posterior de comprador; no se verificó su selección ni se confirmó una venta. La comprobación del reloj del host y del emulador mostró la misma época en ese momento, sin acreditar la causa de la expiración.

Tras volver a iniciar sesión, se recreó una edición ficticia y se descartó expresamente. La aplicación volvió al menú y una venta nueva mostró el placeholder Conductor, sin el valor descartado. Esta condición se comprobó en `tmp/android-sale-after-discard-clean-2026-10-12.json`. No se envió una operación comercial.

## Corrección visual compartida

La captura inicial reveló que «Salir sin guardar» aparecía recortado pese a tener una etiqueta de accesibilidad completa. `ConfirmationDialog` ahora dispone las acciones en una columna; `AppButton` permite expandir el texto al ancho disponible mediante una propiedad opcional usada en esas confirmaciones. Los controles mantienen 52 px de alto en este tamaño.

Se inspeccionaron visualmente las capturas corregidas `tmp/android-sale-exit-dialog-label-fixed-2026-10-12.png` y `tmp/android-purchase-exit-label-fixed-2026-10-12.png`: ambas muestran la etiqueta de descarte completa. Las capturas anteriores de venta, incluida la terminada en `-final`, son diagnósticas y no acreditan esta corrección.

Tipos y lint aprobaron después del cambio. Las regresiones de los flujos de venta y liquidación de compra aprobaron: 36 pruebas en dos suites. Las 371 pruebas de la línea base habían aprobado antes de este cambio visual; no se declara una nueva ejecución completa.

## Límites y estado final

La evidencia cubre navegación, cancelación, descarte y legibilidad de estas confirmaciones. No acredita confirmación comercial completa de venta, precios, pagos, despacho, anulación, comprobantes, TalkBack, otros dispositivos o convergencia visual completa con Figma.

La última captura conservada muestra la confirmación de salida de compra con una edición ficticia. Al intentar descartar y cerrar sesión posteriormente, el SDK informó que el daemon remoto ya no estaba disponible; la primera acción falló y se detuvo el recorrido. No se afirma cierre de sesión posterior a esa captura ni se alteraron procesos ajenos para conseguirlo.

La comprobación posterior fuera del sandbox alcanzó el daemon, pero su captura falló porque adb no encontró `emulator-5554`. Por tanto, el error anterior no demuestra que el daemon hubiese terminado; el dispositivo ya no estaba disponible para completar ese cierre. No se reinició el emulador solo para convertir una observación fallida en una afirmación de cierre.
