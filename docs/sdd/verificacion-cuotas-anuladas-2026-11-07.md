# Verificación de cuotas anuladas en la app y cierre de tareas del frontend MAÑAY

**Fecha:** 7 de noviembre de 2026 · **Especificaciones:** [spec 004](../../specs/004-accounts-cash-freight-and-stowage/tasks.md) y las secciones «Impacto del frontend MAÑAY» de las specs 002, 003, 004, 005 y 007 · **Rama:** `fix/004-cuotas-anuladas`

## Cuotas anuladas

El backend marca como `voided` las cuotas de una compra o venta a crédito anulada desde la migración 027 (29 de octubre de 2026). La app no conocía ese estado: el tipo `Installment` solo admitía `open` y `paid`, y el detalle mostraba «Cerrado por anulación» o «Pagado» según el estado de la cuenta.

| Cambio | Detalle |
| --- | --- |
| `services/api/operations-api.ts` | `Installment.state` admite `voided` |
| `domain/accounts/installment-label.ts` | Una cuota anulada, o de una cuenta anulada antes de la migración 027, se lee «Anulada». Una abierta, «Pendiente». Una saldada, «Pagada» en Deudas o «Cobrada» en Cobranzas |
| `accounts-screen.tsx` | El detalle de la cuenta usa esa regla para cada vencimiento |

| Verificación | Resultado |
| --- | --- |
| `tests/accounts/installment-label.test.ts` | Anulada en los dos tipos de cuenta y con datos anteriores a la migración; pendiente, pagada y cobrada |
| `tests/accounts/accounts-screen.test.tsx` | Una venta a crédito anulada muestra sus dos cuotas como «Anulada» en Cobranzas, sin «Cobrada» ni «Pagado» |
| `npm run typecheck`, `npm run lint`, `npm test -- --runInBand` | Sin errores; suite completa en verde |

No se revisó en el emulador: la regla es solo de texto y está cubierta por las pruebas de pantalla.

## Tareas del frontend MAÑAY que ya estaban hechas

Las secciones «Impacto del frontend MAÑAY» del 4 de noviembre de 2026 quedaron abiertas mientras se implementaba la spec 011. Se cierran con la evidencia de cada fase.

| Spec | Tarea | Evidencia |
| --- | --- | --- |
| 002 | Bruto y tara en kilos enteros; lista para 200 sacos o más con «Ir al saco» y totales fijos | [Fase 3](verificacion-manay-fase3-2026-11-04.md), T1121–T1122 |
| 003 | Sin devolución comercial en la app; «Anular» solo para el Mayorista | [Fase 2](verificacion-manay-fase2-2026-11-04.md), T1113: «Ver ventas» sin devoluciones, y el Encargado no tiene acceso a «Ver ventas» |
| 004 | «Deudas» y «Cobranzas» separadas, cada una con su confirmación de guardado | [Fase 4](verificacion-manay-fase4-2026-11-06.md), T1130 |
| 004 | Sin devoluciones; anulación de compras solo para el Mayorista, con motivo (CL-FM14) | [Fase 2](verificacion-manay-fase2-2026-11-04.md): «Ver compras» es un módulo solo del Mayorista y la anulación exige motivo; el backend aplica `@Roles(UserRole.Wholesaler)` |
| 005 | «Pendientes de envío» con estado, reintento y descarte con motivo | [Fase 5](verificacion-manay-fase5-2026-11-06.md), T1142; la pantalla pide «Motivo del descarte» antes de confirmar |
| 005 | Aviso de conflicto ante `409` sin reintento automático | [Fase 5](verificacion-manay-fase5-2026-11-06.md), T1142; [lotes en la cola](verificacion-lotes-app-2026-11-06.md), `409` en revisión sin reenvío |
| 007 | Precios sugeridos solo con disponibilidad; si no, «datos insuficientes» con sus condiciones | [Fase 5](verificacion-manay-fase5-2026-11-06.md), T1141 |

## Siguen abiertas

Las tareas de verificación en dispositivo, lector de pantalla y Figma de cada spec, y en especial T944 y T1150, necesitan una tablet o un teléfono reales.
