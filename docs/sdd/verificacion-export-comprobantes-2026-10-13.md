# Exportación web conectada y comprobantes — 13 de octubre de 2026

Alcance: login/navegación de 001 y lectura de comprobantes de 006 desde la exportación estática, con API y PostgreSQL QA reales. Se usó el Mayorista QA existente y la base nombrada y aislada del flujo UI. No se crearon actores, permisos, compras, ventas ni pagos. El acceso al PDF sí genera/recupera documentos y auditoría conforme al contrato.

## Configuración y servidor

El primer build abría el login pero no incorporaba EXPO_PUBLIC_API_URL; mostraba «La dirección de la API no está configurada». Expo sustituye esas variables durante la construcción. Se añadió `mercado-app/scripts/export-web.mjs` y `npm run export:web`, que exigen URL explícita HTTP/HTTPS con `/api/v1`, sin credenciales, query ni fragmento. El ensayo sin variable terminó con código uno antes de exportar. La exportación QA usa temporalmente `http://localhost:3000/api/v1`; no es una dirección productiva y el entorno del comando se restaura al terminar.

Referencia oficial consultada mediante Context7: https://github.com/expo/expo/blob/main/docs/pages/eas/environment-variables/usage.mdx. Las variables EXPO_PUBLIC son públicas y no deben contener secretos.

El servidor genérico de Python/Windows entregaba el worker `.mjs` como `text/plain`. El auxiliar `mercado-app/scripts/serve-web-export.py` fija MIME JavaScript/wasm, resuelve las rutas HTML exportadas, evita listar directorios y escucha exclusivamente en 127.0.0.1:8087. HEAD verificó `/receipts` 200 text/html, worker 200 text/javascript y wasm 200 application/wasm. Este auxiliar es para QA local, no despliegue productivo.

El navegador seguía recibiendo 200 text/plain para el URL previo del worker, sin una nueva petición en el log del servidor corregido. La solicitud con revisión `?v=6.4.299` produjo una nueva petición 200 y el MIME correcto. Esto es consistente con reutilización de la respuesta anterior; no se inspeccionaron internamente las cachés del navegador/broker para atribuirlo con mayor precisión.

El adaptador solicita ese worker local sin credenciales, con `cache: reload` y timeout de doce segundos; rechaza MIME incorrecto. Ejecuta los mismos bytes en un blob local y lo libera al destruir la tarea o si falla crearla. Se retiraron todos los logs temporales de diagnóstico. No se cambió ninguna política del navegador, ni se utilizó visor remoto/CDN.

## Recorrido real

- Login contra API QA, menú del Mayorista y apertura de Comprobantes desde Más operaciones.
- Historial real: dos compras y 26 ventas, acciones de anuladas deshabilitadas. Ventas página 2 muestra seis registros; Compras conserva su propia página 1.
- Recarga directa de `/receipts`: HTML y revalidación de sesión funcionan desde el servidor estático corregido.
- Compra QA del 5 de octubre: PDF real de S/255.00, dos sacos y 102 kg. Visor tablet 1280 × 800 con zoom 125 % y texto expandido; teléfono 360 × 800 con lectura del texto y documento visible.
- Medición móvil a escala de ajuste: viewport/documento 360 px, canvas/contenedor/scrollWidth 313 px. No hay desbordamiento horizontal; el A4 reducido requiere zoom o panel de texto para lectura cómoda.
- Venta vigente de la segunda página: PDF de S/232.50, tres sacos, 150 kg y S/1.55 por kg. Se abrió después de cerrar la compra, reutilizando el recorrido sin perder la página del historial.
- Cierre del visor, retorno al menú y cierre de sesión dejan el login con campos vacíos. Se restableció el tamaño del navegador.

Capturas inspeccionadas: `tmp/receipt-export-tablet-2026-10-13.png` (compra con zoom/texto, antes de retirar logs), `tmp/receipt-export-phone-2026-10-13.png` (build final de compra), `tmp/receipt-sale-lima-export-phone-2026-10-13.png` (venta corregida). `tmp/receipt-sale-export-phone-2026-10-13.png` conserva el ensayo anterior con fecha incoherente; no acredita corrección.

## Fecha civil y conservación

La venta del historial del 7 de octubre inicialmente mostraba Fecha 2026-10-08 dentro del PDF: `createdAt.toISOString().slice(0,10)` usaba UTC. Se corrigieron las proyecciones de venta y devolución comercial para America/Lima. Compras mantienen la fecha civil registrada de recepción. Las proyecciones corregidas usan sufijo `:date-lima-v1` para regenerar sin sobrescribir bytes/hash anteriores; el mecanismo existente invalida la versión previa, conserva su retención y audita la nueva generación.

Después de compilar/reiniciar exclusivamente la API QA, el PDF real de venta mostró Fecha 2026-10-07, coherente con el título y el historial. Script de comprobación SQL de solo lectura: `mercado-api/test/receipt-lima-preservation.mjs before|after`. Evidencia `tmp/receipt-lima-preservation-2026-10-13.json`: de uno a dos documentos; contenido/hash/tamaño/retención original conservados y estado/versión/importe de la venta sin cambios. La prueba real cubre venta; devolución comercial queda probada únicamente en la función común de fecha/versionado y revisión de sus llamadas, pendiente de recorrido de documento real.

## Comprobaciones y límites

- Frontend final: tipos y lint correctos; 17 pruebas de comprobantes en cinco suites aprobadas. Incluyen fetch local sin credenciales, rechazo de MIME/URI remota, liberación tras error de creación/destrucción, sesión, lectura, reemplazo y reintento. El import real de PDF.js se comprueba en navegador; el ensayo del adaptador inyecta la biblioteca simulada porque Jest no ejecutaba su import ESM directamente.
- Exportación final QA: código cero, veinte rutas; entrada `entry-babedd2eb8d1d4221052f1cafffae0a8.js` y PDF diferido `pdf-b869ab50fce991455cac98f93fb88cc6.js`. Una exportación intermedia encontró EPERM al escribir `dist/assets/node_modules`; su repetición autorizada fuera del sandbox terminó correctamente.
- Los 200 archivos de cada raíz public/dist coinciden por SHA-256 con PDF.js 6.4.299 instalado; verificador reproducible aprobado otra vez a 2026-10-13 19:33:39 UTC.
- Backend: compilación y lint aprobados; diez pruebas de receipts en tres archivos, incluidos 04:59:59/05:00:00 UTC y cambio de año en Lima.

Esta evidencia supera los pendientes de login/configuración y lectura de compra/venta desde el export servido en QA. No acredita despliegue público, descarga por el evento del navegador, PDF real multipágina, despacho/devolución real, Android, lector de pantalla/TalkBack ni equivalencia Figma. T612/T613 y la meta completa del frontend siguen abiertas.
