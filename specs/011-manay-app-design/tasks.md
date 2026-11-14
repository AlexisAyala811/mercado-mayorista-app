# Tareas 011: Diseño MAÑAY en la app

**Especificación:** [spec 011](spec.md) · **Plan:** [plan 011](plan.md) · **Estado:** plan aprobado el 5 de noviembre de 2026; fase 1 implementada; fase 2 pendiente

Cada tarea se marca `[x]` solo con evidencia enlazable. Cada fase va en su propia rama y PR.

## Fase 1 · Base visual

- [x] **T1101** Tokens MAÑAY de `DESIGN.md` en `ui/tokens.ts` (colores, Inter, espaciado, radios, estados pagado y deuda). *Verificación:* tipos y suite sin regresiones. **Hecho.** Evidencia: [verificación de la fase 1](../../docs/sdd/verificacion-manay-fase1-2026-11-05.md).
- [x] **T1102** Prueba de contraste WCAG de los pares de tokens: texto AA ≥ 4,5:1; importes, saldos y estados AAA ≥ 7:1. *Verificación:* prueba en verde; valores ajustados registrados. **Hecho:** 14 pares; todos los valores de `DESIGN.md` pasaron sin ajustes. Evidencia: [verificación de la fase 1](../../docs/sdd/verificacion-manay-fase1-2026-11-05.md).
- [x] **T1103** `MenuVisualTheme` y `PurchaseVisualTheme` como alias del tema MAÑAY. *Verificación:* capturas de las pantallas principales en el emulador sin textos ilegibles ni cortes. **Hecho:** capturas de acceso y nueva recepción; el menú se rehace en T1111. Evidencia: [verificación de la fase 1](../../docs/sdd/verificacion-manay-fase1-2026-11-05.md).
- [x] **T1104** Componente `BrandMark` con el logo de `assets/brand/manay-logo.png` y texto accesible «MAÑAY»; icono de la app Android desde el mismo archivo. *Verificación:* prueba de componente y captura del icono en el emulador. **Hecho:** también icono de Android y pantalla de inicio con el isotipo. Evidencia: [verificación de la fase 1](../../docs/sdd/verificacion-manay-fase1-2026-11-05.md).
- [x] **T1105** Componentes compartidos con el estilo MAÑAY y objetivos táctiles de 48 px. *Verificación:* pruebas de componente y revisión en emulador. **Hecho.** Evidencia: [verificación de la fase 1](../../docs/sdd/verificacion-manay-fase1-2026-11-05.md).

## Fase 2 · Acceso y menú

- [x] **T1110** Inicio de sesión MAÑAY. *Verificación:* captura comparada con Stitch; pruebas de acceso actuales en verde. **Hecho.** Evidencia: [verificación de la fase 2](../../docs/sdd/verificacion-manay-fase2-2026-11-04.md).
- [x] **T1111** Menú con Compra y Venta visibles, entradas descritas con su permiso y filtradas por rol y reemplazo. *Verificación:* pruebas del menú para Mayorista y Encargado con y sin reemplazo vigente; captura comparada con Stitch. **Hecho:** captura del Mayorista en el emulador; el Encargado se cubre con pruebas. Evidencia: [verificación de la fase 2](../../docs/sdd/verificacion-manay-fase2-2026-11-04.md).
- [x] **T1112** Barra de sincronización con el estilo MAÑAY. *Verificación:* pruebas actuales de la barra en verde. **Hecho:** ya usaba los tokens; sin cambios de código. Evidencia: [verificación de la fase 2](../../docs/sdd/verificacion-manay-fase2-2026-11-04.md).
- [x] **T1113** Retirar rutas, pantallas, servicio y pruebas de inventario; quitar accesos a devoluciones. La cola sigue mostrando operaciones antiguas de esos tipos para descartarlas. *Verificación:* búsqueda sin referencias a inventario ni devoluciones en la navegación; prueba de la cola con una operación antigua. **Hecho.** Evidencia: [verificación de la fase 2](../../docs/sdd/verificacion-manay-fase2-2026-11-04.md).

## Fase 3 · Compra

