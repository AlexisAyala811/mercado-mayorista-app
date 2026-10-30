# Plan 009: Estado de cuenta del comprador

**Estado:** propuesto · fase `plan` · **Fecha:** 30 de octubre de 2026
**Especificación:** [spec.md](spec.md) · **Aclaraciones:** [registro](../../docs/sdd/aclaraciones-estado-de-cuenta-2026-10-30.md)

## Resumen técnico

El backend calcula el estado de cuenta a partir de las cuentas por cobrar abiertas del comprador y lo entrega en tres formas: un resumen JSON para la vista previa, un PDF y una imagen PNG. PDF e imagen se conservan como documentos con hash en `receipt_documents`, igual que los comprobantes. La aplicación Android muestra la vista previa, descarga el archivo elegido y lo envía con el flujo de Mensajería existente.

## Arquitectura y ubicación

| Pieza | Módulo | Ubicación |
| --- | --- | --- |
| Cálculo del estado de cuenta (función pura) | Documentos | `backend/src/receipts/buyer-statement/buyer-statement.ts` |
| Lectura de datos y conservación | Documentos | `backend/src/receipts/buyer-statement/buyer-statement.service.ts` |
| Render PDF | Documentos | `backend/src/receipts/buyer-statement/buyer-statement.pdf.ts` (PDFKit, como los comprobantes) |
| Render imagen | Documentos | `backend/src/receipts/buyer-statement/buyer-statement.image.ts` (SVG → PNG) |
| Endpoints | Documentos | `backend/src/receipts/buyer-statement/buyer-statement.controller.ts` |
| Vista previa y envío | Android | `app/src/features/receipts/` y `app/src/services/receipts/receipt-sharing.ts` |

Documentos lee Cuentas y caja, Ventas y Referencias; no escribe en ninguno. No se crea un módulo nuevo ni se modifica el modelo de cuentas.

## Contrato de la API

Todos bajo `/api/v1`, con sesión y rol **Mayorista** (`@Roles(UserRole.Wholesaler)`). El negocio sale siempre de la sesión.

| Método y ruta | Respuesta | Uso |
| --- | --- | --- |
| `GET /receipts/buyer-statements/{buyerId}` | `200` JSON del estado de cuenta | Vista previa en la app |
| `GET /receipts/buyer-statements/{buyerId}.pdf` | `200` `application/pdf` | Descarga para enviar |
| `GET /receipts/buyer-statements/{buyerId}.png` | `200` `image/png` · `422 statement-image-too-long` con más de 10 ventas | Descarga para enviar |

Errores comunes: `401` sin sesión, `403` Encargado (auditado por el guard de roles), `404` comprador inexistente o de otro negocio (auditado con `authorization.cross-business-denied` mediante `auditForeignAccess`).

### Resumen JSON

```json
{
  "statementNumber": "EC-20261030-3F9A2C",
  "cutoffAt": "2026-10-30T15:42:10.000Z",
  "cutoffDate": "2026-10-30",
  "businessName": "Mercado E2E",
  "buyer": { "id": "…", "name": "Comercial Lima" },
  "totals": {
    "outstandingCents": "40000",
    "overdueCents": "20000",
    "nextDue": { "dueOn": "2026-11-15", "amountCents": "20000" }
  },
  "sales": [
    {
      "saleId": "…",
      "saleCode": "V-3F9A2C1B",
      "saleDate": "2026-10-15",
      "initialCents": "80000",
      "paidCents": "30000",
      "returnedCents": "10000",
      "outstandingCents": "40000",
      "installments": [
        { "dueOn": "2026-10-30", "outstandingCents": "20000", "overdue": true },
        { "dueOn": "2026-11-15", "outstandingCents": "20000", "overdue": false }
      ]
    }
  ],
  "imageAvailable": true,
  "imageLimit": 10
}
```

Los importes viajan como texto en céntimos, como en el resto de la API.

## Origen de cada dato

| Dato | Fuente |
| --- | --- |
| Ventas incluidas (CL-EC01) | `accounts` con `kind = receivable`, `counterparty_type = buyer`, `counterparty_id = buyerId`, `state = open`, del negocio |
| Fecha y código de la venta | `sales.created_at` en hora de Lima; código `V-` + primeros 8 caracteres del id |
| Importe inicial | `accounts.initial_amount_cents` |
| Abonos | Suma de `account_payments` no reversos menos la suma de reversos de la cuenta |
| Devoluciones | Suma de `sale_returns.account_credit_cents` de la venta (solo la parte que redujo la deuda; el reembolso en caja no se muestra) |
| Saldo | `accounts.balance_cents` |
| Cuotas | `account_installments` con `state = open` y saldo mayor que cero, ordenadas por vencimiento |
| Vencida | `due_on` anterior a la fecha de corte en `America/Lima` |
| Corte (CL-EC03) | Hora del servidor al generar |

**Invariante:** para cada venta, `inicial − abonos − devoluciones = saldo`. Si no se cumple, la generación falla con `409 statement-inconsistent`, sin crear documento, y se registra en el log. Así el documento nunca muestra cifras que no cuadren.

Toda la lectura se hace en una transacción `REPEATABLE READ` para que cuentas, abonos, devoluciones y cuotas pertenezcan al mismo instante, como ya hace el historial de comprobantes.

## Conservación y número de documento

