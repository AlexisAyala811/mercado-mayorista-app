# Verificación del diseño MAÑAY, fase 4: Deudas, Cobranzas y estado de cuenta

**Fecha:** 6 de noviembre de 2026 · **Especificaciones:** [spec 011, T1130–T1131](../../specs/011-manay-app-design/tasks.md) y [spec 009, T940–T944](../../specs/009-buyer-account-statement/tasks.md) · **Rama:** `feat/011-fase4-cuentas`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1130 | La pantalla única «Deudas y cobranzas» se divide en dos rutas (CL-FM18): `/debts` («Deudas», cuentas por pagar a proveedores, en la sección Compra del menú) y `/collections` («Cobranzas», cuentas por cobrar a compradores, en Venta). `domain/accounts/account-kind.ts` reúne los textos de cada una: título, búsqueda, importe («Pago al proveedor» o «Cobro al comprador»), diálogo («¿Confirmar pago al proveedor?» o «¿Confirmar cobro al comprador?») y confirmación de guardado propia («Pago guardado» o «Cobro guardado»). El filtro por tipo desaparece porque lo fija la ruta; queda el filtro por estado. `accounts-overview.tsx` reemplaza la vista del Figma anterior con los tokens MAÑAY, el estado de cada cuenta con texto y color, y el saldo. Solo el Mayorista entra a las dos rutas, como antes |
| T940 | `services/api/statement-api.ts`: tipos del resumen y textos para `404`, `409 statement-inconsistent`, otros `409`, `422 statement-image-too-long` y `403` |
| T941 | `buyer-statement-screen.tsx`: saldo pendiente, vencido, próximo vencimiento, cada venta con su importe, cobrado, devuelto, saldo y cuotas, con la marca «Vencida». Tiene estados de carga, error con reintento, sin deuda y sin conexión |
| T942 | El botón «Estado de cuenta» está en el detalle de una cuenta de Cobranzas cuyo titular es un comprador. Abre la ruta `/buyer-statement`, solo para el Mayorista (el backend también lo exige). Va en Cobranzas y no en Deudas porque las cuentas de los compradores están ahí desde CL-FM18; CL-FM13 se escribió cuando era una sola pantalla. La app ya no tiene una pantalla de detalle del comprador (el catálogo fue retirado), así que el acceso queda solo en la cuenta |
| T943 | «Enviar PDF» y «Enviar imagen» con WhatsApp o Correo. El archivo se descarga del servidor y se registra en Mensajería como intento `prepared`; después se abre la hoja de compartir del sistema y el intento pasa a `sharing_requested`, o a `failed` si la hoja no se abre. Si la imagen no está disponible, el botón queda deshabilitado con la explicación |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 647 pruebas en 91 suites |
| `tests/accounts/accounts-screen.test.tsx` | Deudas muestra solo cuentas por pagar y Cobranzas solo por cobrar, cada una con su título y su acceso de origen («Registrar compra» o «Registrar venta»). El cobro usa su diálogo y su botón propios. El botón «Estado de cuenta» aparece en Cobranzas para un comprador y no en Deudas, y abre `/buyer-statement` con el `buyerId`. Las pruebas de pago, reverso, cola y errores siguen en verde con los textos nuevos |
| `tests/accounts/buyer-statement.test.tsx` | Vista previa con totales, venta y cuota vencida; envío del PDF por correo con intentos `prepared` → `sharing_requested` y el comprador como destinatario; intento `failed` si no se abre la hoja; imagen deshabilitada con explicación; sin deuda; reintento sin conexión y con cifras inconsistentes; textos de cada error |
| `tests/auth/permissions.test.ts` | Mayorista con Deudas y Cobranzas; Encargado sin ellas |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | El menú muestra Deudas en Compra. Deudas tiene una cuenta de proveedor (S/ 420.00). Cobranzas tiene dos ventas a crédito de Comercializadora Santa Rosa (S/ 1200.00 y S/ 750.00). Su estado de cuenta muestra S/ 1950.00 pendiente, S/ 600.00 vencido y la cuota del 1 de noviembre como «Vencida». «Enviar PDF» abrió la hoja de compartir con `EC-20261106-C89692.pdf`, y Mensajería quedó con el intento `sharing_requested`, destinatario comprador, canal WhatsApp, 2478 bytes |

## Pendiente

- **T944:** envío real por WhatsApp y correo en un dispositivo con esas aplicaciones (el emulador no las tiene); imagen legible sin ampliar; teléfono, texto al 200 % y TalkBack.
- Las capturas no se compararon con Stitch píxel a píxel.
