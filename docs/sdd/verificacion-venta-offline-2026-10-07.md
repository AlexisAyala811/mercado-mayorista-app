# Venta offline y protección de edición

Fecha: 7 de octubre de 2026. Fuentes: especificaciones 003 y 005 y alcance aprobado sin inventario. La meta completa de frontend continúa abierta.

## Cambios implementados

El formulario protege datos sin guardar mediante `usePreventRemove` del módulo público `expo-router/react-navigation`, presente en Expo Router 57.0.24. El callback conserva la acción interceptada y solo la continúa después de aprobar la salida. El botón Cancelar conserva comprador, despacho, líneas, flete y cuotas si se cancela el aviso; en web se registra `beforeunload` mientras hay edición sin guardar. La confirmación central o el guardado duradero de cola permiten salir sin mostrar un falso aviso de pérdida. Durante guardado/envío se bloquean controles y navegación; una línea aún en edición debe agregarse o vaciarse antes de revisar el acuerdo. Referencia del patrón: https://reactnavigation.org/docs/use-prevent-remove; exports/implementación contrastados con el paquete instalado de Expo Router.

La cola revalida una identidad restaurada offline con el bootstrap existente después de sincronizar/comprobar un pendiente. No prolonga la expiración ni cambia permisos localmente. Si sigue sin conexión se mantiene exclusivamente la política vigente de sesión previamente verificada y no vencida; los rechazos centrales siguen impidiendo el acceso.

Los contratos históricos `sale.create` con lotId/expectedLotVersion y `inventory.adjustment` se comprueban primero en /operations. Un resultado existente se recupera sin POST. Ante ausencia central se marca revisión y conserva UUID/cuerpo/intentos y fecha del cambio; no se envía stock ni se convierte un acuerdo de dinero automáticamente. La pantalla ofrece comprobar resultado central y descarte razonado conforme al protocolo existente.

## Verificación de código

TypeScript, lint y suite completa: **221 pruebas frontend en 35 suites**. Se añadieron pruebas de aviso/cancelación, continuación de acción interceptada, línea en edición, bloqueo durante guardado, revalidación después de sincronización y recuperación/revisión de contratos antiguos. Último ajuste de fecha de revisión: tipos/lint y 42 pruebas de las tres suites afectadas pasan. Backend sin cambios de producción en este corte; la evidencia anterior es 117 pruebas unitarias y nueve PostgreSQL del alcance sin inventario.

## Recorrido real web, API y PostgreSQL

1. En el frontend local actualizado se escribió Conductor `QA venta offline 20261007`, se pulsó Cancelar y se canceló el aviso de salida. El campo mantuvo su valor. Se seleccionaron Comprador QA/Canchán QA y se agregaron 3 sacos, 150 kg a S/1.55 por kg. El resumen mostró S/232.50 al contado.
2. Se verificó la identidad del proceso API de esta tarea y se pausó únicamente ese proceso. PostgreSQL y Metro siguieron activos; no se cambiaron red, cifrado, usuarios o permisos.
3. Confirmar guardó la venta en cola cifrada real antes de consultar el servidor; mostró Pendiente, cero envíos y un pendiente central. La recarga mantuvo la operación y restauró la sesión local no vencida con aviso explícito. Captura `tmp/sale-offline-restarted-pending-2026-10-07.png`.
4. Se restauró el mismo helper/API y se pulsó Sincronizar pendientes. GET /operations con UUID devolvió 404 y POST /sales 201. La operación pasó a Confirmada con un envío. La recarga final mostró Datos sincronizados y cero pendientes. Captura `tmp/sale-offline-restarted-confirmed-2026-10-07.png`. Esta recarga confirma la revalidación central del estado final; el enlace automático añadido después se verificó en pruebas de pantalla/proveedor, no mediante una segunda interrupción real.
5. API/PostgreSQL comprobaron UUID `1567a276-83f9-4183-9f01-cbc916ca9d1f`, venta `55f70ccc-926f-4b14-a79e-9bb007b19109`, 3 sacos/150.000 kg, tarifa 155 céntimos/kg, total 23250 céntimos y lote nulo. Hay una venta, un cobro, una confirmación auditada y cero movimientos de stock. Evidencia `tmp/sale-offline-restart-api-2026-10-07.json`; verificador reproducible `mercado-api/test/offline-sale-ui-verification.mjs`. No se guardan tokens o contraseñas en esa evidencia.

## Límites pendientes

No acredita dos horas de continuidad, creación inicial offline con catálogos vacíos/no conservados, todos los rechazos y pérdidas de respuesta reales, detalle comercial legible completo en cola, Android o igualdad visual completa con Figma. La protección de recarga/cierre depende del soporte del navegador; no sustituye persistencia de borradores no confirmados. Faltan otras regresiones financieras, exportaciones actuales y estimación/evaluación/publicación de 007. Los datos ficticios pertenecen exclusivamente al entorno local aislado; la API quedó restaurada.
