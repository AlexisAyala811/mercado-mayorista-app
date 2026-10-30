# Recuperación de detalle después de confirmación — 13 de octubre de 2026

Corte de 003. La inspección encontró que el éxito central de anulación/devolución se mostraba antes de consultar el detalle; si esa consulta fallaba, el detalle anterior seguía editable y el fallo se mezclaba con el error de conservación/envío. La versión antigua podía iniciar otra operación, que dependería del rechazo central por versión.

## Cambio implementado

- Conservar el mensaje y la referencia confirmados; marcar el detalle desactualizado después del éxito central.
- Separar el error/progreso de consulta del error de operación. Mostrar «Detalle pendiente de actualización» y un reintento explícito.
- Bloquear edición y nuevas anulaciones/devoluciones mientras el detalle sea antiguo, tanto en controles como en las guardias de confirmación/cambio de línea.
- Reintentar solo GET del detalle y actualización del historial. No ejecutar enqueue ni sendQueued de la operación ya confirmada.
- Mantener el comprobante confirmado disponible. Volver al historial limpia el estado local de recuperación e invalida su petición; una respuesta tardía no reabre el detalle ni publica estados en otro espacio/sesión.
- No se modifican reglas financieras, roles, API o datos comerciales.

## Evidencia y límites

Tipos y lint terminaron con código cero después del cambio. Se añadieron dos regresiones a `mercado-app/tests/sales/sales-history.test.tsx`: fallo del detalle posterior al éxito → bloqueo/reintento/versión recuperada sin segundo envío; reintento aplazado → retorno al historial → respuesta descartada.

La ejecución normal de Jest no llegó a las pruebas: falló con EPERM al resolver su carpeta temporal del sandbox. La vía habitual fuera del sandbox depende de la revisión automática que no pudo completarse por límite de uso en el intento previo de exportación. No se intentó eludir esa revisión cambiando cachés, runtime o permisos. Los casos nuevos están escritos, pero **no ejecutados**. El resultado anterior de 187 pruebas pertenece al árbol previo a esta corrección y no acredita regresión del árbol actual.

Pendientes: ejecutar pruebas enfocadas, exportar y verificar éxito/consulta fallida/reintento con API QA real; después Android, accesibilidad y Figma. No se reutilizan capturas ni build anteriores como prueba del cambio. Este corte mantiene abiertos los gates de 003 y la meta global.

Revisión posterior: se añadieron dos variantes de cambio de sesión durante el reintento (respuesta exitosa y fallo tardío). Exigen que el espacio nuevo consulte con su propio token y no reciba el detalle, éxito, error privado ni navegación del espacio anterior; conservan un único enqueue/envío original. También están pendientes de ejecución. `mercado-app/scripts/verify-frontend-qa.ps1` agrupa suite completa, export local e integridad PDF, deteniéndose al primer fallo y restaurando la configuración previa; solo se validó su sintaxis, no su ejecución.

Actualización posterior: la vía habitual de revisión permitió ejecutar el auxiliar completo a las 20:20 de Lima. Los cuatro casos nuevos y la suite completa pasaron: 432 pruebas / 63 suites, tipos, lint, export web e integridad PDF. Véase `verificacion-frontend-integrada-2026-10-13.md` para huellas y límites. Esto sustituye el estado «sin ejecutar» anterior; el recorrido real del fallo/reintento y Android/Figma no queda acreditado por Jest.
