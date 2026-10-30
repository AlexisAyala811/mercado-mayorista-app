# Deudas y Comprobantes: altura adaptable y recorridos web

La inspección posterior a Carros confirmó el mismo defecto en dos pantallas a 360 × 800: `flex: 0` sobre una columna reducía la base de los paneles a cero. Deudas dejaba contraparte, referencia, fechas y saldo fuera del fondo; Comprobantes superponía datos y botones. Se conserva el diseño compacto y se explicitan `flexBasis: auto` y `flexShrink: 0` en los paneles correspondientes. No cambian saldos, operaciones, permisos ni contratos.

## Evidencia

- 75 pruebas/11 suites de cuentas/comprobantes, TypeScript y lint aprobados: `tmp/accounts-receipts-compact-check-20261021.log`.
- Paquete vigente `web-export-finance-documents-compact-20261021`, que incluye también los cambios anteriores de Reportes y Carros. Exportación correcta, recursos PDF.js verificados y 280 archivos cotejados con respaldo: `tmp/finance-documents-compact-activation-20261021.json`.
- Recarga autenticada del paquete en Deudas: nombre, referencia, fechas y saldo dentro de los paneles. Capturas antes/después `tmp/accounts-phone-before-20261021.png` y `tmp/accounts-phone-after-20261021.png`.
- Detalle de la cuenta QA existente: importe inicial S/50, saldo S/0, estado Anulada; confirmación de cobro deshabilitada. Búsqueda inexistente muestra vacío; caja conserva entradas S/3019, salidas S/845 y neto S/2174. Limpiar recupera la cuenta. No se registró ningún pago/cobro/reverso.
- Comprobantes muestra datos completos antes de los botones: `tmp/receipts-phone-before-20261021.png` y `tmp/receipts-phone-after-20261021.png`. Compra vigente del 5 de octubre, S/255: vista previa PDF renderizada a 360 × 800; `tmp/receipts-phone-pdf-20261021.png`.
- Descarga real desde el visor: `C:/Users/ASUS/Downloads/comprobante (2).pdf`, 2533 bytes, cabecera `%PDF-` comprobada. Solo se consultó/descargó el documento existente.
- Paginación real de ventas: 27 operaciones, 20 en primera página y 7 en segunda. Segunda página deshabilita Siguiente, habilita Anteriores y conserva documentos invalidados deshabilitados. Se regresó a primera página.
- DOM de Comprobantes: viewport/documento 360, controles medidos de al menos 44 px; `tmp/receipts-phone-dom-20261021.json`. Tamaño del navegador restaurado.

## Límites

Cuenta observada anulada, sin confirmar cobros. No se acredita un recorrido financiero positivo nuevo, todos los tipos PDF, documento multipágina, lector de pantalla ni compartición Android. La revisión visual nueva de Figma sigue limitada por cuota; estos cambios corrigen defectos de layout verificados en la implementación existente. Permanecen abiertos los gates globales 004/006 y la meta completa.
