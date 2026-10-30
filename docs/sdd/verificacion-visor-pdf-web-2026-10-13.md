# Visor PDF web de comprobantes — 13 de octubre de 2026

Este corte corresponde a DS-043 y HU10 de `specs/006-reports-and-receipts`. Sustituye el iframe que aparecía vacío en el navegador integrado por un visor exclusivamente web. Conserva el archivo original, sus datos, la descarga autenticada y los permisos existentes. No modifica el visor Android.

## Implementación

- PDF.js fijado en 6.4.299; importación diferida en `src/services/receipts/pdfjs.web.ts`. El adaptador acepta únicamente URL blob procedentes de la descarga local del comprobante.
- Worker, fuentes, mapas y wasm de la misma versión se copian con el script propio `scripts/copy-pdfjs-assets.mjs` a `public/pdfjs/6.4.299/`. Los recursos se resuelven en el origen de la aplicación; no se envía el documento a un visor remoto o CDN.
- `web-pdf-document.tsx` muestra una página por vez, contador, navegación, zoom, carga, error y reintento. El texto extraído de la página se ofrece en un panel expandible. Los controles se bloquean durante lectura/render.
- Cerrar o reemplazar destruye la tarea documental y cancela el render. Las respuestas tardías se descartan. El enlace de descarga conserva el blob original; no utiliza una imagen del canvas como documento.
- Encabezado adaptable y controles breves en dos filas; enlace de descarga de al menos 52 px y texto del panel con fuente del sistema.

## Evidencia de navegador real

Las capturas corresponden a la sesión QA aislada del 12 de octubre; sus nombres conservan esa fecha. No se presentan como una nueva sesión del día 13.

- `tmp/receipt-pdfjs-tablet-real-2026-10-12.png`: PDF real de compra, una página, visible en 1280 × 720. Se verificó zoom al 125 %. Esta captura precede al ajuste final de etiquetas compactas y altura del enlace.
- `tmp/receipt-pdfjs-phone-real-2026-10-12.png`: versión con controles compactos en 360 × 800, PDF real visible y cierre/descarga/navegación/zoom/panel de texto disponibles. Medición DOM: viewport y documento de 360 px, canvas y contenedor de 313 px, scrollWidth de 313 px; sin desbordamiento horizontal a escala de ajuste.
- El panel expandido mostró el contenido de la compra QA: código, operación, Canchán, líquido, fecha 2026-10-05, dos sacos, 102 kg y S/255.00, con los acentos comprobados en el árbol del navegador. La página A4 ajustada al teléfono requiere zoom o el panel de texto para lectura cómoda.
- Archivo original y entrega HTTP: `docs/sdd/verificacion-http-pdf-comprobantes-2026-10-12.md`. No se crearon usuarios ni se registraron operaciones comerciales para estas verificaciones.

## Construcción y comprobaciones

La exportación final `node node_modules/expo/bin/cli export --platform web` terminó con código cero y 20 rutas estáticas. Incluye el bundle diferido PDF.js, worker, fuentes, mapas y wasm. El SHA-256 del worker exportado coincide con el de `public`; su tamaño es 1 264 342 bytes. Exportar no equivale a publicar ni a probar el runtime de producción.

El día 13, tipos y lint terminaron correctamente. Jest falló inicialmente por EPERM en la carpeta temporal del sandbox; la repetición autorizada fuera del sandbox terminó con código cero: doce pruebas de comprobantes en cuatro suites. Cubren navegación/zoom/texto, reintento tras fallo de carga o render, destrucción de una tarea que llega después del cierre, descarte del error tardío del documento reemplazado y los escenarios de sesión/historial existentes. Son pruebas con adaptadores simulados, no sustituyen los recorridos reales pendientes.

La comprobación reproducible `node scripts/verify-pdfjs-assets.mjs` comparó por SHA-256 los 200 archivos esperados en cada raíz (`public` y `dist`) contra el paquete instalado y comprobó ambos manifiestos. Todos coinciden: `tmp/pdfjs-assets-verification-2026-10-13.json`, 2026-10-13 18:25:08 UTC. Incluye recursos auxiliares/licencias; la cifra no significa 200 fuentes.

## Límites y pendientes

- La navegación de dos páginas se prueba con un documento simulado; el PDF real observado tiene una sola página. Falta documento real multipágina en navegador y ejecución del export servido como producción.
- No se verificó una descarga positiva por el evento del navegador integrado; la API sí entregó y permitió inspeccionar el archivo. No confundir ambos recorridos.
- El panel de texto no acredita PDF etiquetado, orden semántico completo ni prueba con lector de pantalla/TalkBack.
- Venta/despacho, tamaños adicionales y recorridos Android siguen pendientes. El último arranque Android falló con ANR de System UI antes de cargar el frontend; diagnóstico separado en `docs/sdd/diagnostico-arranque-android-logistica-2026-10-12.md`.
- No hay nueva comparación con DS-043 de Figma. T612/T613 y la meta global permanecen abiertas.
