# Descargas de Reportes — 19 de octubre de 2026

Implementa la propuesta aprobada `propuesta-reportes-figma-2026-10-17.md`. No modifica reglas de devolución ni realiza movimientos comerciales.

## Implementación

- GET `/reports/export`: sesión y rol Mayorista, negocio de la identidad; `summary|detail|counterparty|variety`, Compra/Venta y periodo civil Lima validado. Respuesta privada sin caché, nombre seguro y MIME PDF/XLSX.
- Snapshot REPEATABLE READ / READ ONLY para indicadores y filas. Cantidades y saldos se agregan antes de unir para evitar multiplicación. No hay límite silencioso de filas; límites XLSX se rechazan explícitamente.
- Resumen/contraparte PDF y detalle/variedad Excel. Referencias en detalle/contraparte, nombres vigentes declarados, importes confirmados y devoluciones separados. Compras por variedad: «No distribuido» porque no existe subtotal persistido por saco. Ventas: subtotal bruto de líneas, sin prorratear descuentos/fletes comunes.
- ExcelJS 4.4.0 fijado, instalación sin scripts. Importes e identificadores como texto exacto; nombres nunca se convierten en fórmulas. Hoja Información con negocio/fecha/moneda/notas y Datos con encabezado fijo/filtros. Celdas demasiado largas se rechazan, no recortan.
- Frontend: cuatro descargas después de consultar; usa periodo consultado, no filtros de precios. Previene doble envío y descarta respuestas tras cambiar operación/periodo/sesión. Web solicita descarga; nativo comparte y limpia archivo temporal. Mensaje de éxito no afirma que el usuario guardó el archivo.

## Evidencia

- Backend: tipos/lint/build y **222 pruebas / 58 suites**, `tmp/report-export-api-final-check-20261019.log`.
- PostgreSQL QA: ocho archivos, dos compras y cuatro ventas. Sumas de detalle de importes/saldos/sacos coinciden con resumen; sacos por variedad coinciden; negocio ajeno sin datos. `tmp/report-export-readonly-20261019.json`. Solo lectura.
- HTTP: ocho respuestas 200 con formato, firma binaria, nombre y no-store correctos; anónimo 401, tipo inválido 400 y periodo invertido 422; sesión cerrada. `tmp/report-export-http-20261019.json`.
- Cuatro PNG de PDFs QA inspeccionados: títulos, notas, importes, referencias y pie 1/1 legibles, sin solapamientos. Son una página; no prueba multipágina. Intermedios `tmp/qa-reporte-*.pdf/.png`.
- Round trip XLSX: valores mayores al entero seguro, nombres tipo fórmula como texto, vacío y rechazo de filas/celdas inválidas. Agrupación separa contrapartes con igual nombre por ID y conserva referencias/centavos exactos.
- Frontend: tipos/lint y **524 pruebas / 72 suites**. Primera suite tuvo timeout de 5 s en editor contextual previo y llamada tardía al siguiente caso (522 pasan/2 fallan): `tmp/report-downloads-app-check-20261019.log`. Reejecución con caché estable pasa completa: `tmp/report-downloads-app-recheck-20261019.log`. Sin ampliar tiempos ni modificar esa prueba. Nuevas pruebas cubren compartición, formato, limpieza de archivo y descarte al cambiar operación.

## Dependencias y límites

Paquete `tmp/web-export-report-downloads-20261019` activado en `mercado-app/dist`, 270 archivos cotejados y activos anteriores conservados. Respaldo `tmp/web-before-report-downloads-20261019`; evidencia `tmp/report-downloads-web-activation-20261019.json`. PDF.js 6.4.299 y sus 200 recursos coinciden con instalación. API QA reiniciada con la compilación nueva. El servidor estático no estaba escuchando; se reinició el servidor local existente en 8087. Esta activación no equivale a revisión visual de la pantalla.

source-map-js 1.2.1 tenía aviso alto en herramientas de pruebas; actualizado a 1.2.2 compatible. Quedan dos entradas moderadas del mismo aviso transitivo uuid/ExcelJS. Revisión local: ExcelJS solo llama uuid v4 para IDs de formato condicional; el aviso afecta v3/v5/v6 con buffer proporcionado. Este exportador no importa XLSX de usuarios ni configura formatos condicionales. No se declara auditoría limpia ni se fuerza downgrade/override incompatible. Evidencia inicial: `tmp/exceljs-audit-20261019.json`; reevaluar al actualizar ExcelJS.

Pendientes: descarga/compartición desde UI real, composición completa Figma, teléfono/tablet, lector de pantalla, Excel visual en aplicación de hojas y PDF multipágina. No cierra la meta global.
