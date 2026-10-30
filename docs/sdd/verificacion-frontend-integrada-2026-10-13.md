# Verificación integrada del frontend — 13 de octubre de 2026

Ejecución real de `pwsh -File scripts/verify-frontend-qa.ps1` desde `mercado-app`, por la vía habitual de revisión fuera del sandbox. El límite anterior dejó de impedir esta ejecución. Inicio 2026-10-14T01:20:22Z, fin 01:20:49Z (20:20 del 13 de octubre en Lima), código cero.

- TypeScript estricto y ESLint: correctos.
- Jest: 432 pruebas aprobadas en 63 suites. Incluye los casos de borrador de ventas, recuperación de detalle tras confirmación y respuesta exitosa/error tardíos después de cambiar sesión; también los adaptadores PDF añadidos después de la suite histórica de 415.
- Expo Web: 20 rutas exportadas para la API QA local explícita. Las rutas antiguas de inventario son redirecciones y no restituyen ese alcance.
- Recursos PDF.js 6.4.299: 200 archivos por raíz `public` y `dist`; hashes iguales a la dependencia instalada. Comprobación real a 01:20:49Z.

## Paquete de QA generado

| Archivo en `mercado-app/dist/_expo/static/js/web` | SHA-256 |
|---|---|
| `entry-ade3fb17f0e89f978df71f8f0556c9da.js` | `43DAF1DC32C9243D14DF462597BCE11FC7EA6D98E8D5B105FE31D89CEC1B5199` |
| `pdf-b869ab50fce991455cac98f93fb88cc6.js` | `2091C53D9831C980100D1DF6A9B6B0766784DC5F1483E838640D4CF3A22C8C79` |

Estos archivos sustituyen el export previo para las siguientes pruebas locales. No constituyen publicación productiva, build Android, recorrido comercial positivo ni prueba de semejanza con Figma. El auxiliar restaura la variable de API previa y se detiene al primer fallo; no inicia servicios ni modifica datos comerciales.

## Integración pendiente

Tras la interrupción, la web QA rechazó conexión y no había listeners en 3000/55437/8087. Se recuperaron los auxiliares existentes; se observaron PostgreSQL y web escuchando en loopback. La API tiene un proceso hijo de su launcher confirmado, pero ese hecho por sí solo no acredita readiness ni login. Los recorridos del build nuevo, descarga de PDF, Android, accesibilidad y convergencia Figma siguen pendientes. Las pruebas anteriores contra servicios reales conservan su alcance histórico.

## Recorrido real posterior del mismo build

API 25904 terminó su arranque; web 20032 y PostgreSQL 7984 seguían escuchando. Login de la cuenta QA existente mostró Mayorista y cola sin operaciones pendientes. Historial real de comprobantes: dos compras y 26 ventas; documentos invalidados deshabilitados.

Compra QA del 5 de octubre: visor PDF renderizado, descarga mediante el enlace visible «Descargar PDF» y la operación documentada `downloadMedia` del navegador. Archivo recibido `C:/Users/ASUS/Downloads/comprobante.pdf`, 2491 bytes, una página; copia de evidencia `tmp/receipt-browser-download-2026-10-13.pdf`, SHA-256 `304B52B9AC6295E6880B91575F23B86B2D77DD119E66D624AAEA30EE11D36EEB`. Lectura del archivo con pypdf verificó fecha, proveedor QA, variedad, 2 sacos, 102.000 kg y S/255.00, con caracteres acentuados correctos. Captura del visor inspeccionada: `tmp/receipt-browser-download-preview-2026-10-13.png`. Esto acredita descarga del archivo por el enlace, no el diálogo nativo de guardado, otros comprobantes ni documento multipágina.

Historial de ventas: búsqueda «Comprador QA» + Confirmadas devolvió tres ventas. La primera conservó S/232.50, estado Confirmada y versión cero. Editar motivo y peso 2.125 y pulsar Volver al historial abrió el aviso; Cancelar conservó ambos valores, y Descartar edición volvió a los mismos filtros/tres resultados. La segunda venta de S/2250.00 abrió con motivo vacío y cantidades/flete cero, sin heredar la edición. No se pulsó ninguna confirmación comercial. Captura a 360 × 800 inspeccionada: `tmp/sales-draft-discard-phone-2026-10-13.png`, con texto y ambos botones completos.

**Fallo abierto:** editando el motivo de la segunda venta, Atrás del navegador volvió al menú sin aviso. La protección del botón interno está verificada, pero el gate de salida por historial del navegador no lo está. No declarar salida protegida completa por los mocks de `usePreventRemove`. Se consultó Context7 (resolver React Navigation, luego `/websites/reactnavigation`) y el código instalado de Expo Router: el enlace web utiliza resetRoot para historial; la documentación limita el hook a remociones controladas por navegación y recomienda beforeunload para salida del documento. Esto orienta la investigación, pero no acredita todavía la causa ni una corrección. Fuentes oficiales: https://reactnavigation.org/docs/use-prevent-remove y https://reactnavigation.org/docs/preventing-going-back.

Al terminar, cierre de sesión real volvió al login sin credenciales visibles; tamaño de navegador restaurado. Android, Figma, fallo/reintento central real y mutaciones comerciales completas siguen pendientes. No se cambia alcance para cerrar el defecto de Atrás web.