- `receipt_documents` con `source_type = buyer-statement` (PDF) o `buyer-statement-image` (PNG) y `source_id = buyerId`.
- `source_version = statement-v1:<fecha de corte Lima>:<sha256 de las cuentas incluidas con su versión y saldo>`. Generar dos veces el mismo día sin cambios en las cuentas reutiliza el documento existente (requisito de calidad: no crea registros nuevos).
- El número `EC-<AAAAMMDD>-<6 primeros caracteres de la huella>` se imprime en el documento y permite localizarlo después.
- Al generarse una versión nueva, la anterior queda invalidada pero conservada, como ocurre con los comprobantes (retención `EVIDENCE_RETENTION_YEARS`).
- Auditoría: `receipt.generated` al crear y `receipt.accessed` al reutilizar, mediante `getOrCreateDocument`.

## Generación de la imagen

| Opción | Ventaja | Inconveniente | Decisión |
| --- | --- | --- | --- |
| **SVG en el servidor → PNG con `@resvg/resvg-js`** | Mismo dato y misma huella que el PDF; la imagen también se conserva; la app solo descarga y comparte; se prueba en la CI | Dependencia nativa con binarios precompilados (incluye Linux musl para la imagen Alpine) y una fuente incluida en el repositorio | **Elegida** |
| Captura en el dispositivo (`react-native-view-shot`) | Sin dependencia en el servidor | La imagen no se conserva ni lleva huella verificable; nueva dependencia nativa en la app; depende del tamaño de pantalla | Descartada |
| Convertir el PDF a imagen | Una sola plantilla | Requiere Ghostscript o Poppler en el contenedor | Descartada |

- Ancho fijo de 1080 px, alto según el contenido, fondo blanco, texto de al menos 28 px para leerse en WhatsApp sin ampliar.
- Fuente incluida: **Noto Sans** (licencia OFL), en `backend/assets/fonts/`, porque la imagen Alpine no tiene fuentes del sistema.
- Con más de 10 ventas con saldo (CL-EC06) el endpoint responde `422` y la vista previa indica `imageAvailable: false`.

## Aplicación Android

1. Botón **«Estado de cuenta»** en el detalle del comprador y en el detalle de una cuenta por cobrar. Solo visible para el Mayorista.
2. Pantalla de vista previa con el resumen JSON: totales, ventas, cuotas y marcas de vencida; estados de carga, error con reintento y comprador sin deuda.
3. Acciones **«Enviar PDF»** y **«Enviar imagen»** (deshabilitada con explicación si `imageAvailable` es falso).
4. Descarga a un archivo temporal y envío con el flujo de Mensajería existente: intento preparado → compartición solicitada, destinatario comprador, sin afirmar entrega.
5. La vista previa no se guarda en la cola sin conexión: sin red, se informa que el estado de cuenta necesita conexión porque refleja saldos confirmados en el servidor.

Requisito previo: incorporar `mercado-app` al monorepo en `app/` con su CI, para implementar y verificar en el mismo repositorio.

## Seguridad y aislamiento

- Guardas `SessionAuthGuard` y `RolesGuard` con rol Mayorista.
- Todas las consultas filtran por `business_id` de la sesión; el comprador se busca con el mismo filtro.
- `auditForeignAccess` sobre `BuyerEntity` registra intentos sobre compradores de otro negocio.
- Respuestas con `Cache-Control: private, no-store`, como los comprobantes.
- El documento no muestra límite de crédito (CL-EC05) ni datos de otros compradores.

## Estrategia de pruebas

| Nivel | Casos |
| --- | --- |
| Unitarias del cálculo | Comprador con deuda; abono parcial y reverso; devolución aplicada a la cuenta; venta pagada excluida; cuenta anulada excluida; comprador sin deuda (total 0); cuota vencida según fecha de Lima en el borde de medianoche; invariante roto → `statement-inconsistent`; más de 10 ventas → sin imagen; orden por vencimiento |
| Unitarias de render | PDF con número, comprador, totales, cuotas y aviso legal (extracción de texto); PNG válido de 1080 px de ancho con más alto al crecer las ventas |
| Controlador | Rol Encargado → `403`; formato `.png` con más de 10 ventas → `422`; cabeceras sin caché |
| E2E PostgreSQL | Venta a crédito + abono + devolución → valores exactos del ejemplo de la spec; segunda generación el mismo día reutiliza el documento; comprador de otro negocio → `404` y evento de auditoría; Encargado → `403` |
| Android | Vista previa, sin deuda, error y reintento, imagen deshabilitada con más de 10 ventas, envío por PDF e imagen con registro del intento; verificación en tablet 1280 × 800 y teléfono |

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Binario nativo de `@resvg/resvg-js` en Alpine | El trabajo «Imagen Docker» de la CI construye la imagen; agregar una prueba de humo del render dentro del contenedor |
| Saldos que no cuadran por datos históricos | Invariante con `409` y log; las e2e lo cubren con abonos, reversos y devoluciones |
| Imagen ilegible en teléfonos pequeños | Ancho fijo y tamaño mínimo de texto; verificación en teléfono antes de cerrar |
| Licencia de la fuente | Noto Sans (OFL) con su archivo de licencia en el repositorio |
| Diseño visual sin Figma (CL-EC07) | Implementar con el sistema visual existente; la convergencia con Figma queda como tarea abierta |

## Dependencias nuevas

- Backend: `@resvg/resvg-js` (render SVG a PNG) y la fuente Noto Sans. Se revisan con `npm audit` en la CI.
- Android: ninguna; se reutilizan `expo-file-system` y `expo-sharing`.

## Fuera de este plan

Estado de cuenta de proveedores (CL-EC04), fechas de corte pasadas (CL-EC03), envío automático y cualquier cambio en el cálculo de cuentas.
