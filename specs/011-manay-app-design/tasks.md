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

- [ ] **T1130** Deudas (a proveedores) y Cobranzas (de compradores) como pantallas separadas, cada una con su confirmación de guardado. *Verificación:* pruebas de navegación y capturas comparadas con Stitch.
- [ ] **T1131** Botón «Estado de cuenta» del comprador y su pantalla (T940–T944 de la spec 009). *Verificación:* las de T940–T944.

## Fase 5 · Resto

- [ ] **T1140** Venta y Ver ventas con el estilo MAÑAY. *Verificación:* capturas y pruebas actuales en verde.
- [ ] **T1141** Carros, Reportes y Analítica (precios sugeridos solo con datos suficientes). *Verificación:* capturas comparadas con Stitch; prueba del estado «datos insuficientes».
- [ ] **T1142** Pendientes de envío y aviso de conflicto con el estilo MAÑAY. *Verificación:* pruebas actuales de la cola en verde, incluido el `409` sin reintento.
- [ ] **T1143** Administración de reemplazos con el estilo MAÑAY. *Verificación:* pruebas actuales en verde.

## Convergencia

- [ ] **T1150** Verificación en tablet 1280 × 800 y 2560 × 1600, teléfono de 360 px, texto al 200 % y TalkBack; comparación final con Stitch; lista de convergencia y estado de la spec.

## Orden y dependencias

```text
T1101 → T1102 → T1103 → T1104 → T1105
                                   ├→ Fase 2 (T1110–T1113)
                                   ├→ Fase 3 (T1120–T1124; T1123 requiere el PR #10 en main)
                                   ├→ Fase 4 (T1130–T1131)
                                   └→ Fase 5 (T1140–T1143)
                                                    → T1150
```
