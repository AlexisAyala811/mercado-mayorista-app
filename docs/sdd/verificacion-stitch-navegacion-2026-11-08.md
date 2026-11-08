# Verificación de la convergencia con Stitch, fase C: navegación y menú

**Fecha:** 8 de noviembre de 2026 · **Tareas:** [T1164 y T1165 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Plan:** [sección del 7 de noviembre y sus cambios durante la implementación](../../specs/011-manay-app-design/plan.md#convergencia-con-stitch--7-de-noviembre-de-2026) · **Rama:** `feat/011-stitch-navegacion`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1164 (B2, B3) | `ui/navigation/app-header.tsx`: cabecera común con logo, antetítulo, título y usuario. `ScreenHeader` la dibuja, así que la reciben las 20 pantallas que lo usan; Deudas, Cobranzas, Carros, Reportes y la compra (`PurchaseReferenceHeader`) usan `AppHeader` directamente. `level="section"` titula una parte de pantalla sin repetir el logo |
| T1164 (B2) | `ui/navigation/bottom-nav.tsx` y `app-chrome.tsx`: barra fija en todas las rutas autenticadas salvo el menú, con «Atrás» (pantalla anterior o, si no hay, el menú) y «Menú principal». Una pantalla declara con `useBottomNav` o `BottomNavSlots` otro «Atrás» (paso anterior, cerrar un detalle), su salida al menú con confirmación de cambios sin guardar (catálogo, Carros, venta) y la acción del paso en el lugar de «Siguiente» («Revisar y cerrar pesaje», «Confirmar liquidación», «Revisar y confirmar»). Solo habla la pantalla enfocada; una parte que no declara nada no borra la barra de la pantalla que la contiene |
| T1164 | Se retiran los «Volver», «Menú», «Volver al menú», «Volver a deudas/cobranzas», «Volver al historial» y «Cancelar» de 15 pantallas; los botones internos de modales y subvistas («Volver a liquidación», «Volver a evaluaciones», «Volver al formulario») se mantienen. La paginación de Carros pasa a «Página anterior» y «Página siguiente» |
| T1165 (B1) | Tarjetas del menú con número (01, 02…), ícono de Material Symbols (`expo-symbols`, sin dependencia nueva) y una línea viva: «N hoy» en Ver compras y Ver ventas, «Por pagar S/ X» en Deudas, «Por cobrar S/ X» en Cobranzas y el estado de la cola en Pendientes de envío. Los datos salen de `/purchases/history/summary` y `/sales/summary` (fase B) y se piden cada vez que el menú se enfoca; una consulta que falla oculta solo su línea (CL-ST08) |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 662 pruebas en 95 suites |
| `tests/ui/app-chrome.test.tsx` | «Atrás» vuelve o va al menú sin pantalla anterior; «Menú principal»; paso declarado con su estado deshabilitado; una parte sin declaración no borra la barra; al desmontar vuelve la barra por defecto; cabecera con logo, título como encabezado y usuario |
| `tests/home/menu-facts.test.tsx` | Línea viva de cada tarjeta; conteos de hoy sin anuladas; sin conexión se oculta solo la línea que falló; el menú del Encargado no pide datos; tarjeta con número, ícono y línea leída por el lector de pantalla |
| Pruebas de pantalla existentes | Las que presionaban los botones retirados ahora presionan la barra (`tests/shared/with-chrome.tsx`) |
| Emulador 1280 × 800 | Menú con íconos, números y «3 hoy», «2 hoy», «Por cobrar S/ 1950.00», «Sin pendientes» ([Compra](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-menu-compra.png), [Venta y Gestión](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-menu-venta-gestion.png)); cabecera y barra en [Cobranzas](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-cobranzas.png), [Carros](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-carros.png) y [Nueva venta](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-venta.png); en el [pesaje de 250 sacos](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-pesaje.png) la barra lleva «Revisar y cerrar pesaje» y [abre la confirmación del cierre](../../img/verificacion-stitch-navegacion-2026-11-08/tablet-pesaje-cerrar.png) |
| Emulador, teléfono de 360 dp | [Menú](../../img/verificacion-stitch-navegacion-2026-11-08/telefono-menu.png) en una columna; en la [venta](../../img/verificacion-stitch-navegacion-2026-11-08/telefono-venta.png) la barra pasa a dos filas sin cortar texto |

## Observaciones

- La barra resta unos 70 dp de alto en la tablet de 1280 × 800; el contenido sigue desplazándose sobre ella.
- Las pruebas con la suite completa en serie pasaron; en una corrida bajo carga falló por tiempo una prueba de venta que pasa sola y en dos corridas seguidas de su carpeta, como ya se había observado en la fase 2.
- Sin TalkBack: el emulador no lo tiene (ver la [verificación en el emulador](verificacion-emulador-manay-2026-11-07.md)).
