# Especificación 009: Estado de cuenta del comprador

**Estado:** especificada y aclarada · lista para `plan` (Figma pendiente, CL-EC07)
**Fecha:** 30 de octubre de 2026 · **Decisión de origen:** [módulos y estado de cuenta](../../docs/sdd/decision-modulos-y-estado-de-cuenta-2026-10-29.md)

## Objetivo

Que el Mayorista pueda entregar a un comprador, en un solo documento claro, cuánto le debe, qué ventas originan esa deuda, qué ha abonado y cuándo vencen los pagos pendientes, y enviárselo por WhatsApp o correo. Hoy esa información solo se ve dentro de la aplicación, cuenta por cuenta; el comprador no tiene una constancia propia de su saldo.

## Trazabilidad

- **HU16:** Como mayorista, quiero generar el estado de cuenta de un comprador con lo que debe, sus abonos y vencimientos, y enviárselo por WhatsApp, para que conozca su saldo pendiente.
- **RF27:** generar, a una fecha de corte, el estado de cuenta de un comprador con sus cuentas por cobrar (venta de origen, importe inicial, abonos, devoluciones aplicadas, saldo, cuotas, próximo vencimiento y total adeudado), en PDF e imagen.
- **Relacionados:** RF13 (cuentas por cobrar), RF12 y HU10 (comprobantes internos), RF25/RF26 y HU15 (envío manual y registro del intento), RF22 (auditoría).
- **Módulos:** Documentos genera el estado de cuenta; Mensajería lo envía; Cuentas y caja es la única autoridad de los saldos.
- **Calidad:** AC03 (los importes coinciden con los saldos confirmados), AC04 (aislamiento por negocio).

## Actores

| Actor | Participación |
| --- | --- |
| Mayorista | Elige el comprador, genera el estado de cuenta, lo revisa y lo envía. |
| Encargado | No participa: no accede a cuentas, documentos ni mensajería. |
| Comprador | Recibe el documento por WhatsApp o correo; no tiene acceso a la aplicación. |

## Flujo principal

1. El Mayorista abre el estado de cuenta desde el detalle del comprador o desde una de sus cuentas por cobrar.
2. El sistema genera el documento con los saldos confirmados en ese momento y lo muestra para revisión.
3. El Mayorista elige enviarlo como PDF o como imagen.
4. La aplicación abre WhatsApp o el correo con el archivo adjunto y el teléfono del comprador; el Mayorista confirma el envío en la aplicación externa.
5. El sistema conserva el documento generado y registra el intento de envío, igual que cualquier compartición de Mensajería.

## Contenido del documento

| Sección | Contenido |
| --- | --- |
| Encabezado | Nombre del negocio, título «Estado de cuenta», nombre del comprador, fecha y hora de corte, número de documento |
| Resumen | Total adeudado, monto vencido, próximo vencimiento con su importe |
| Detalle por venta | Fecha y número de la venta, importe inicial, abonos, devoluciones aplicadas, saldo pendiente |
| Cuotas pendientes | Por cada venta: fecha de vencimiento, importe pendiente y si está vencida |
| Pie | Aviso de que es un documento interno informativo, no un comprobante de pago ni factura electrónica |

Los importes se expresan en soles con dos decimales y siempre coinciden con los de Cuentas y caja al momento del corte.

## Requisitos funcionales verificables

1. Solo el Mayorista puede generar y enviar un estado de cuenta, y solo de compradores de su propio negocio.
2. El documento usa exclusivamente saldos confirmados en el servidor; la aplicación no recalcula deudas.
3. El total adeudado es la suma de los saldos de las cuentas por cobrar abiertas del comprador.
4. Las ventas anuladas y las cuentas anuladas no aparecen como deuda.
5. Las devoluciones comerciales que redujeron la deuda se muestran como tales, separadas de los abonos.
6. Una cuota con fecha de vencimiento anterior al día de corte se marca como vencida.
7. Un comprador sin deuda obtiene un estado de cuenta válido con total cero, no un error.
8. Cada estado de cuenta generado se conserva con su fecha de corte y una huella que permita comprobar después qué se envió.
9. El envío reutiliza Mensajería: es manual, se registra el intento y no se afirma entrega ni lectura.
10. La generación y cada intento de envío quedan en auditoría con el usuario que los realizó.

## Criterios de aceptación

### Escenario: Comprador con deuda

