# Salida inicial de compra y disposición compacta — 11 de octubre de 2026

## Comportamiento implementado

El formulario inicial compara los campos con sus valores iniciales, incluida la fecha del montaje, y detecta proveedor, vehículo y variedades seleccionados. Sin cambios, Volver conserva el historial o retorna al menú si no existe. Con cambios, pide confirmar su descarte; cancelar conserva la edición y no encola una recepción. El guardado y la revisión de salida bloquean campos/selecciones mediante estados separados: abrir el diálogo no se rotula «Guardando…». El envío también rechaza iniciar una recepción mientras está abierta la revisión de salida.

Se registró `usePreventRemove` para acciones del navegador de rutas y un aviso `beforeunload` en web, siguiendo el patrón de ventas. La acción interceptada se conserva para continuarla únicamente tras descarte; durante guardado no se permite confirmar salida. Las guardas se limitan a datos iniciales de una recepción nueva; se conservan los diálogos de pesaje y liquidación existentes.

## Verificación y brecha observada

TypeScript, lint y **364 pruebas en 51 suites aprobadas**. Cuatro casos nuevos verifican salida intacta con/sin historial, cancelación con conservación de campo y descarte explícito, y continuación de la acción interceptada solo después de confirmación. Las regresiones previas de recuperación, pesaje y liquidación continúan aprobadas. La primera comparación con ref durante render fue rechazada por React Compiler; se sustituyó por un estado inicial inmutable y la comprobación pasó.

En el navegador real se modificó únicamente un conductor ficticio, se abrió el aviso con Volver, se canceló conservando el valor y se confirmó después la salida al menú. No se pulsó Continuar al pesaje ni se encolaron operaciones. En la versión final se observaron `readonly` en el campo y ausencia de etiqueta «Guardando…» mientras el diálogo estaba abierto.

**El retroceso externo del navegador sigue sin protegerse en la prueba real**: `tab.back()` regresó al menú sin presentar el aviso, incluso después de recargar la versión final y observar el conductor en edición. No se acredita ese recorrido por la prueba simulada de `usePreventRemove`. Es necesario resolver esa brecha de navegación web y comprobar el retroceso de Android. Tampoco se verificó el aviso de cierre/recarga del navegador ni resistencia a cierre forzado del proceso; estos datos iniciales todavía no son un borrador duradero.

La primera comprobación de las props corregidas seguía ejecutando una versión servida anterior; una recarga explícita desde el menú cargó la versión final. Las capturas anteriores `purchase-initial-exit-dialog-2026-10-11.png` y `purchase-initial-exit-dialog-final-2026-10-11.png` son diagnósticas y no acreditan el bloqueo final separado.

## Adaptación compacta

La captura a 360 × 800 mostró espacios excesivos: `flexBasis:360` se aplicaba en dirección vertical fuera de la cuadrícula de columnas. Se limitó esa base al modo de columnas ≥760 px. En la comprobación final, los tres inputs medidos tienen 52 px de alto y contenedores de 84 px; ancho documental 360 sin desbordamiento. El diálogo cabe en el viewport y la cancelación mantiene el conductor.

Evidencias finales: `tmp/purchase-initial-compact-final-2026-10-11.png`, `tmp/purchase-initial-compact-geometry-2026-10-11.json` y `tmp/purchase-initial-exit-dialog-responsive-2026-10-11.png`. Se restableció el viewport y quedó el menú abierto. Esta adaptación no acredita igualdad visual completa con Figma o un dispositivo Android.
