# Plan 011: Diseño MAÑAY en la app

**Estado:** borrador pendiente de aprobación (`plan`) · **Fecha:** 5 de noviembre de 2026 · **Especificación:** [spec 011](spec.md), aprobada el 5 de noviembre de 2026

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
3. **Marca en un componente.** `BrandMark` muestra el logo cuando llegue (CL-MD01) y, mientras tanto, «MAÑAY» en texto; ninguna pantalla dibuja la marca por su cuenta.
4. **Menú por datos.** Las entradas de Compra, Venta y comunes se describen en una lista con el permiso que exige cada una; el menú filtra con `authorization/permissions.ts`, la misma regla que ya usan las rutas, para que el Encargado vea exactamente lo que el servidor le permite.
5. **Kilos enteros en la captura, tres decimales en el dominio.** El campo acepta solo dígitos; el valor se envía como hoy (`"52"`), el backend sigue validando con tres decimales y los sacos antiguos con decimales se muestran redondeados solo en pantalla.
6. **Lista virtualizada para el pesaje.** Los sacos pasan a `FlatList` con altura de fila fija, totales fijos fuera de la lista y un campo «Ir al saco»; la entrada sigue siendo consecutiva con el teclado numérico.
7. **Retiros sin borrar datos.** Las rutas y pantallas de inventario y devoluciones se eliminan de la app con sus pruebas; el backend conserva sus endpoints y su historial. La cola cifrada sigue leyendo operaciones antiguas de esos tipos para poder descartarlas con motivo.
8. **Comparación con Stitch por pantalla.** Cada pantalla rediseñada se captura en el emulador 1280 × 800 y se compara con su maqueta; las diferencias aceptadas quedan en la verificación.

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
