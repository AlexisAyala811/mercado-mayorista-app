# Organización en módulos y estado de cuenta del comprador

Estado: **decisión confirmada el 29 de octubre de 2026**. Sustituye la lista de diez responsabilidades usada en la documentación del primer entregable (13 de octubre) y orienta la reestructuración documental, C4 y la correspondencia con `mercado-api`.

## Módulos aprobados

Organización por proceso de negocio (opción A), con Mensajería separada de Documentos a pedido del usuario.

| # | Módulo | Incluye | Carpetas de `mercado-api` |
|---|---|---|---|
| 1 | Identidad y acceso | Sesión, Encargados, reemplazos | `identity` |
| 2 | Recepción y compras | Pesaje saco por saco, cierre, liquidación al proveedor | `reception`, `purchase` |
| 3 | Ventas y despachos | Venta, despacho, anulación, devoluciones comerciales | `sales` |
| 4 | Cuentas y caja | Cuotas, abonos, pagos, cobros, caja, avisos de vencimiento | `accounts` |
| 5 | Costos logísticos | Flete y estiba | `freight`, `stowage` |
| 6 | Documentos | Comprobantes PDF de compra, venta y devolución; estado de cuenta del comprador; historial de documentos | `receipts` |
| 7 | Mensajería | Envío manual por WhatsApp o correo de comprobantes, estado de cuenta, imágenes y documentos Word; destinatario comprador o proveedor; registro de cada intento | `messaging` |
| 8 | Reportes y analítica | Reportes, tendencias, predicción CL-08 | `reports`, `analytics` |
| — | Transversal | Auditoría, referencias comerciales, sincronización offline (cliente) | `audit`, `catalog`, `logistics`, `operations`; cola cifrada en Android |

Documentos **genera** archivos; Mensajería **los envía** y no calcula importes. Referencias comerciales (proveedores, compradores, variedades, calidad, procedencia, transportistas y vehículos) se documentan como soporte transversal: tienen API y reglas propias, pero no pantalla independiente, conforme a la decisión del 14 de octubre. `inventory` y `health` no se presentan como módulos de negocio.

## Envío por WhatsApp

Se confirma el envío **manual** decidido el 26 de octubre: la aplicación abre WhatsApp (o correo) con el archivo listo y el Mayorista elige el contacto y confirma el envío. No hay envío automático, WhatsApp Business API ni proveedor externo contratado. El sistema registra el intento (preparado, compartición solicitada o fallido), pero no puede confirmar entrega ni lectura. La API automática queda como evolución documentada, no como alcance.

## Nueva historia y requisito

| ID | Definición |
|---|---|
| HU16 | Como mayorista, quiero generar el estado de cuenta de un comprador con lo que debe, sus abonos y vencimientos, y enviárselo por WhatsApp, para que conozca su saldo pendiente. |
| RF27 | Generar, a una fecha de corte, el estado de cuenta de un comprador del negocio con sus cuentas por cobrar abiertas: venta de origen, importe inicial, abonos, devoluciones aplicadas, saldo, cuotas y próximo vencimiento, y el total adeudado. Entregarlo como PDF e imagen para compartirlo mediante Mensajería. |

Reglas propuestas para especificar:

- Solo el Mayorista genera y envía estados de cuenta; el Encargado no accede.
- Usa saldos confirmados centrales; no recalcula deudas en el dispositivo.
- Indica la fecha y hora de corte y los importes en soles con dos decimales.
- Un comprador sin deuda obtiene un estado con saldo cero, no un error.
- Se conserva el documento generado con hash y fecha, como los comprobantes, para poder demostrar qué se envió.
- La generación y el intento de envío quedan en auditoría.

Pendiente de especificar: diseño visual (Figma), formato exacto de la imagen y si en el futuro se ofrece el equivalente para proveedores (cuentas por pagar). HU16 y RF27 continúan la numeración sin renumerar historias ni requisitos anteriores.

## Trabajo derivado

1. Reestructurar la documentación del repositorio `mercado-mayorista-app` con estos ocho módulos y el transversal.
2. Especificar HU16/RF27 (spec 006 o 008), contratos y criterios de aceptación.
3. Implementar en backend y Android en un corte vertical, después de la documentación.
