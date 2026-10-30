# Identificación accesible de operaciones del historial

HU11, planes 002/003 y reglas de accesibilidad del proyecto. El texto visual «Abrir detalle» se conserva; el nombre accesible añade compra/venta, participante, fecha e identificador central. Las ventas muestran la fecha de Lima con el formateador existente. No cambia permisos, consultas, saldos ni guardas de formularios.

## Verificación

- Cuarenta y dos pruebas de historiales aprobadas: `tmp/history-a11y-tests-20261026.log`. Tipos y lint posteriores con código cero.
- Exportación `web-export-history-a11y-20261026`, recursos PDF.js verificados y activación con respaldo. 280 archivos cotejados: `tmp/history-a11y-web-activation-20261026.json`.
- Con sesión QA real, Compras y Ventas muestran 27 operaciones, veinte en la primera página. Cada conjunto tiene veinte nombres accesibles distintos; varias operaciones comparten participante y fecha. Evidencia DOM: `tmp/history-purchase-a11y-20261026.json` y `tmp/history-sales-a11y-20261026.json`.
- Abrir la recepción `0261c947-7813-4745-bf93-9d080be48b14` muestra proveedor y fecha esperados, estado Borrador, versión cero y ningún saco. Solo lectura: no se continuó el pesaje ni se anuló.
- Historial de ventas a 360 × 800: documento de ancho 360, sin desplazamiento horizontal. Captura `tmp/history-sales-phone-20261026.png`. Tamaño temporal restaurado.

Esto acredita nombres en el árbol accesible web, no lectura efectiva con TalkBack ni revisión global de accesibilidad.

## Entorno Android revalidado

Inventario nativo del 26/10: ningún proceso de emulador observado. SDK instalado Callstack agent-device 0.21.22. Descubrimiento local informa daemon registrado PID 23116 no disponible; lectura nativa confirma ausencia de ese proceso. La recuperación oficial `daemon stop` responde `not-running`, `cleanupConfidence: known`, sin reclamaciones y `clean: false`. `device status --stale` devuelve lista vacía. Esta versión solo admite `daemon stop`; no soporta `daemon status`.

No se borraron registros de propiedad ni se cerraron procesos ajenos. No hay un arranque Android pendiente acreditado. Se requiere resolver la recuperación oficial del registro antes de nuevos recorridos nativos. Fuentes consultadas por Context7: [API del cliente](https://github.com/callstack/agent-device/blob/main/website/docs/docs/client-api.md) y [recuperación de arranque](https://github.com/callstack/agent-device/blob/main/website/docs/docs/installation.md).
