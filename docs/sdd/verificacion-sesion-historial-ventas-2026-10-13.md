# Sesión y acciones del historial de ventas — 13 de octubre de 2026

Corte de 003/HU11 y aislamiento de 001. La revisión detectó que el historial reutilizaba detalle/borradores al cambiar de token, y que confirmación/compartición podían terminar con efectos de presentación o navegación después de salir. La corrección no cambia permisos, fórmulas financieras, contratos HTTP ni UUID de las operaciones.

## Implementación

- `SalesHistoryScreen` monta un espacio identificado por el token y no muestra contenido sin sesión. Cambiar token retira detalle, filtros, borradores, resultados y diálogos anteriores.
- Después del guardado en cola, se comprueba que la pantalla siga activa antes de llamar a envío desde ese espacio. Si terminó la sesión/pantalla, la operación ya conservada permanece a cargo del coordinador y de su identidad; no se borra ni se anuncia una confirmación.
- Después del envío/lectura se comprueba continuidad antes de navegar, publicar el resultado o reemplazar el detalle. Errores/finalización tardíos no actualizan el espacio retirado. Las consultas mantienen su secuencia y limpieza existentes.
- Compartir comprobante de devolución utiliza el callback de continuidad del servicio de plataforma, una sola preparación simultánea y errores visibles únicamente mientras el espacio siga activo.
- Motivo/flete/líneas se bloquean durante revisión, guardado/envío o preparación de comprobante. Los cambios de línea también comprueban la guardia de operación; motivo/flete no se editan detrás de la confirmación. El retorno al historial se deshabilita durante guardado/envío o preparación de comprobante.

## Pruebas

Tipos y lint correctos. Suite enfocada de ventas/comprobantes/autenticación: 113 pruebas en 19 suites, código cero; historial: 14 casos. Regresiones verifican:

1. Guardado aplazado seguido de desmontaje: se llamó a enqueue una vez; resolverlo después de cerrar no inicia sendQueued ni navegación desde la pantalla. El ensayo no acredita almacenamiento físico de ese caso: enqueue está simulado.
2. Envío aplazado seguido de nueva sesión: estados pending y confirmed no publican éxito, no navegan ni consultan el detalle antiguo; el nuevo token consulta su propio historial.
3. Detalle aplazado y cambio de token: se descarta el resultado y se reinician los filtros editados. Retirar sesión devuelve contenido nulo.
4. El callback de compartición responde true mientras el espacio existe y false después de desmontar. Las pruebas de servicio de comprobantes simulan los dos puntos de comprobación antes del panel de plataforma; no se transmitió un archivo externamente.

Exportación QA aprobada: veinte rutas, entrada `entry-94f09a82ce05113e51bcb3f9c5eede1e.js`, PDF diferido `pdf-1b52feaf12c4e9365d455a718c424bde.js`. La configuración pública QA se restaura al terminar el comando. No se publicó una versión productiva.

## Navegador y API reales

Se reutilizaron los servicios QA confirmados activos y el Mayorista de prueba existente. Login, Menú → Más operaciones → Historial y devoluciones. Búsqueda por Comprador QA y estado Confirmadas: tres resultados de 26 operaciones. Se abrió la venta de S/232.50 del 7 de octubre, sin modificarla.

Se escribió un motivo provisional y se abrió la revisión de anulación. Los campos dejaron de ser editables mientras el diálogo estaba abierto. En 360 × 800, Cancelar y Anular venta se muestran completos; captura `tmp/sales-history-review-phone-2026-10-13.png`, inspeccionada visualmente. Se eligió Cancelar: el motivo quedó conservado y los campos volvieron a ser editables. Volver al historial conservó comprador/estado y los tres resultados. Retorno al menú y cierre de sesión dejaron los campos de login vacíos; se restableció el tamaño del navegador. No se confirmó ni encoló una anulación/devolución durante este recorrido, y el indicador permaneció en cero pendientes.

## Pendientes

Las respuestas tardías se ensayan con servicios simulados; el navegador real cubre lectura/revisión/cancelación, no una operación comercial confirmada ni una carrera real de sesiones. Quedan Android, accesibilidad con lector, Figma y mutaciones completas. La protección de un borrador modificado al volver/abrir otra venta y el reinicio de motivo/flete entre registros requieren un corte específico: este aislamiento por sesión no los acredita. T314/T315/SI-06/SI-08 y la meta global siguen abiertos.
