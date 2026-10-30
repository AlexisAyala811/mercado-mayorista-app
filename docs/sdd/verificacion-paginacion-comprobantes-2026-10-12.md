# Historial paginado de comprobantes — 12 de octubre de 2026

La pantalla ya no usa únicamente la primera página de ventas/recepciones ni consulta cada liquidación por separado. Consume GET `/receipts/history/purchases|sales`, con páginas de veinte, offsets independientes, total central y controles anteriores/siguientes. El listado compra consulta liquidaciones confirmadas/anuladas directamente; no depende de que la recepción siga en estado settled. Ambos historiales muestran fecha civil, importe exacto, contraparte histórica, referencia y disponibilidad del documento.

El endpoint exige Mayorista en guards y servicio, delimita cada consulta por negocio, valida tipo y paginación en el controlador y usa REPEATABLE READ para página/conteo. Máximo cien por consulta; orden creación/UUID descendentes. No lee inventario, genera documentos ni escribe datos comerciales. Los nombres se unen por ID y negocio, incluyendo contraparte desactivada. Abrir PDF sigue usando el ID del origen y su autorización original.

Frontend conserva página al cerrar visor, retira resultados y respuestas tardías al cambiar página y deshabilita navegación durante preparación de documento. Una página vacía fuera del inicio se denomina «en esta página» y permite regresar; no declara ausencia de todo el historial.

## Evidencia

- Tipos/lint backend y frontend correctos; compilación backend correcta.
- Cinco pruebas de receipts backend en dos suites; siete pruebas frontend de receipts en tres suites. Nuevo recorrido frontend llega a offset 100/documento 101, conserva offset de compras y abre el ID correcto.
- `mercado-api/test/receipt-history-pages.mjs`: 101 liquidaciones y 101 ventas sintéticas en tablas temporales, transacción real REPEATABLE READ con rollback. Páginas 20/20/20/20/20/1, 101 IDs únicos por tipo, aislamiento, contraparte desactivada, anuladas visibles, fecha Lima en borde UTC 04:59:59 y importe 9007199254740993 preservado como texto. Sin escrituras públicas, usuarios ni permisos nuevos. Evidencia `tmp/receipt-history-pages-2026-10-12.json`, 2026-10-13 00:11:07 UTC (12 de octubre en Lima). El servicio compilado usa un adaptador pg sobre la transacción externa; no se presenta como ensayo del pool TypeORM.
- API propia actualizada tras verificar dueño de PID/puerto. Recorrido web real: dos compras en página 1, 26 ventas con páginas 20/6. Pasar Ventas a página 2 mantiene Compras en 1; anuladas sin acciones y vigentes con acciones. Captura `tmp/receipt-history-page-two-2026-10-12.png` inspeccionada. Volver/cerrar sesión comprobados, campos finales vacíos. Sin generación de PDF ni mutaciones comerciales en este corte.

## Pendientes

Validación HTTP negativa explícita de tipo/límite/offset y permisos de nuevo listado; recorrido Android, visor/descarga web positiva y Figma. Los criterios >100 están verificados en componente/PostgreSQL aislado; el navegador real se verificó con los 26 registros existentes, sin añadir datos persistentes. T612/T613 y la meta global permanecen abiertos.
