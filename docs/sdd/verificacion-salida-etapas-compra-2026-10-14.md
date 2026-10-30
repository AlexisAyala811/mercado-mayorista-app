# Protección de salida de pesaje y liquidación — 14 de octubre de 2026

## Brecha y cambio

La ruta de Compra protegía la retirada del navegador solo en datos iniciales. Pesaje y liquidación tenían advertencia para los botones internos, pero no conectaban esa decisión con `usePreventRemove` ni con la guardia web compartida. Se amplía la condición a peso, tara no nula o corrección abierta en pesaje, términos de liquidación distintos de los iniciales, y escrituras ocupadas en ambas etapas. No se modifica la composición Figma en este corte.

El diálogo específico conserva la edición al cancelar. Descartar ejecuta el callback original de navegación, tanto para la acción nativa como para el recorrido web cancelable; los accesos internos siguen usando su destino de menú/historial. Durante escritura no se presenta una salida ejecutable. beforeunload también cubre estas etapas. Sacos centrales y órdenes persistidas permanecen intactos; no se declara recuperación de esta edición tras cerrar el proceso.

## Evidencia ejecutada

- TypeScript y lint, código cero.
- Suite enfocada de Compra: 34 pruebas aprobadas. Seis casos nuevos cubren ambas etapas recuperadas: salida sin edición, cancelación/descarte de la acción nativa original y reanudación explícita del recorrido web. Las cancelaciones conservan peso o precio y no encolan ninguna escritura.
- Suite completa: **452 pruebas / 66 suites**, código cero.
- Context7 resolvió Expo y devolvió documentación de la API nueva de SDK 58. No se trasladó `repeat()` al SDK 57 instalado: se inspeccionaron `expo-router/build/react-navigation/core/usePreventRemove.js` y `.d.ts`, que confirman el callback `{data:{action}}` y el despacho vigente en esta aplicación.
- Export web aislado: 20 rutas, `tmp/web-export-purchase-stages-20261014`, código cero. Entry `entry-f76325e21c3fac40d1cecb5822e441d5.js`, SHA-256 `B423A29665F0D385E633FF912FCAEC5B055A0978B5DBC93DC4476EAD691C0C0C`.
- Integridad PDF 6.4.299: 200 archivos por raíz, hashes iguales a la dependencia instalada, 2026-10-14T14:06:26Z.

## Preparación QA y límite del recorrido real

Al revalidar el navegador solo existía una pestaña de error de conexión en `/home`; las pestañas anteriores de devolución y analítica ya no estaban disponibles en el inventario. No se atribuye causa ni se vuelve a enviar la devolución. No había listeners en 3000/8087/55437 ni proceso PostgreSQL antes del arranque. Se reanudaron los servicios con el launcher guardado que exige la base aislada `mercado_ui_test_` y credencial DPAPI solo en memoria. Logs `tmp/qa-api-20261014.log` y `tmp/qa-web-20261014.log`.

Solo `purchase-flow.html` y `purchase-history.html` se actualizaron al export nuevo, con copias anteriores `tmp/purchase-flow-before-stages-20261014.html` y `tmp/purchase-history-before-stages-20261014.html`. Assets con nombres por contenido se compararon antes de copiar; no se sustituyeron ni borraron los anteriores. El dist sigue siendo un corte QA mixto; las demás rutas no se acreditan con este bundle.

La recuperación de la pestaña de error/navegación fue rechazada por la política de seguridad del navegador, que informó protocolo no permitido aunque el destino solicitado era HTTP. No se intentó otro navegador, llamada indirecta ni vía alternativa para evitar el rechazo. Por tanto, **no está acreditado el recorrido real de estas etapas**, ni existe captura nueva de la protección en pantalla. Requiere recuperar acceso normal del navegador y ejecutar cancelar/descarte con una recepción existente sin escrituras comerciales.

Android, Adelante real, navegadores sin recorrido cancelable, lector de pantalla, Figma y el resto de T214/T215/T218 permanecen pendientes. Las pruebas con adaptadores no cierran esos requisitos ni el objetivo completo.