- [x] **T1120** Recepción con el estilo MAÑAY. *Verificación:* captura comparada con Stitch. **Hecho:** cabecera, navegación, pesaje y liquidación con los tokens; capturas del emulador. Evidencia: [verificación de la fase 3](../../docs/sdd/verificacion-manay-fase3-2026-11-04.md).
- [x] **T1121** Pesaje: bruto y tara en kilos enteros, neto por saco. *Verificación:* pruebas del campo (acepta 52, rechaza 52,5) y del envío. **Hecho.** Evidencia: [verificación de la fase 3](../../docs/sdd/verificacion-manay-fase3-2026-11-04.md).
- [x] **T1122** Pesaje con lista virtualizada, totales fijos e «Ir al saco» para 200 sacos o más. *Verificación:* prueba con 250 sacos; recorrido en emulador. **Hecho:** 250 sacos en prueba y en emulador. Evidencia: [verificación de la fase 3](../../docs/sdd/verificacion-manay-fase3-2026-11-04.md).
- [x] **T1123** Liquidación con lotes de `settlement-groups` (T1040 de la spec 010). *Verificación:* las de T1040. **Hecho:** lotes iguales a `settlement-groups` y confirmados por el servidor. Evidencia: [verificación de la fase 3](../../docs/sdd/verificacion-manay-fase3-2026-11-04.md).
- [x] **T1124** Confirmación y Ver compras con estado pagado o deuda. *Verificación:* capturas y pruebas actuales en verde. **Hecho:** la confirmación muestra lotes y flete (fase 3) y «Ver compras» el estado pagado o deuda (T1126). Evidencia: [verificación del estado de pago](../../docs/sdd/verificacion-manay-estado-pago-2026-11-05.md).
- [x] **T1125** Backend: `GET /purchases/payment-status` según CL-MD05 (DTO con hasta 100 UUID, `@Roles` de Mayorista y Encargado, filtro por `businessId`). *Verificación:* pruebas unitarias de la regla y e2e en PostgreSQL portable con contado, crédito con saldo, crédito pagado, anulada y recepción de otro negocio. **Hecho.** Evidencia: [verificación del estado de pago](../../docs/sdd/verificacion-manay-estado-pago-2026-11-05.md).
- [x] **T1126** App: estado y saldo en «Ver compras» con los colores de estado y sin depender de la conexión. *Verificación:* pruebas de pantalla y captura en el emulador. **Hecho.** Evidencia: [verificación del estado de pago](../../docs/sdd/verificacion-manay-estado-pago-2026-11-05.md).

## Fase 4 · Cuentas

- [x] **T1130** Deudas (a proveedores) y Cobranzas (de compradores) como pantallas separadas, cada una con su confirmación de guardado. *Verificación:* pruebas de navegación y capturas comparadas con Stitch. **Hecho:** rutas /debts y /collections con textos y confirmaciones propios. Evidencia: [verificación de la fase 4](../../docs/sdd/verificacion-manay-fase4-2026-11-06.md).
- [ ] **T1131** Botón «Estado de cuenta» del comprador y su pantalla (T940–T944 de la spec 009). *Verificación:* las de T940–T944. **Parcial:** T940–T943 hechas; falta T944 (envío real y accesibilidad en dispositivo). Evidencia: [verificación de la fase 4](../../docs/sdd/verificacion-manay-fase4-2026-11-06.md).

## Fase 5 · Resto

- [x] **T1140** Venta y Ver ventas con el estilo MAÑAY. *Verificación:* capturas y pruebas actuales en verde. **Hecho:** ya usaban los tokens; revisadas en el emulador. Evidencia: [verificación de la fase 5](../../docs/sdd/verificacion-manay-fase5-2026-11-06.md).
- [x] **T1141** Carros, Reportes y Analítica (precios sugeridos solo con datos suficientes). *Verificación:* capturas comparadas con Stitch; prueba del estado «datos insuficientes». **Hecho:** Carros rehecho con los tokens; cabecera y botón de Reportes; Analítica ya cubría «datos insuficientes». Evidencia: [verificación de la fase 5](../../docs/sdd/verificacion-manay-fase5-2026-11-06.md).
- [x] **T1142** Pendientes de envío y aviso de conflicto con el estilo MAÑAY. *Verificación:* pruebas actuales de la cola en verde, incluido el `409` sin reintento. **Hecho:** ya usaban los tokens; 409 en revisión probado. Evidencia: [verificación de la fase 5](../../docs/sdd/verificacion-manay-fase5-2026-11-06.md).
- [x] **T1143** Administración de reemplazos con el estilo MAÑAY. *Verificación:* pruebas actuales en verde. **Hecho:** reemplazo por duración desde ahora, máximo 24 horas, sin fechas ISO. Evidencia: [verificación de la fase 5](../../docs/sdd/verificacion-manay-fase5-2026-11-06.md).

## Convergencia

- [ ] **T1150** Verificación en tablet 1280 × 800 y 2560 × 1600, teléfono de 360 px, texto al 200 % y TalkBack; comparación final con Stitch; lista de convergencia y estado de la spec. **Parcial (7 de noviembre de 2026):** en el emulador, las quince rutas a 1280 × 800, 2560 × 1600, 360 dp y texto al 200 %; corregidos la cabecera y la tarjeta de cuenta del teléfono y los pasos al 200 %. Comparación con Stitch hecha el mismo día ([comparación](../../docs/sdd/comparacion-stitch-manay-2026-11-07.md)); sus brechas quedaron cerradas el 9 de noviembre de 2026 con T1160–T1171 ([cierre](../../docs/sdd/verificacion-stitch-consultas-2026-11-09.md)). Faltan TalkBack en un dispositivo real (no está en la imagen del emulador) y la lista de convergencia. Evidencia: [verificación en el emulador](../../docs/sdd/verificacion-emulador-manay-2026-11-07.md).

