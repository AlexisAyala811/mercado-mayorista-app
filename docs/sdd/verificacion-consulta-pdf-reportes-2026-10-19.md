# Consulta PDF en Reportes — 19 de octubre de 2026

Cumple la acción Consultar del plan de convergencia de Reportes para resumen y contraparte. Ambos reportes usan el mismo endpoint PDF autenticado de descarga. La consulta de detalle/variedad Excel sigue pendiente de listado paginado; no se añade un visor incorrecto ni una acción ficticia.

La pantalla reutiliza `ReceiptPreview` (PDF.js web / visor PDF nativo), con título, nombre de archivo y mensajes de reporte. Se conserva el comportamiento predeterminado de comprobantes. Preparación de archivo separada de compartición: consultar no abre el panel de compartir. Se retiene un archivo hasta cerrar/reemplazar/desmontar, liberando blob o caché; se descartan y liberan respuestas tardías tras cambiar periodo/sesión. Bloqueo de solicitudes simultáneas y error/reintento mediante la acción original. Una respuesta 401 invalida la sesión central y no abre el visor.

Tipos, lint y **528 pruebas / 73 suites** aprobados: `tmp/report-preview-app-check-20261019.log`. Casos nuevos verifican preparación sin compartir, apertura/cierre con liberación única, descarga tardía tras desmontaje y sesión vencida. Dos suites de Reportes inicialmente no ejecutaron por ausencia del módulo nativo PDF en Jest; se simula únicamente ese módulo nativo, manteniendo pruebas separadas del visor. No se toma el mock como evidencia de Android.

Android continúa pendiente: SDK no detecta el AVD como listo mientras emulator/qemu permanecen vivos; no se duplica su arranque. También pendientes interacción web real, foco al cerrar, lector de pantalla, PDF multipágina y convergencia visual completa. No cierra la meta global.

Paquete `web-export-report-preview-20261019` exportado y activado: 271 archivos cotejados, activos anteriores conservados y respaldo `web-before-report-preview-20261019`. Evidencia `tmp/report-preview-web-activation-20261019.json`. Recursos PDF.js 6.4.299 coinciden con instalación. Esto acredita empaquetado, no interacción visual.
