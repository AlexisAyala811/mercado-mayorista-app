# Consulta paginada de Reportes — 19 de octubre de 2026

Completa las acciones Consultar de detalle y variedad previstas en el plan de convergencia. Resumen y contraparte conservan su consulta PDF. No modifica fórmulas, permisos ni alcance comercial.

GET `/reports/rows` usa la misma proyección de exportación y aplica LIMIT/OFFSET en PostgreSQL. Admite detalle/variedad, Compra/Venta, periodo Lima, límite 1–100 (20 por defecto), offset entero seguro no negativo. Sesión Mayorista, negocio de identidad y caché privada desactivada. Conteo y filas comparten snapshot REPEATABLE READ / READ ONLY; el total se conserva aunque la página esté vacía. Orden fecha+ID para operaciones y nombre+ID para variedades. Cada petición tiene su propia actualización; no se promete snapshot persistente entre páginas.

Frontend: consulta modal con carga, error/reintento, vacío, anterior/siguiente y cierre. Limpia la página al navegar y descarta respuestas tras desmontaje/cambio de sesión/periodo. Muestra referencias, conceptos monetarios exactos, cantidades y saldo actual; variedad conserva «No distribuido» cuando corresponde. La exportación sigue incluyendo todo el periodo, independiente de la página visible.

## Verificación

- Backend: tipos/lint/build, **229 pruebas / 59 suites**; `tmp/report-rows-api-check-20261019.log`.
- Frontend: tipos/lint, 32 pruebas focalizadas y suite completa **532 pruebas / 75 suites**; `tmp/report-rows-app-tests-20261019.log`.
- PostgreSQL QA solo lectura: 135 filas sintéticas recorren páginas de veinte sin pérdidas ni duplicados, incluidas página parcial y vacía. Páginas reales de detalle/variedad, compras/ventas, coinciden con exportación completa; negocio ajeno no recibe datos. `tmp/report-rows-readonly-20261019.json`.
- HTTP real: cuatro consultas válidas, primera página coincide con consulta amplia, página fuera de rango conserva total, `private, no-store`, 401 anónimo, 400 para tipo/límite/offset inválidos. Sesión QA cerrada, sin mutaciones comerciales. `tmp/report-rows-http-20261019.json`.
- Pruebas UI cubren transición sin conservar filas anteriores, última página, error/reintento, vacío y fallo tardío que no invalida una nueva sesión.

Pendiente: recorrido visual real, teléfono/tablet/texto ampliado, foco/lector de pantalla y composición final contra Figma. No tomar pruebas de componentes como evidencia del render nativo. El emulador QA permanece sin detección SDK pese a procesos vivos; no reiniciarlo solo por timeout. La meta global sigue abierta.

Paquete `web-export-report-rows-20261019` activado: 271 archivos cotejados, PDF.js verificado y respaldo `web-before-report-rows-20261019`. Evidencia `tmp/report-rows-web-activation-20261019.json`. La última comprobación HTTP estática fue impedida inicialmente por límite de uso de revisión automática; se reintentó después de confirmar el restablecimiento indicado, con revisión aprobada. Resultado HTTP 200 y HTML idéntico al paquete: `tmp/report-rows-static-http-20261019.json` (20 de octubre 04:14 UTC / 19 de octubre 23:14 Lima). No es prueba de interacción visual.
