# Verificación del diseño MAÑAY, fase 2: acceso y menú

**Fecha:** 4 de noviembre de 2026 · **Especificación:** [spec 011, T1110–T1113](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-fase2-acceso-menu`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1110 | El acceso muestra `BrandMark` (112 px en tablet, 72 px en teléfono), el título «MAÑAY» como encabezado y el subtítulo «Gestión comercial de papa». Desaparece la etiqueta «MERCADO». Los colores fijos de `login-screen` y `form-field` pasan a los tokens (`brandMuted`, `textSecondary`, `border`) |
| T1111 | `features/home/menu-modules.ts` describe cada entrada con su sección, su ruta y su permiso. El menú muestra a la vez **Compra** (Anote, Ver compras, Carros, Flete y estiba), **Venta** (Ventas, Ver ventas) y **Gestión** (Deudas y cobranzas, Pendientes de envío, Reportes, Analítica, Comprobantes, Mensajería, Usuarios y reemplazos, Auditoría), sin pestañas. Se filtra con `canAccessModule`, la misma regla que usan las rutas: el Encargado ve el mismo menú solo con Anote, Ventas y Pendientes de envío (CL-FM02). Se retira `reference-home-screen` |
| T1112 | La barra de sincronización ya usaba los tokens. Con la fase 1 toma los colores MAÑAY sin cambios de código |
| T1113 | Se eliminan las rutas `inventory` e `inventory-adjustment`, sus pantallas, `inventory-api` y sus pruebas. «Ver ventas» abre el detalle sin devoluciones: el ajuste de flete por devolución, los campos por línea y «Confirmar devolución comercial» solo aparecen con `allowReturns`, que ninguna ruta activa (CL-FM13). «Anular venta» se mantiene. La cola conserva las operaciones antiguas `inventory.adjustment` y `sale.return` para comprobarlas y descartarlas (`retired-contract.ts`) |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 611 pruebas en 84 suites |
| `tests/auth/manay-menu.test.tsx` | Tres secciones visibles para el Mayorista, sin pestañas; cada entrada abre su propia ruta; Encargado con Anote, Ventas y Pendientes de envío; cierre de sesión y estado vacío; sin inventario, catálogo ni devoluciones |
| `tests/sales/sales-history.test.tsx` | Las pruebas de devolución existentes pasan con `allowReturns`; una prueba nueva comprueba que por defecto no hay controles de devolución |
| `tests/sync/sync-provider.test.tsx`, `sync-banner.test.tsx` | Operaciones antiguas de devolución e inventario recuperadas sin reenviarlas; barra en verde |
| `tests/ui/contrast.test.ts` | Par nuevo: tinte de la marca sobre la marca (subtítulo del acceso), AAA |
| Búsqueda en `src/app` y `src/features/home` | Sin referencias a inventario ni a devoluciones en la navegación |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | Acceso con el logo y el panel verde; inicio de sesión del Mayorista; menú con Compra, Venta y Gestión y la barra «Datos sincronizados»; «Ver ventas» abre el historial |

## Observaciones

- En una ejecución en paralelo con el emulador y Metro activos fallaron por tiempo cuatro pruebas de reportes y recepción, distintas en cada intento. En serie, como indica el proyecto, pasan todas.
- «Analítica» usaba las mismas iniciales que «Anote» (AN); pasa a AL.
- No se comparó píxel a píxel con Stitch: la revisión fue visual sobre las capturas del emulador.

## Pendiente

- Revisión del Encargado con reemplazo vigente en el emulador (hoy cubierta por pruebas).
- Teléfono de 360 px, texto al 200 % y TalkBack (T1150).
