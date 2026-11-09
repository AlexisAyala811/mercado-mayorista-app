# Plan 011: Diseño MAÑAY en la app

**Estado:** aprobado por el usuario el 5 de noviembre de 2026; en implementación · **Fecha:** 5 de noviembre de 2026 · **Especificación:** [spec 011](spec.md), aprobada el 5 de noviembre de 2026

## Punto de partida

| Pieza actual (`app/src`) | Situación |
| --- | --- |
| `ui/tokens.ts` | Paleta verde anterior (`brand #244234`), espaciado y tipografía propios |
| `ui/visual-theme.tsx` | `MenuVisualTheme` y `PurchaseVisualTheme` con grises tomados del Figma anterior; 48 archivos leen el tema con `useVisualStyles` o importan `tokens` |
| `ui/components/` | 18 componentes compartidos (`AppButton`, `AppCard`, `FormField`, `ScreenHeader`, `StepProgress`…) |
| `features/home/` | Menú con interruptor Compra/Venta y tarjetas `ModuleCard` |
| `features/reception/` | Recepción, pesaje (`sack-entry-row`, `tablet-weighing-workspace`), liquidación y confirmación |
| `features/sync/` | Cola cifrada, `SyncStatusBanner` y `sync-queue-screen`; un `409` ya pasa a conflicto sin reintento |
| `features/administration/` | Autorización y revocación de reemplazos del Encargado |
| `features/inventory/`, `services/api/inventory-api.ts`, rutas `inventory*` | Pantallas de inventario; el backend responde `410 Gone` |
| `features/sales/screens/sales-history-screen.tsx`, `app/home.tsx` | Accesos a devoluciones |
| Pruebas | 602 en 83 suites (Jest con `jest-expo`) |

SUNAT y balanza conectada solo aparecían en las maquetas de Stitch; la app no los tiene.

## Decisiones de diseño

1. **Un solo tema MAÑAY.** `tokens.ts` pasa a los valores de `DESIGN.md`; `MenuVisualTheme` y `PurchaseVisualTheme` quedan como alias del tema MAÑAY para no tocar las 48 pantallas a la vez, y se retiran cuando ninguna pantalla dependa de sus grises.
2. **Contraste comprobado por prueba.** Una prueba calcula la relación de contraste WCAG de cada par de tokens usado para texto (AA ≥ 4,5:1) y de los pares de importes y estados (AAA ≥ 7:1). Si un token de `DESIGN.md` no alcanza el umbral, se oscurece el valor y se registra la diferencia.
3. **Marca en un componente.** `BrandMark` muestra el logo de `assets/brand/manay-logo.png` (CL-MD01) con su texto accesible «MAÑAY»; ninguna pantalla dibuja la marca por su cuenta. El icono de la app Android se genera desde el mismo archivo.
4. **Menú por datos.** Las entradas de Compra, Venta y comunes se describen en una lista con el permiso que exige cada una; el menú filtra con `authorization/permissions.ts`, la misma regla que ya usan las rutas, para que el Encargado vea exactamente lo que el servidor le permite.
5. **Kilos enteros en la captura, tres decimales en el dominio.** El campo acepta solo dígitos; el valor se envía como hoy (`"52"`), el backend sigue validando con tres decimales y los sacos antiguos con decimales se muestran redondeados solo en pantalla.
6. **Lista virtualizada para el pesaje.** Los sacos pasan a `FlatList` con altura de fila fija, totales fijos fuera de la lista y un campo «Ir al saco»; la entrada sigue siendo consecutiva con el teclado numérico.
7. **Retiros sin borrar datos.** Las rutas y pantallas de inventario y devoluciones se eliminan de la app con sus pruebas; el backend conserva sus endpoints y su historial. La cola cifrada sigue leyendo operaciones antiguas de esos tipos para poder descartarlas con motivo.
8. **Comparación con Stitch por pantalla.** Cada pantalla rediseñada se captura en el emulador 1280 × 800 y se compara con su maqueta; las diferencias aceptadas quedan en la verificación.

