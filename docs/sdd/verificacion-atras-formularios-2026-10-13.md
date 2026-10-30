# Atrás web compartido en formularios — 13 de octubre de 2026

Se extendió el adaptador de historial de ventas mediante `src/navigation/use-browser-traversal-guard.ts` a venta nueva, datos iniciales de compra y logística. Cada pantalla mantiene su condición de edición/bloqueo, diálogo y descarte ya especificados; el hook solo registra la guardia web cuando es necesaria. Continúa por la clave original del historial tras aprobación. El listener se retira al desactivar la guardia y los errores tardíos no se publican después del desmontaje. Un fallo de reanudación todavía se informa si la aprobación desactivó la guardia pero la pantalla continúa montada.

No se modifican dinero, API, roles, captura duradera, cola ni efectos comerciales. El hook comparte la implementación del adaptador ya documentado en `verificacion-atras-web-ventas-2026-10-13.md`; la detección de Navigation API y eventos cancelables conserva sus límites.

## Verificación ejecutada

La primera suite mostró 443 casos aprobados pero terminó con código uno por un mock parcial de React Native que provocó inicialización diferida de Expo durante cierre de Jest. Ese resultado no se considera verde. Se retiró el mock parcial, limitando la preparación a Platform.OS y restaurando sus propiedades; la prueba enfocada y luego la ejecución integrada terminaron correctamente.

`pwsh -File scripts/verify-frontend-qa.ps1`, 2026-10-14T01:44:10Z–01:44:33Z (20:44 de Lima): tipos, lint, **443 pruebas / 65 suites**, export web de 20 rutas e integridad PDF.js 6.4.299 (200 archivos por raíz public/dist) aprobados con código cero. Los tres casos nuevos cubren registro/retirada y repetición aprobada; error después de desactivar la guardia; error tardío después de desmontar.

| Build QA en `dist/_expo/static/js/web` | SHA-256 |
|---|---|
| `entry-6d00f0acb7c1154170eb2dd670cbf844.js` | `6C6FCF71CE1E14F2CAB9212BBE5C1D317EEE3A07ABE1EA1264818E4E570BB45B` |
| `pdf-f163e6ba0343f88cfe80060b1bd0976c.js` | `DA2BDDC10D636CF7C471D78207A2734A50F82926204905CF2D8AA42D52B13D9C` |

## Recorridos reales del mismo build

API/PostgreSQL/web QA existentes, acceso mediante la cuenta Mayorista previamente creada, sin nuevos usuarios ni permisos.

- **Logística:** desde menú, editar nombre de transportista nuevo y placa del vehículo nuevo. Atrás abrió «¿Salir de logística?» antes de cambiar /logistics. Cancelar conservó ambos textos; un segundo intento y Salir sin guardar continuó a /home. No se pulsó Registrar/Actualizar/Desactivar. Captura inspeccionada `tmp/logistics-browser-back-2026-10-13.png`.
- **Compra inicial:** desde menú, editar Conductor sin crear recepción. Atrás abrió el aviso y conservó /purchase-flow. Cancelar mantuvo el conductor; segundo intento y descarte volvió al menú. Reabrir Compras mostró Conductor vacío, comprobando limpieza del borrador local. No se continuó al pesaje ni se encoló captura.
- **Venta nueva:** desde menú Venta → Ventas, editar Departamento de destino. Atrás abrió «¿Salir de la venta?» y conservó /sale-flow. Cancelar mantuvo el texto (confirmado mediante DOM, que ya no contenía el diálogo); segundo intento y Salir sin guardar volvió al menú. No se revisó/confirmó venta. Captura inspeccionada `tmp/sale-flow-browser-back-2026-10-13.png`.
- Cola visible sin pendientes durante los recorridos. Cierre de sesión devolvió login sin credenciales visibles. Tamaño normal del navegador; estas capturas no acreditan teléfono o Android.

## Límites

Los recorridos anteriores acreditan Atrás en el navegador QA para los tres formularios indicados. Historial mantiene sus regresiones y el recorrido real del corte anterior, pero no se repitió su ensayo manual después de extraer el hook. Adelante con edición/destino real, navegadores sin Navigation API o evento no cancelable, cierre/recarga externos, mutaciones en curso reales, Android y accesibilidad/Figma permanecen abiertos. La salida inicial de compra no prueba pesaje ni liquidación. No se cierran los módulos completos por este corte.