- **Dado** un comprador con dos ventas a crédito, una con un abono parcial
- **Cuando** el Mayorista genera su estado de cuenta
- **Entonces** el documento lista ambas ventas con importe inicial, abonos y saldo
- **Y** el total adeudado coincide con la suma de los saldos que muestra Cuentas y caja
- **Y** las cuotas con vencimiento pasado aparecen marcadas como vencidas.

### Escenario: Devolución comercial aplicada a la deuda

- **Dado** una venta a crédito de S/ 800,00 con una devolución comercial que redujo la deuda en S/ 100,00 y un abono de S/ 300,00
- **Cuando** se genera el estado de cuenta
- **Entonces** la venta muestra importe inicial S/ 800,00, abonos S/ 300,00, devoluciones S/ 100,00 y saldo S/ 400,00.

### Escenario: Comprador sin deuda

- **Dado** un comprador sin cuentas por cobrar abiertas
- **Cuando** el Mayorista genera su estado de cuenta
- **Entonces** obtiene un documento con total adeudado S/ 0,00 y el mensaje «Sin saldo pendiente».

### Escenario: Envío por WhatsApp

- **Dado** un estado de cuenta generado y revisado
- **Cuando** el Mayorista elige enviarlo como imagen por WhatsApp
- **Entonces** se abre WhatsApp con la imagen adjunta y el Mayorista confirma el envío
- **Y** el sistema registra el intento como «compartición solicitada», sin afirmar que fue entregado.

### Escenario: Comprador de otro negocio

- **Dado** un usuario del negocio A
- **Cuando** solicita el estado de cuenta de un comprador del negocio B
- **Entonces** recibe la misma respuesta que ante un comprador inexistente y el intento queda en la auditoría del negocio A.

### Escenario: Encargado

- **Dado** un Encargado con reemplazo vigente
- **Cuando** intenta generar un estado de cuenta
- **Entonces** el sistema lo deniega y registra la denegación.

## Requisitos de calidad

- El documento se lee bien en la pantalla de un teléfono: la imagen debe ser legible sin ampliar en WhatsApp.
- La generación responde en menos de 3 segundos para un comprador con hasta 50 ventas abiertas (AC01).
- Generar dos veces el mismo estado de cuenta sin cambios en los saldos no crea movimientos ni altera cuentas.

## Fuera de alcance

- Envío automático o programado, recordatorios periódicos y WhatsApp Business API (ADR-03).
- Intereses, moras o recargos: el sistema no los calcula.
- Pagos en línea o enlaces de pago.
- Facturación electrónica: es un documento interno.

## Aclaraciones

Resueltas por el usuario el 30 de octubre de 2026 ([registro](../../docs/sdd/aclaraciones-estado-de-cuenta-2026-10-30.md)).

| ID | Pregunta | Decisión |
| --- | --- | --- |
| CL-EC01 | ¿Qué ventas incluye? | **Solo las que tienen saldo pendiente.** Las ventas pagadas o anuladas no aparecen. |
| CL-EC02 | ¿Nivel de detalle? | **Por venta con sus cuotas:** importe, abonos, devoluciones y saldo de cada venta; debajo, sus cuotas pendientes con vencimiento y marca de vencida. |
| CL-EC03 | ¿Fecha de corte? | **Siempre el momento de generarlo.** No se reconstruyen saldos de fechas pasadas. |
| CL-EC04 | ¿También para proveedores? | **Solo compradores en este corte.** Proveedores será una historia futura. |
| CL-EC05 | ¿Mostrar el límite de crédito? | Sin preferencia del usuario; se adopta la propuesta: **no se muestra.** |
| CL-EC06 | ¿Imagen con muchas ventas? | **Imagen para hasta 10 ventas con saldo;** con más, solo se ofrece el PDF y se explica el motivo. |
| CL-EC07 | Diseño visual en Figma | Pendiente; el plan definirá la estructura y Figma la convergencia visual. |

### Criterio de aceptación derivado de CL-EC06

- **Dado** un comprador con 11 o más ventas con saldo pendiente
- **Cuando** el Mayorista genera su estado de cuenta
- **Entonces** puede ver y enviar el PDF, la opción de imagen no está disponible y la aplicación explica que el detalle no cabe legible en una imagen.

## Artefactos SDD relacionados

[Checklist de requisitos](checklists/requirements.md). Siguiente fase: plan y tareas.