**Ampliación del 5 de noviembre de 2026 (CL-MD05).** Nueva ruta de solo lectura `GET /purchases/payment-status?receptionIds=…` en el módulo de compras, que ya conoce liquidaciones y cuentas. No se toca el listado de recepciones, para no hacer depender Recepción de Compras ni de Cuentas. Devuelve `{ receptionId, settlementId, state: 'paid' | 'debt' | 'voided', balanceCents }` por cada recepción liquidada del negocio; las no liquidadas o ajenas no aparecen. Es una sola consulta SQL con `LEFT JOIN` a `accounts` por `source_type = 'purchase-settlement'`. La app la pide después de cada página del listado.

## Fases (CL-MD04)

| Fase | Contenido | Depende de |
| --- | --- | --- |
| 1 · Base visual | Tokens MAÑAY, alias de temas, `BrandMark`, componentes compartidos, prueba de contraste | — |
| 2 · Acceso y menú | Inicio de sesión, menú con Compra y Venta visibles y filtro por rol, barra de sincronización; retiro de inventario y de accesos a devoluciones | Fase 1 |
| 3 · Compra | Recepción, pesaje en kilos enteros con lista virtualizada, liquidación con lotes (T1040 de la spec 010), confirmación, Ver compras | Fase 1; PR #10 en `main` para los lotes |
| 4 · Cuentas | Deudas y Cobranzas separadas con sus confirmaciones; estado de cuenta (T940–T944 de la spec 009) | Fase 1 |
| 5 · Resto | Venta, Ver ventas, Carros, Reportes, Analítica, Pendientes de envío y aviso de conflicto, Administración (reemplazos) | Fase 1 |

Cada fase va en su propia rama y PR, con la app verificada en el emulador antes de abrirlo.

## Verificación por fase

| Nivel | Qué |
| --- | --- |
| Automática | `npm run typecheck`, `npm run lint`, `jest --runInBand` (sin regresiones sobre las 602 pruebas) y las pruebas nuevas de cada fase |
| Contraste | La prueba de tokens de la fase 1 se mantiene en verde en todas las fases |
| Emulador | Tablet 1280 × 800 (`Mercado_Tablet_API36`) y 2560 × 1600; teléfono de 360 px de ancho; texto al 200 %; capturas comparadas con Stitch |
| Lector de pantalla | TalkBack en el menú, el pesaje y la liquidación |
| CI | `app-ci.yml` en verde en cada PR |

La compilación Android usa el JDK 17 de Gradle (`~/.gradle/jdks`): el JDK 25 de Android Studio falla al configurar CMake en `react-native-screens` y `react-native-worklets`.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Un token de `DESIGN.md` no alcanza el contraste a pleno sol | La prueba de contraste lo detecta en la fase 1; se ajusta el valor y se registra |
| Cambiar los tokens altera pantallas aún no rediseñadas | Los alias mantienen la estructura; la fase 1 revisa en el emulador todas las pantallas principales |
| Operaciones antiguas de inventario o devolución en la cola de una tablet | La cola las sigue mostrando para descartarlas con motivo |
| Lotes sin backend en `main` | La fase 3 espera a que el PR #10 esté fusionado |
| Diferencias entre la maqueta y las reglas aprobadas | Mandan las reglas (CL-FM); la diferencia se documenta |

## Convergencia con Stitch — 7 de noviembre de 2026

