# Protección de Atrás web en ventas — 13 de octubre de 2026

El ensayo previo mostró que Atrás desde una entrada del menú abandonaba el detalle sin aviso y Adelante lo reabría sin filtros/borrador. Se reprodujo en una pestaña con historial nuevo. La instrumentación temporal confirmó protección activa y posterior desmontaje sin callback beforeRemove. Con carga directa de la ruta sí se observó RESET y diálogo, pero la URL ya había cambiado. Estos resultados no justifican atribuir el defecto a una única causa interna de Expo.

## Implementación contra el plan 003

`src/navigation/browser-traversal.ts` complementa las guardias de React Navigation con la API pública Navigation, detectada en web. Cancela antes del cambio los eventos traverse cancelables con clave de destino; excluye fragmentos, descargas, otros tipos y eventos no cancelables. Abre el mismo diálogo de descarte. Confirmar continúa hacia esa clave mediante traverseTo, sin duplicar entradas ni modificar estados privados del router. Observa ambas promesas de navegación y muestra fallo recuperable si la reanudación fracasa. La pantalla retira el listener cuando deja de necesitarlo y evita acciones/errores de una sesión desmontada. Android y beforeunload conservan sus mecanismos previos.

Se consultó Context7: resolver MDN Web Docs y dos consultas a `/mdn/content` sobre destino, traverseTo y cancelación. Fuentes oficiales: https://developer.mozilla.org/en-US/docs/Web/API/Navigation/traverseTo y https://developer.mozilla.org/en-US/docs/Web/API/NavigateEvent. La capacidad se detecta en ejecución; no se afirma soporte uniforme en navegadores no probados.

## Verificación ejecutada

- `pwsh -File scripts/verify-frontend-qa.ps1`: código cero, 440 pruebas / 64 suites, tipos, lint, export de 20 rutas, PDF.js 6.4.299 con 200 archivos por raíz iguales a la dependencia instalada. Inicio 2026-10-14T01:34:33Z, fin 01:34:55Z (20:34 de Lima).
- Ocho casos nuevos del adaptador: bloqueo previo al diálogo; destino original después de aprobación; exclusión de eventos no aplicables; retirada/continuidad de sesión; rechazo observado de ambas promesas con un solo aviso. Las regresiones existentes del historial también pasan.
- Build final sin instrumentación: `entry-b1ba98b11f232741b6c300dc91771bfd.js`, SHA-256 `BAF031A245EB2AD2506AF8C5F9EF79DB18746B620F2C95119EE3F5FF9B33C97B`. Chunk PDF sin cambios `pdf-b869ab50fce991455cac98f93fb88cc6.js`. La búsqueda del marcador diagnóstico no encontró coincidencias en fuente ni export.
- API/PostgreSQL/web QA existentes; entrada real desde menú → historial → filtro Comprador QA + Confirmadas → primera venta S/232.50, versión cero → motivo y peso 2.125 editados → Atrás. Apareció el diálogo y **la URL permaneció /sales-history**.
- Cancelar conservó URL, motivo y peso. Un segundo Atrás mostró el aviso otra vez; Descartar continuó al destino original /home. La cola visible siguió sin operaciones pendientes; no se confirmó ninguna mutación comercial.
- Adelante después del descarte reabrió el historial limpio. El ensayo adicional para bloquear Adelante con edición no produjo una travesía observable; no se considera verificado ni se reintentó sin diagnóstico. Sigue abierto su gate real, aunque el adaptador no distingue dirección.
- Captura válida a tamaño normal inspeccionada: `tmp/sales-browser-back-protected-2026-10-13.png`. La captura preliminar con override móvil produjo 360 × 203 y no acredita 360 × 800; no se usa para afirmar validación móvil de este corte. El diálogo móvil del corte previo conserva su propia evidencia.
- Cierre de sesión volvió al login vacío y se restauró el viewport normal.

## Límites abiertos

Adelante con edición y destino real; navegadores sin Navigation API/eventos no cancelables; Android; sesión/carreras reales durante navegación/envío; recuperación central tras confirmación; Figma/accesibilidad global. Revisar los demás formularios que usan únicamente usePreventRemove antes de afirmar protección web transversal. Este corte corrige el Atrás reproducido en QA, no cierra 003 ni el frontend completo.
