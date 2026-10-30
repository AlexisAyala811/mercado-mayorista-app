# HTTP de comprobantes y archivo real — 12 de octubre de 2026

Se comprobó la API local con el Mayorista QA existente, base UI aislada y cierre de sesión en finally. No se crearon actores, permisos ni operaciones comerciales. Script reproducible: `mercado-api/test/receipt-history-http.mjs`; evidencia `tmp/receipt-history-http-2026-10-12.json`, 2026-10-13 02:38:30 UTC (12 de octubre en Lima).

## Historial

- Compras/ventas responden 200 JSON, páginas de veinte y offsets independientes, sin IDs repetidos entre las dos primeras páginas. Totales reales de la base QA: dos compras y 26 ventas.
- Sin sesión: 401. Tipo inválido y límite cero, mayor que cien, no numérico u offset negativo: 400.
- Guard de roles de producción con metadata real del controlador e identidad operativa simulada: deniega, registra auditoría simulada y no consulta el historial. No se creó una sesión/usuario Encargado persistente ni se presenta ese ensayo como HTTP real de Encargado.
- Tipos y lint correctos. Seis pruebas receipts backend en dos suites aprobadas; después de ajustar el binding del método del ensayo, cuatro pruebas del historial y lint limpio nuevamente aprobados.

## Archivo de compra

- La compra QA confirmada existente responde 200 con application/pdf y no-store. Firma `%PDF-`, 2491 bytes y SHA-256 idéntico al documento conservado para el negocio/origen. Conteos comerciales antes/después iguales. El acceso puede registrar recuperación/generación documental conforme a la API; no se afirma ausencia de escrituras de auditoría/documento.
- Archivo descargado mediante HTTP autorizado: `tmp/pdfs/receipt-api-real-2026-10-12.pdf`.
- Render Poppler 110 dpi: `tmp/pdfs/receipt-api-real-2026-10-12.png`, inspeccionado visualmente. Una página legible con Mercado QA, comprobante interno, referencia, fecha 2026-10-05, Proveedor QA, Canchán QA, dos sacos, 102.000 kg netos e importe bruto/líquido S/255.00, flete/adelantos/descuentos cero y contado. Sin recortes visibles.
- Poppler emitió avisos de fuentes Symbol/ArialUnicode no disponibles; el render mostrado es legible. Pypdf extrajo el texto pero sustituyó ciertos acentos/signos; no se usa esa extracción para certificar accesibilidad ni fidelidad de los glifos. La revisión visual sí muestra los acentos del documento.

Esta evidencia verifica entrega de archivo por la API y su contenido/render. No convierte en exitosa la descarga desde el navegador integrado cuyo evento agotó timeout, ni acredita visor web, venta/despacho Android, TalkBack o convergencia Figma. T612/T613 y la meta global siguen abiertas.