**Estado:** aprobado por el usuario el 7 de noviembre de 2026 («Sí, apruebo») · **Especificación:** [RQ-ST01–RQ-ST09](spec.md#convergencia-con-stitch--7-de-noviembre-de-2026) · **Aclaraciones:** [CL-ST01–CL-ST10](../../docs/sdd/aclaraciones-convergencia-stitch-2026-11-07.md)

### Backend (solo lectura, sin migración)

| Pieza | Diseño | Origen de los datos |
| --- | --- | --- |
| `GET /purchases/history` (módulo de compras) | Mismos filtros que `GET /receptions` (`from`, `to`, `search`, `providerId`, `limit`, `offset`) más `paymentState` (`paid`, `debt`, `voided`, `unsettled`). Cada elemento: recepción (id, fecha, proveedor, etapa), `settlementId`, variedades, sacos, kilos netos, total de la liquidación, pagado, saldo y estado de pago con la regla CL-MD05. Roles: Mayorista y Encargado, como el listado actual | Recepciones, sacos vigentes (sin anulados), última liquidación por recepción y su cuenta `purchase-settlement`, en una consulta con agregados por recepción |
| `GET /purchases/history/summary` | Mismos filtros sin `paymentState`. Devuelve conteos por estado (`all`, `paid`, `debt`, `voided`, `unsettled`) y la suma de total, pagado y saldo | La misma consulta base, agregada |
| `GET /sales` y `GET /sales/summary` (módulo de ventas) | Cada venta suma variedades, sacos, kilos, pagado, saldo y `paymentState` (`paid`, `debt`, `voided`); el listado acepta `paymentState`. El resumen da conteos y sumas como el de compras | Líneas de venta y cuenta `sale` |
| `GET /reports/rows?report=daily` | Un elemento por día del periodo con operaciones, sacos, kilos e importe, en hora de Lima; los días sin operaciones no aparecen. Mismo DTO, roles y límite de periodo que `detail` y `variety` | Las mismas operaciones confirmadas que `detail` |

La regla de estado de pago sigue en `purchase/domain/payment-status.ts`; ventas usa una regla gemela con pruebas propias. Toda consulta filtra por el `businessId` de la sesión. Las pruebas son unitarias para las reglas y e2e en PostgreSQL portable para filtros, conteos, aislamiento por negocio y roles.

### App

| Pieza | Diseño |
| --- | --- |
| `ui/components/app-header.tsx` y `bottom-nav.tsx` | Cabecera (logo, antetítulo, título, usuario) y barra inferior («Atrás», «Menú principal», «Siguiente» opcional). `AppScreen` las recibe por props, así que cada pantalla declara su título y si tiene «Siguiente». Se retiran `ScreenHeader` en las pantallas autenticadas y los botones sueltos «Volver» y «Menú» |
| `features/home` | `menu-modules.ts` suma a cada entrada su número y su ícono de Material Symbols (`expo-symbols`, ya instalado; según Context7, en el SDK 57 `SymbolView` acepta `name.android`). Un `useMenuFacts` pide con conexión el saldo por pagar y por cobrar (`GET /accounts`) y las compras y ventas de hoy (los nuevos resúmenes), y lee la cola local; sin conexión devuelve vacío |
| `purchase-history-screen.tsx` y `sales-history-screen.tsx` | Lista primero: barra con buscador y fecha, filtros con conteo, tres `MetricTile` y tarjetas con los datos nuevos. El filtro por etapa queda en «Más filtros». «Abonar» o «Cobrar» abre la cuenta (`/debts?accountId=` o `/collections?accountId=`) |
| `accounts-overview.tsx` | Tres totales arriba (saldo pendiente; abonado o cobrado en el mes, desde `cash/movements`; vencido, desde `reports/overdue-accounts`), filtros Pendientes / Todos / Al día y «Abonar» o «Registrar cobro», que abre el formulario de pago existente de esa cuenta |
| Confirmación de compra y de venta | Tarjeta de resumen y botones «Compartir comprobante» (flujo actual de comprobantes y Mensajería) y «Nueva compra» o «Nueva venta» |
| `ui/components/bar-chart.tsx` | Barras horizontales con vistas; cada barra lleva su etiqueta y su valor en texto, y un `accessibilityLabel` con ambos |
| `features/reports` | Indicadores y barras por día y por variedad arriba; filtros de precios y descargas debajo |
| `features/analytics` | Pizarra por variedad desde `analytics/series` (8 semanas) y, para el precio sugerido, `analytics/readiness` y `publications`; filtros debajo |

### Fases y ramas

| Fase | Contenido | Rama |
| --- | --- | --- |
| A | Comparación y R1 (hechos) | `docs/011-comparacion-stitch` |
| B | Backend: historial y resúmenes de compras y ventas, informe diario | `feat/011-stitch-backend` |
| C | Cabecera y barra inferior en todas las pantallas; menú con íconos y datos | `feat/011-stitch-navegacion` |
| D | Ver compras, Ver ventas, Deudas y Cobranzas | `feat/011-stitch-listas` |
| E | Confirmaciones, Reportes y Analítica con barras | `feat/011-stitch-consultas` |

Cada fase pasa tipos, lint, pruebas, build y auditoría (backend o app), e2e cuando cambia la API, y se revisa en el emulador a 1280 × 800 y 360 dp con capturas junto a Stitch.

### Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Consultas agregadas lentas con muchas recepciones | Agregados por recepción sobre los índices existentes; prueba e2e con 300 recepciones, como en la spec 002 |
| Cambiar todas las cabeceras rompe pruebas de pantalla | Fase propia (C), con las pruebas actualizadas en el mismo PR |
| El dato vivo del menú queda viejo | Se pide al enfocar el menú; sin conexión se oculta (CL-ST08) |
| «Abonar» desde la lista crea un segundo camino de escritura | Reutiliza el mismo formulario y servicio de pago (CL-ST09) |

### Alternativas descartadas

- Calcular conteos y totales en la app con la página cargada: daría totales parciales (CL-ST04).
- `react-native-svg` para los gráficos: dependencia nueva sin necesidad (CL-ST05).
- Ampliar `GET /receptions`: haría depender Recepción de Compras y Cuentas; el historial vive en el módulo de compras, como `payment-status`.

### Cambios durante la implementación

| Fecha | Cambio | Motivo |
| --- | --- | --- |
| 8 de noviembre de 2026 | La cabecera y la barra inferior viven en `ui/navigation/` (`AppHeader`, `BottomNav`, `AppChromeProvider`, `useBottomNav`, `BottomNavSlots`) y el layout raíz dibuja la barra, en lugar de recibirlas cada `AppScreen` por props | Una sola barra para todas las rutas autenticadas; cada pantalla solo declara lo que cambia. Una pantalla registra sus espacios mientras está enfocada (eventos `focus` y `blur` de la navegación), porque la pila mantiene montadas las anteriores |
| 8 de noviembre de 2026 | En compra y venta el lugar de «Siguiente» lleva el nombre de la acción del paso («Revisar y cerrar pesaje», «Confirmar liquidación», «Revisar y confirmar») | «Siguiente» ocultaría que el paso confirma un hecho comercial; se conserva la posición de Stitch con un nombre honesto |
| 8 de noviembre de 2026 | «Menú principal» también se declara por pantalla cuando hay cambios sin guardar (catálogo, Carros, venta) | Salir al menú pasa por la misma confirmación que «Atrás» |
| 8 de noviembre de 2026 | `ScreenHeader` dibuja `AppHeader`; `level="section"` titula una parte de una pantalla sin repetir el logo | Las 20 pantallas que lo usan heredan la cabecera común sin cambios uno a uno |
| 8 de noviembre de 2026 | El botón «Historial» del flujo de compra desaparece; «Ver compras» sigue en el menú | La barra de Stitch tiene tres lugares: Atrás, Menú principal y el paso |
| 8 de noviembre de 2026 | Los datos vivos del menú salen de los resúmenes de la fase B (`/purchases/history/summary`, `/sales/summary`) y de la cola local; no se usa `GET /accounts` | Una consulta por dato, ya filtrada en el servidor |
| 9 de noviembre de 2026 | «Vencido» de Deudas y Cobranzas suma el saldo de las cuentas cuyo próximo vencimiento ya pasó, con las cuentas que la pantalla ya lee, y no consulta `reports/overdue-accounts` | Un dato menos que pedir; la etiqueta lo dice («Saldo de cuentas con un vencimiento pasado») |
| 9 de noviembre de 2026 | Los totales de caja (entradas, salidas, neto) pasan dentro de la tarjeta «Movimientos de caja» | Stitch pone arriba los totales de la cuenta; los de caja siguen visibles y exactos |