## Orden y dependencias

```text
T1101 → T1102 → T1103 → T1104 → T1105
                                   ├→ Fase 2 (T1110–T1113)
                                   ├→ Fase 3 (T1120–T1124; T1123 requiere el PR #10 en main)
                                   ├→ Fase 4 (T1130–T1131)
                                   └→ Fase 5 (T1140–T1143)
                                                    → T1150
```

## Convergencia con Stitch — 7 de noviembre de 2026

Especificación: [RQ-ST01–RQ-ST09](spec.md#convergencia-con-stitch--7-de-noviembre-de-2026) · Plan: [sección del 7 de noviembre](plan.md#convergencia-con-stitch--7-de-noviembre-de-2026)

- [x] **T1160** Comparación con las 16 pantallas de Stitch y retiro del resto de devoluciones en Reportes (R1). *Verificación:* documento de comparación; prueba que falla con el código anterior y pasa con el nuevo. **Hecho:** [comparación con Stitch](../../docs/sdd/comparacion-stitch-manay-2026-11-07.md); `tests/reports/reports-without-inventory.test.tsx` («does not mention returns…») falla sin el cambio y pasa con él; 654 pruebas en 93 suites.
- [x] **T1161** Backend: `GET /purchases/history` y `/summary` con la regla CL-MD05. *Verificación:* pruebas unitarias y e2e (filtros, conteos, otro negocio, roles, 300 recepciones). **Hecho:** [verificación de la fase B](../../docs/sdd/verificacion-stitch-backend-2026-11-07.md), `test/stitch-history.e2e-spec.ts` en PostgreSQL portable.
- [x] **T1162** Backend: datos de pago y resumen en `GET /sales`. *Verificación:* pruebas unitarias y e2e. **Hecho:** [verificación de la fase B](../../docs/sdd/verificacion-stitch-backend-2026-11-07.md), `test/stitch-history.e2e-spec.ts` en PostgreSQL portable.
- [x] **T1163** Backend: `report=daily` en `/reports/rows`. *Verificación:* e2e con operaciones en tres días y cambio de día en hora de Lima. **Hecho:** [verificación de la fase B](../../docs/sdd/verificacion-stitch-backend-2026-11-07.md), `test/stitch-history.e2e-spec.ts` en PostgreSQL portable.
- [x] **T1164** App: cabecera y barra inferior en todas las pantallas autenticadas (B2, B3). *Verificación:* pruebas de navegación; capturas de las quince rutas a 1280 × 800 y 360 dp. **Hecho:** [verificación de la fase C](../../docs/sdd/verificacion-stitch-navegacion-2026-11-08.md).
- [x] **T1165** App: menú con número, ícono y dato vivo (B1). *Verificación:* pruebas con y sin conexión; captura junto a Stitch. **Hecho:** [verificación de la fase C](../../docs/sdd/verificacion-stitch-navegacion-2026-11-08.md).
- [x] **T1166** App: Ver compras y Ver ventas con lista, filtros con conteo, totales y «Abonar» (B5). *Verificación:* pruebas de pantalla; captura junto a Stitch. **Hecho:** [verificación de la fase D](../../docs/sdd/verificacion-stitch-listas-2026-11-09.md).
- [x] **T1167** App: Deudas y Cobranzas con totales arriba, filtros y «Abonar» (B6). *Verificación:* prueba del pago desde la tarjeta con idempotencia; captura junto a Stitch. **Hecho:** [verificación de la fase D](../../docs/sdd/verificacion-stitch-listas-2026-11-09.md).
- [x] **T1168** App: confirmación de compra y venta con resumen y compartir (B4). *Verificación:* pruebas; captura junto a Stitch. **Hecho:** [verificación de la fase E y cierre](../../docs/sdd/verificacion-stitch-consultas-2026-11-09.md).
- [x] **T1169** App: componente de barras y Reportes con indicadores y barras (B7). *Verificación:* pruebas del componente y de la pantalla; captura. **Hecho:** [verificación de la fase E y cierre](../../docs/sdd/verificacion-stitch-consultas-2026-11-09.md).
- [x] **T1170** App: Analítica con pizarra de 8 semanas (B8). *Verificación:* pruebas con y sin datos suficientes; captura. **Hecho:** [verificación de la fase E y cierre](../../docs/sdd/verificacion-stitch-consultas-2026-11-09.md).
- [x] **T1171** Verificación final en el emulador y comparación actualizada. *Verificación:* documento con capturas de cada pantalla junto a su maqueta. **Hecho:** [verificación de la fase E y cierre](../../docs/sdd/verificacion-stitch-consultas-2026-11-09.md).

```text
T1160
T1161 ─┬→ T1166 ─┐
T1162 ─┘         │
T1163 ──→ T1169 ─┤
T1164 → T1165 ───┼→ T1171
T1167 ───────────┤
T1168 ───────────┤
T1170 ───────────┘
```

## Igualdad con Stitch — 9 de noviembre de 2026

Especificación: [RQ-ST10–RQ-ST14](spec.md#igualdad-con-stitch--9-de-noviembre-de-2026) · Plan: [sección del 9 de noviembre](plan.md#igualdad-con-stitch--9-de-noviembre-de-2026)

- [x] **T1180** Tokens tomados de las maquetas y su prueba de contraste. *Verificación:* `tests/ui/contrast.test.ts`. **Evidencia (9 nov 2026):** [verificación de la igualdad con Stitch, fase F](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-f--colores-menú-y-acceso-t1180t1182).
- [x] **T1181** Menú con interruptor Compra / Venta, seis tarjetas por lado y «Más opciones». *Verificación:* pruebas por rol; captura junto a las dos maquetas del menú. **Evidencia (9 nov 2026):** [verificación de la igualdad con Stitch, fase F](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-f--colores-menú-y-acceso-t1180t1182).
- [x] **T1182** Acceso con operadores recientes y «Mantener estación activa». *Verificación:* pruebas del almacenamiento local y del acceso; captura junto a la maqueta. **Evidencia (9 nov 2026):** [verificación de la igualdad con Stitch, fase F](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-f--colores-menú-y-acceso-t1180t1182).
- [x] **T1183** Compra en una pantalla con cuadrícula, lotes, tabla, flete, resumen y «Guardar compra». *Verificación:* pruebas del flujo, de la cola y de 250 sacos; captura junto a las dos maquetas de registro de compra. **Evidencia (9 nov 2026):** [fase G](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-g--compra-en-una-pantalla-t1183); 250 sacos solo con pruebas de componente.
- [x] **T1184** Venta igual a «Anote de venta». *Verificación:* pruebas de venta; captura. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1185** Ver compras, Ver ventas, Deudas y Cobranzas iguales a sus maquetas. *Verificación:* capturas. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1186** Carros con botón flotante. *Verificación:* captura. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1187** Reportes de compras y de ventas iguales a sus maquetas. *Verificación:* pruebas; capturas. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1188** Analítica igual a su maqueta. *Verificación:* pruebas; captura. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1189** Guardado igual a su maqueta. *Verificación:* captura. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1191** Cabecera y barra inferior de Stitch en todas las pantallas, con el estado de sincronización en la cabecera, y tamaños de letra de las maquetas (CL-ST18). *Verificación:* pruebas de la cabecera, la barra y la sincronización; capturas. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, fase H](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#fase-h--cabecera-barra-y-resto-de-pantallas-t1184t1189-t1191).
- [x] **T1192** Anote de compra igual a la maqueta «registro de compra multilotes, tablet 2» (CL-ST20). *Verificación:* pruebas de la hoja de compra y del cálculo por lote; compra real en el emulador. **Evidencia (10 nov 2026):** [verificación de la igualdad con Stitch, anote de compra](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#anote-de-compra-t1192-10-de-noviembre-de-2026).
- [ ] **T1193** Revisión pantalla por pantalla contra cada maqueta de Stitch (CL-ST21). Hecho el 10 nov 2026: acceso, menú (Compra y Venta), Ver compras, Ver ventas, la compra, Deudas, Cobranzas y la venta (CL-ST22, CL-ST23; lote inicial CL-ST24 y teclado y fecha CL-ST25, ventana del lote CL-ST26 y mejoras en la compra CL-ST27 y compra igual a la venta CL-ST28 el 12 nov 2026; simulación completa de la compra CL-ST29 y Ver compras CL-ST30, Analítica CL-ST31, Ver ventas CL-ST32, Reportes de ventas CL-ST33 el 13 nov 2026), con [evidencia](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#revisión-pantalla-por-pantalla-t1193-10-de-noviembre-de-2026). Pendiente: Carros, Reportes de compras y de ventas, Analítica y Guardado exitosamente.; Reportes de compras (CL-ST34, 13 nov, pendiente de verificar en emulador)
- [x] **T1190** Comparación final de las 16 maquetas con sus capturas en 1280 × 800, teléfono y texto al 200 %. *Verificación:* documento con capturas lado a lado. **Evidencia (10 nov 2026):** [verificación en teléfono y con texto al 200 %](../../docs/sdd/verificacion-stitch-igual-2026-11-09.md#t1190--teléfono-y-texto-al-200--10-de-noviembre-de-2026); TalkBack no verificado.
