# Verificación de la convergencia con Stitch, fase D: listas y cuentas

**Fecha:** 9 de noviembre de 2026 · **Tareas:** [T1166 y T1167 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-stitch-listas`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1166 (B5) | `features/history/commercial-history-list.tsx`, común a Ver compras y Ver ventas: buscador, desde y hasta arriba; filtros Todas, Pagadas o Cobradas, Con deuda, Sin liquidar (solo compras) y Anuladas con el conteo del servidor; total, pagado o cobrado y saldo del filtro; una tarjeta por operación con variedades, sacos y kilos, total, estado y saldo. Una compra o venta con deuda ofrece «Abonar» o «Cobrar», que abre Deudas o Cobranzas con `?sourceId=` en la cuenta de esa operación. Al volver del detalle se conservan la búsqueda, el filtro y la página. Las anuladas y las no liquidadas no muestran pago |
| T1166 | Ver compras lee `GET /purchases/history`; Ver ventas, los datos nuevos de `GET /sales`. Se retiran la consulta `payment-status` por página y su insignia (`domain/reception/payment-status.ts`) |
| T1167 (B6) | Deudas y Cobranzas: arriba, deuda pendiente o saldo por cobrar, abonado o cobrado en el mes (pagos de caja de esa clase, menos sus reversos) y vencido (saldo de cuentas con un vencimiento pasado), calculados con `domain/accounts/account-totals.ts` a partir de las cuentas y la caja que la pantalla ya lee. Filtros Pendientes, Todas, Al día y Anuladas con su conteo; cada cuenta abierta ofrece «Abonar» o «Registrar cobro», que abre el formulario de pago existente con el importe enfocado. Los totales de caja (entradas, salidas y neto) pasan a la tarjeta «Movimientos de caja» |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 663 pruebas en 96 suites |
| `tests/history/commercial-history-list.test.tsx` | Abre con lista, conteos y totales; «Abonar» solo con deuda; filtro en el servidor sin volver a pedir totales; búsqueda con fechas; fecha inexistente sin consulta; error distinto de vacío y reintento; totales no disponibles sin conexión; respuesta tardía ignorada; páginas y restauración del estado |
| `tests/shared/history-cards.test.ts` | Etiquetas por estado, filtros en el orden de Stitch, tarjetas de compra y venta, venta anulada sin saldo, totales de cuentas con pagos del mes menos reversos y sin mezclar cobros con pagos |
| `tests/accounts/accounts-screen.test.tsx` | Totales arriba, filtros con conteo, «Abonar» abre el pago con el importe enfocado, `sourceId` abre la cuenta o avisa que no existe |
| Emulador 1280 × 800 | [Ver compras](../../img/verificacion-stitch-listas-2026-11-09/ver-compras.png) con «Todas 4 · Pagadas 1 · Con deuda 1 · Sin liquidar 1 · Anuladas 1» y totales S/ 780.00, S/ 360.00 y S/ 420.00; [tarjetas](../../img/verificacion-stitch-listas-2026-11-09/ver-compras-tarjetas.png); [«Abonar» abre la deuda con el importe listo](../../img/verificacion-stitch-listas-2026-11-09/abonar-desde-ver-compras.png); [Deudas](../../img/verificacion-stitch-listas-2026-11-09/deudas.png), [Cobranzas](../../img/verificacion-stitch-listas-2026-11-09/cobranzas.png) y [Ver ventas](../../img/verificacion-stitch-listas-2026-11-09/ver-ventas.png) |

## Defectos encontrados en el emulador y corregidos

- La insignia «Con deuda» se veía como «Con» y «Sin liquidar» aparecía cortada; ahora el texto no se encoge.
- Las anuladas y las no liquidadas mostraban «Total pagado S/ 0.00» en verde; ahora muestran «Sin efecto» o «Sin liquidar» en neutro.

## Pendiente

- Teléfono de 360 dp y texto al 200 % de estas pantallas, en la verificación final (T1171).
