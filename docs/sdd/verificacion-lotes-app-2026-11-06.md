# Verificación de lotes en la app: cola y detalle de compra

**Fecha:** 6 de noviembre de 2026 · **Especificación:** [spec 010, T1041 y T1042](../../specs/010-purchase-lines-and-freight-choice/tasks.md) · **Rama:** `feat/010-app-lotes-detalle-cola`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1041 | Sin cambios de código: la cola cifrada ya guarda el cuerpo completo de la liquidación. Se agrega `tests/sync/purchase-lots-queue.test.tsx` para la orden con lotes y flete del Mayorista |
| T1042 | `components/settlement-lot-list.tsx` reúne la lista de lotes de la confirmación y la usa también en el detalle de «Ver compras». El detalle tiene una tarjeta «Liquidación» (o «Liquidación anulada») con cada lote (letra, nombre, variedad, calidad, sacos, kilos, precio, importe), importe bruto, «Flete descontado» o «Flete a cargo del Mayorista», adelantos y descuentos, monto líquido y forma de pago. El comprobante PDF con lotes ya lo genera el backend desde la spec 010 |
| Spec 011, T1121 | Las correcciones de «Ver compras» también se capturan en kilos enteros con teclado numérico; los pesos del detalle se muestran redondeados |
| Fase 3 | La tarifa de flete empieza vacía. Al elegir una base de flete sin tarifa, la vista previa queda pendiente con «Ingresa la tarifa de flete o elige «Sin flete».» en vez de un error |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 636 pruebas en 90 suites |
| `tests/sync/purchase-lots-queue.test.tsx` | La orden con lotes queda en la cola cifrada con su cuerpo exacto. Sin conexión no se pierde; al reintentar se envía una sola vez con el mismo `clientOperationId` y el mismo cuerpo. Un `409` queda «en revisión», conserva el cuerpo y no se reenvía solo |
| `tests/reception/purchase-detail-lots.test.tsx` | El detalle muestra los lotes A y B, el importe del lote B, el flete a cargo del Mayorista y adelantos más descuentos (S/ 12.50). Un saco de 50.400 kg se ve como «50 kg netos»; la corrección parte de «51», usa teclado numérico y rechaza «52,5» sin guardar nada en la cola |
| `tests/reception/purchase-preview.test.ts` | Tarifa de flete vacía con base elegida → pendiente; sin flete → lista |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | Detalle de una compra a crédito: «Lote A · Canchán · Calidad no informada», 4 sacos, 200 kg, S/ 2.10 por kg, S/ 420.00; flete descontado S/ 0.00; crédito. Sacos en kilos enteros («Bruto 51 kg · tara 1 kg») |

## Pendiente

- Convergencia de la spec 010 (T1050).
- Teléfono de 360 px, texto al 200 % y TalkBack (T1150 de la spec 011).
