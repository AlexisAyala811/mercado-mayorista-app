# Indicadores conectados a Reportes

Integrado el contrato aprobado de operación/periodo en ReportsScreen: Compra/Venta, importe original, operaciones registradas, sacos/peso, saldo actual de cuentas originadas en el periodo y número de cuentas abiertas. Ventas muestra devoluciones separadas, indicando que pueden corresponder a operaciones de otro periodo. Conserva panorama financiero global, precios y alertas existentes; las etiquetas distinguen saldo del periodo y saldo global.

Cambiar operación/periodo/filtros invalida conjuntamente resultados y secuencia de petición. Una respuesta tardía no restaura indicadores de la operación anterior. No se presentan ceros inventados mientras falta consulta. Carga, error y reintento usan el flujo existente; un fallo del resumen impide publicar un resultado parcial incoherente.

HTTP real aprobado, `tmp/operation-overview-live-http-20261017.json`: sesión QA, Compra/Venta, coincidencia de totales/cantidades con resumen vigente, saldo acotado menor o igual al global, rechazo anónimo401, operación/fecha inválidas400 e intervalo invertido422. Sesión cerrada204; ninguna mutación comercial. API actualizada iniciada como Node30540 según log de QA; no implica permanencia futura de ese proceso.

Frontend: typecheck y lint aprobados; 19 pruebas enfocadas de Reportes y **519 pruebas/71 suites** en ejecución integrada, logs `tmp/report-overview-integration-types-20261017.log`, `tmp/report-overview-integration-lint-20261017.log`, `tmp/report-overview-integration-tests-20261017.log`, `tmp/report-overview-integration-all-tests-20261017.log`. Nuevas regresiones: saldo de periodo distinto al global, cambio Compra/Venta y respuesta atrasada ignorada.

Pendiente: observación UI de indicadores y periodos, composición completa Figma con los activos originales, proyecciones de detalle/agrupaciones y cuatro descargas PDF/Excel aprobadas. No se acredita fidelidad visual por usar componentes existentes ni se cierra la meta global.

Exportación completada con código0 e instalada en dist a las 2026-10-17T23:56:34Z: `web-export-report-overview-20261017`, 270 archivos cotejados, respaldo `tmp/web-before-report-overview-20261017`, activos anteriores conservados. Incluye periodos rápidos e indicadores conectados. Evidencia `tmp/report-overview-web-activation-20261017.json`; PDF.js6.4.299 verificado con 200 archivos por raíz. La exportación lenta se observó hasta finalizar, sin duplicarla. No hubo navegación de navegador ni se acredita render por la activación.
