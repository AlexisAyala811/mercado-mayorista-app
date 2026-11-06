# Verificación del estado de pago en Ver compras

**Fecha:** 5 de noviembre de 2026 · **Especificación:** [spec 011, CL-MD05, T1124–T1126](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-estado-pago-compras`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1125 | `GET /api/v1/purchases/payment-status?receptionIds=…` en el módulo de compras. `domain/payment-status.ts` aplica la regla CL-MD05: anulada → `voided`; contado, o crédito con saldo cero → `paid`; crédito con saldo → `debt` con `balanceCents`. Una consulta une la liquidación con su cuenta por pagar (`source_type = 'purchase-settlement'`), filtra por el `businessId` de la sesión y devuelve solo las recepciones liquidadas del negocio. El DTO acepta de 1 a 100 UUID, en lista con comas o con el parámetro repetido. Mayorista y Encargado, como el listado. Recepción no depende de Compras ni de Cuentas |
| T1126 | «Ver compras» pide el estado después de cada página, solo para recepciones liquidadas o anuladas. Muestra «Pagada», «Con deuda» con el saldo, o «Anulada», con texto y los colores de estado de los tokens. Sin conexión indica «Estado de pago no disponible sin conexión.» y la lista sigue funcionando. Una respuesta vieja no pisa una búsqueda nueva |
| T1124 | Queda completa con T1126: la confirmación ya mostraba los lotes y el flete (fase 3) |

## Resultados

| Verificación | Resultado |
| --- | --- |
| Backend `npx tsc --noEmit --incremental false`, `npm run lint`, `npm run build` | Sin errores; lint sin avisos nuevos |
| Backend `npx vitest run` | 335 pruebas en 73 archivos; `payment-status.spec.ts` con las cinco situaciones, un saldo mayor que `Number.MAX_SAFE_INTEGER` y el DTO (lista, parámetro repetido, vacío, no UUID, 101 recepciones, parámetros ajenos) |
| Backend `npm audit --omit=dev --audit-level=high` | Sin vulnerabilidades altas ni críticas (2 moderadas ya conocidas) |
| e2e `test/purchase-payment-status.e2e-spec.ts` en PostgreSQL 17 portable | 2 de 2: contado pagada, crédito con deuda de 20000 céntimos, crédito pagado con un pago de 20000, compra anulada, recepción sin liquidar excluida, recepción de otro negocio excluida, UUID inexistente excluido; 400 sin parámetro, con un valor que no es UUID o con 101 recepciones; 401 sin sesión |
| App `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| App `npm test -- --runInBand` | 631 pruebas en 88 suites; `purchase-payment-status.test.tsx` con estados, saldo, falla de red y página sin liquidadas |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | Con tres compras cargadas por la API, «Ver compras» mostró «Pagada» (contado), «Con deuda · Saldo S/ 420.00» (crédito de 200 kg a S/ 2.10) y «Anulada» |

## Pendiente

- Prueba de la cola sin conexión con lotes (T1041) y detalle de compra con lotes en «Ver compras» (T1042).
- Teléfono de 360 px, texto al 200 % y TalkBack (T1150).
