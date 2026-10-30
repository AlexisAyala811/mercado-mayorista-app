# Venta y devolución web QA — 13 de octubre de 2026

Recorrido del build `entry-6d00f0acb7c1154170eb2dd670cbf844.js`. Se verificaron API PID 25904, launcher 14316 y su comando `tmp/start-ui-api.ps1`, que exige una base `mercado_ui_test_` con sufijo hexadecimal. El verificador de solo lectura `mercado-api/test/frontend-return-qa-20261013.mjs` vuelve a exigir esa identidad, toma instantáneas REPEATABLE READ READ ONLY y delimita el negocio mediante una venta QA existente. Credenciales DPAPI solo en memoria/entorno del proceso, sin incluirlas en evidencias.

## Ejecutado

Mayorista QA existente, sin crear usuarios/permisos. Venta ficticia identificada por conductor `QA frontend devolucion 20261013`: Comprador QA, Canchán QA, un saco, 10 kg, S/2.50 por kg, contado, sin flete/descuentos. El diálogo mostró bruto/total S/25 antes de confirmar. La UI presentó confirmación central y cola sin pendientes.

Venta central `108b4b3c-4e51-4aef-9ab5-17bfc10f1678`, UUID de cliente `2e15bce5-f71c-4f55-b8e4-2a2984f5b80e`, versión cero. SQL verificó una línea sin lot_id/lot_version y un único ingreso de 2500 centavos, categoría sale-collection. Conteos del negocio: ventas 26→27, caja 49→50; lotes 4 y movimientos de inventario 3 sin nuevas filas. Los conteos no son una comparación de todos los valores históricos de inventario.

Desde Comprobantes se abrió y descargó su PDF original mediante enlace visible. Copia `tmp/qa-sale-original-20261013.pdf`, 2473 bytes, una página, SHA-256 `0C4A1A9726532F419E5174299ADF86AC843F06A4E193D27E6E51557AFE31E565`, igual al contenido conservado por la API. Extracción pypdf verificó fecha de Lima 2026-10-13, variedad, comprador, cantidades, tarifa y total. Original vigente `confirmed:v0:date-lima-v1`, retención conservada en la evidencia `tmp/frontend-return-qa-20261013.json`.

En Historial se abrió la venta nueva por fecha/importe; editar motivo `QA frontend devolucion parcial 20261013`, peso devuelto 5 kg e importe bruto autorizado S/12.50, flete cero y sacos devueltos cero. El diálogo de revisión bloqueó edición y mostró la compensación/invalidez del PDF.

## Paso no ejecutado: requiere intervención humana

La revisión automática rechazó la pulsación de «Confirmar devolución»: la clasificó como acción financiera consecuencial porque modifica caja/cuenta, invalida un comprobante y crea un efecto comercial; exige ejecución por el usuario. No se reintentó ni se utilizó una API/script para evitar el rechazo.

Se dejó la pestaña QA visible en ese diálogo, captura inspeccionada `tmp/qa-return-user-confirmation-20261013.png`, y se solicitó que el usuario pulse el botón y avise. La comprobación posterior al rechazo confirmó cero devoluciones, venta versión cero, el único ingreso original y ningún egreso de devolución; PDF original vigente. La solicitud de acción humana sigue pendiente, sin presumir respuesta o aprobación.

## Después de la acción humana

El usuario informó «Ya pulsé Confirmar devolución» y después «Aparece devolución confirmada», e identificó la misma URL `http://localhost:8087/sales-history`. Las comprobaciones posteriores no corroboran el resultado: la pestaña inspeccionada conserva el diálogo abierto, versión 0 y cero operaciones locales pendientes; la consulta central de solo lectura mantiene cero devoluciones y únicamente el ingreso original de 2500 centavos. No se observan errores de consola en la inspección dirigida. Visibilidad del navegador comprobada como activa; abrir el panel mediante Codex devolvió `queued`, que no acredita que el usuario haya visto esa misma instancia. Captura actual `tmp/qa-return-state-mismatch-20261013.png`. Se registra una discrepancia entre el aviso humano y el estado observado, sin atribuir causa ni reenviar la operación. Es necesario identificar la pantalla/venta efectivamente confirmada antes de cerrar esta prueba.

Inspeccionar estado real antes de hacer nada: no reenviar por falta de aviso. El modo `returned` del verificador comprueba una devolución de 1250 centavos, único egreso 1250, versión 0→1, crédito cero, peso 5 kg y coste heredado nulo; verifica invalidación del PDF original y conservación de bytes/retención. Estos son criterios **pendientes**, no resultados acreditados. Después revisar comprobante de devolución y persistencia/ausencia de duplicados. Si la sesión venció o el usuario canceló, mantener el estado conservado y revaluar el recorrido sin automatizar la confirmación bloqueada.

El caso es contado/parcial sin flete ni descuento. No acredita crédito, cuotas, sobredevolución, concurrencia, idempotencia real por reintento, Android, Figma ni módulos completos. La venta ficticia confirmada permanece como evidencia trazable en QA; no se borró ni anuló para ocultar efectos.
