# Composición y recorrido de Reportes

Fecha local: 21 de octubre de 2026. Referencia MERCADO 98:304 y descendientes; reglas de la propuesta aprobada del 17 de octubre. No cambian actores ni alcance comercial.

Barra de usuario real, regreso, Compra/Venta, presentación y periodo compuestos con variantes acotadas de los componentes existentes. Márgenes de Figma en ancho grande; controles apilados y texto sin truncar en teléfono. Se conservan los filtros de precios adicionales de la especificación.

Usuario 98:308 se recuperó con contexto, captura y export original. Code Connect no ofrece importación utilizable; se extendió OriginalUserIcon. Metadata y PNG confirman 54 × 54, aunque el fragmento indica size 48. Archivo `mercado-app/assets/figma/original/user/report-instance.png`, 825 bytes. Los siete SVG originales se conservan: regreso 20, calendario/desplegable/búsqueda 18, documento 20, consulta/descarga 16.

## Evidencia

- Suite completa: 534 pruebas/75 suites, tipos y lint aprobados; `tmp/frontend-report-composition-final-20261021.log`.
- Prueba unitaria de paginación: Modal aislado con el patrón existente del proyecto. Su carga nativa agotaba 5 s y contaminaba casos posteriores. Se mantienen las comprobaciones de paginación, reintento, vacío y respuesta tardía; timeout sin ampliar. Primer resultado: `tmp/frontend-report-composition-check-20261021.log`.
- Revisión a 360 × 800 detectó superposición de descripción/conteo por flex con base cero. Corregido el contenedor compacto. Cuatro pruebas focalizadas, tipos y lint posteriores aprobados: `tmp/reports-compact-layout-check-20261021.log`; render corregido confirmado.
- Paquete vigente `web-export-reports-verified-layout-20261021`: exportación correcta, 200 recursos PDF.js verificados, 280 archivos cotejados con respaldo y activos previos conservados; `tmp/reports-verified-layout-activation-20261021.json`.
- Login QA y consulta reales: octubre tiene 2 compras, S/505, 4 sacos y 202 kg; ventas 4, S/2679, 35 sacos y 1709 kg. Cambiar operación descarta resultados previos. Mes anterior elige 1–30 septiembre y devuelve cero operaciones. Fecha inicial posterior a final muestra validación; Restablecer permite consultar octubre nuevamente.
- PDF de resumen de compras renderizado con valores coincidentes. Descarga Excel real por el botón: `C:/Users/ASUS/Downloads/reporte-purchase-detail-2026-10-01-2026-10-21.xlsx`, 8652 bytes, estructura XLSX y ZIP íntegros.
- Revisadas pantallas a 1440 × 1061 y 360 × 800. DOM móvil final en `tmp/reports-final-phone-dom-20261021.json`: documento/viewport 360, 18 slots de imágenes cargados, controles medidos de al menos 44 px. Dimensiones efectivas SVG y Usuario inspeccionadas. Tamaño del navegador restaurado.

Capturas finales: `tmp/reports-verified-wide-20261021.png`, `tmp/reports-verified-phone-20261021.png`; PDF en `tmp/reports-composition-pdf-20261021.png`. La captura anterior `reports-composition-phone` conserva el defecto corregido y no representa el paquete vigente.

## Límites

Se acredita la composición y los recorridos web descritos. Permanecen abiertos Android, TalkBack, texto ampliado nativo, PDF multipágina, compartición nativa y los gates de otros módulos. No se confirmaron operaciones comerciales ni devoluciones durante esta revisión. El objetivo completo del frontend permanece activo.
