# Requisitos funcionales

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

| Módulo | Código | Requisito |
| --- | --- | --- |
| Identidad y acceso | RF01 | Permitir iniciar y cerrar sesión con credenciales individuales, proteger las rutas y revocar el acceso de la sesión cerrada. |
| Identidad y acceso | RF02 | Permitir al Mayorista autorizar y revocar reemplazos de máximo 24 horas; restringir al Encargado al pesaje, compras y ventas durante su vigencia. |
| Transversal: referencias | RF03 | Registrar y consultar proveedores y compradores desde los formularios de recepción, compras y ventas, conservando contacto, ubicación, límite de crédito y estado. |
| Transversal: referencias | RF04 | Registrar y consultar los datos de la papa desde recepción y ventas: variedad, calidad, procedencia, presentación, unidad de medida y precio referencial. Calidad y procedencia se eligen por saco y por línea de venta, con la opción «No informada». |
| Recepción y compras | RF05 | Registrar fecha, proveedor, teléfono, vehículo, conductor y variedades esperadas antes de la descarga. |
| Recepción y compras | RF06 | Registrar consecutivamente cada saco y asociarlo con su variedad, calidad y procedencia. |
| Recepción y compras | RF06A | Mostrar en tiempo real sacos, peso y promedio por variedad y del cargamento completo, y permitir correcciones autorizadas antes del cierre. |
| Recepción y compras | RF06B | Cerrar el pesaje, calcular tara y peso neto cuando corresponda y conservar el detalle individual del cargamento. |
| Recepción y compras | RF07 | Registrar el precio negociado y calcular importe bruto, flete por kilos o sacos, adelantos, otros descuentos y monto líquido por pagar al proveedor. |
| Ventas y despachos | RF10 | Registrar ventas y despachos a compradores mayoristas de otros departamentos con variedades, calidad, procedencia, sacos, peso, precio, vehículo, destino, flete y forma de pago. |
| Ventas y despachos | RF11 | Aplicar precios negociados y descuentos dentro de límites configurables. |
| Documentos | RF12 | Generar comprobantes internos en PDF de compras, ventas y devoluciones confirmadas. |
| Cuentas y caja | RF13 | Registrar condiciones de crédito de compradores, vencimientos, abonos, saldos y compromisos de pago. |
| Cuentas y caja | RF14 | Generar el saldo del proveedor cuando el pago sea en cuotas y registrar vencimientos, abonos, adelantos descontados y cancelación. |
| Cuentas y caja / Costos logísticos | RF15 | Registrar pagos a proveedores, cobros de ventas y liquidación de flete y estiba para uno o varios grupos de trabajadores. |
| Cuentas y caja | RF16 | Mostrar cuentas vencidas o próximas a vencer y operaciones pendientes de sincronizar. |
| Reportes y analítica | RF17 | Consultar compras, ventas, cantidades, pesos, importes, costos de estiba y transporte y estado de cuentas. |
| Reportes y analítica | RF18 | Comparar la evolución de precios por variedad, calidad, procedencia, proveedor, comprador y periodo. |
| Reportes y analítica | RF19 | Analizar progresivamente el historial validado para detectar tendencias y patrones; al alcanzar datos suficientes, generar una estimación semanal con rango, confianza y seguimiento del error. |
| Reportes y analítica | RF20 | Mostrar cada estimación con rango, fecha, variables utilizadas y nivel de confianza, y comparar luego el valor previsto con el real. |
| Transversal: sincronización | RF21 | Guardar temporalmente operaciones cuando no exista conexión y sincronizarlas al recuperarla. |
| Transversal: auditoría | RF22 | Registrar usuario, fecha, acción y motivo cuando corresponda; permitir al Mayorista consultar la auditoría de su negocio. |
| Mensajería | RF23 | Permitir enviar recordatorios de pagos y cobranzas a proveedores y compradores mediante envío manual por WhatsApp o correo. |
| Reportes y analítica | RF24 | Buscar compras, pesajes, ventas y despachos por fecha o participante comercial y consultar su detalle. |
| Mensajería | RF25 | Seleccionar un archivo PDF, DOC, DOCX o imagen y un comprador o proveedor del negocio, revisar el archivo y solicitar su envío manual por WhatsApp o correo. |
| Mensajería | RF26 | Registrar cada intento de envío (usuario, destinatario, archivo, tipo, tamaño, canal y estado: preparado, compartición solicitada o fallido), sin subir el contenido del archivo al servidor. |
| Documentos | RF27 | Generar, a una fecha de corte, el estado de cuenta de un comprador con sus cuentas por cobrar: venta de origen, importe inicial, abonos, devoluciones aplicadas, saldo, cuotas, próximo vencimiento y total adeudado, en PDF e imagen. |

RF08 y RF09 (control de existencias) se retiraron del alcance el 7 de octubre de 2026 y sus códigos no se reutilizan.

## Trazabilidad de historias y criterios de aceptación

| Historia | Requisitos | Criterio de aceptación |
| --- | --- | --- |
| HU01 | RF04–RF06B | Cada saco conserva variedad, calidad, procedencia, bruto, tara y neto; los totales por variedad y cargamento coinciden con el detalle; cerrar el pesaje no crea existencias. |
| HU02 | RF07, RF14 | Bruto, flete, adelantos, descuentos y líquido se calculan en céntimos; el pago al contado genera una salida de caja y el crédito, una cuenta por pagar con cuotas que suman el líquido. |
| HU03 | RF10, RF11, RF13 | La venta conserva comprador, destino, líneas, pesos, sacos y flete; al contado genera ingreso de caja y a crédito una cuenta por cobrar; no descuenta mercadería. |
| HU04 | RF13, RF14 | Cada cuenta muestra origen, contraparte, vencimientos, abonos y saldo, solo del negocio del Mayorista. |
| HU05 | RF21, RF22 | Una orden reintentada cinco veces produce un único registro y un único efecto financiero; si el reemplazo venció, se rechaza y queda pendiente de revisión. |
| HU06 | RF18–RF20 | Las tendencias se muestran con el historial disponible; la estimación solo se habilita al cumplir CL-08. |
| HU07 | RF01, RF02 | Credenciales válidas abren sesión; cerrar sesión revoca el token en el servidor. |
| HU08 | RF13–RF15 | El abono actualiza el saldo una sola vez y genera su movimiento de caja; se rechaza un importe mayor al saldo. |
| HU09 | RF15 | Cada registro de flete o estiba conserva su operación de origen; la liquidación agrupa registros pendientes y genera una salida de caja. |
| HU10 | RF12 | El PDF de una operación confirmada muestra los mismos importes que la consulta; se conserva con hash y versión. |
| HU11 | RF24 | Los filtros por fecha y participante devuelven solo operaciones del negocio, paginadas. |
| HU12 | RF02 | Un reemplazo supera 24 horas o se superpone con otro: se rechaza; al revocarlo se cierran las sesiones del Encargado. |
| HU13 | RF22 | Cada alta, corrección o anulación muestra usuario, fecha, acción y motivo; los eventos no se modifican. |
| HU14 | RF16, RF23 | Se avisa de cuentas vencidas o por vencer; el Mayorista puede enviar un recordatorio manual desde el aviso. |
| HU15 | RF25, RF26 | Solo se aceptan formatos permitidos de hasta 20 MiB; cada intento queda registrado; el sistema no afirma entrega ni lectura. |
| HU16 | RF27, RF25, RF26 | El estado de cuenta coincide con los saldos de Cuentas y caja a la fecha de corte; un comprador sin deuda obtiene saldo cero; el documento enviado se conserva. |

## Relación con las especificaciones de implementación

| Especificación | Módulo | Requisitos |
| --- | --- | --- |
| 001 Identidad y autorización | Identidad y acceso | RF01, RF02, RF22 |
| 002 Recepción, pesaje y compra | Recepción y compras | RF03–RF07, RF06A, RF06B, RF14 |
| 003 Ventas y despacho | Ventas y despachos | RF10, RF11, RF13 |
| 004 Cuentas, caja, flete y estiba | Cuentas y caja; Costos logísticos | RF13–RF15 |
| 005 Sincronización y auditoría | Transversal | RF21, RF22 |
| 006 Reportes y comprobantes | Documentos; Reportes y analítica | RF12, RF16–RF18, RF24, RF27 |
| 007 Analítica progresiva | Reportes y analítica | RF19, RF20 |
| 008 Mensajería y notificaciones | Mensajería | RF16, RF23, RF25, RF26 |

## Alcance: registro comercial sin control de existencias

Desde el 7 de octubre de 2026 el sistema conserva compras, pesajes, ventas y despachos como registros independientes, sin calcular mercadería disponible. Una compra de 100 sacos y una venta de 30 no producen un saldo de 70 sacos, y una venta nunca se bloquea por falta de existencias. Los saldos de dinero (cuentas por pagar y por cobrar, caja) sí se calculan.

## Ejemplos de saldos

| Operación | Importe inicial | Abono | Saldo |
| --- | --- | --- | --- |
| Compra a crédito al proveedor | S/ 1 000,00 | S/ 600,00 pagados | S/ 400,00 por pagar |
| Venta a crédito al comprador | S/ 800,00 | S/ 300,00 cobrados | S/ 500,00 por cobrar |

- Reenviar el mismo abono no modifica el saldo por segunda vez.
- Un abono mayor al saldo se rechaza sin escrituras parciales.
- Anular una operación no borra la compra, la venta ni los pagos: registra la compensación con su motivo. Una venta o compra con abonos vigentes no se anula hasta revertirlos.
- El comprobante, el estado de cuenta y la consulta de la cuenta muestran los mismos importes confirmados.

## Brechas conocidas

| Requisito | Situación |
| --- | --- |
| RF11 | El backend valida que los descuentos no superen el importe y aplica un límite de crédito por comprador; no existe un límite de descuento configurable. |
| RF27 | Requisito nuevo, pendiente de especificar e implementar. |
| RF16 | Las operaciones pendientes de sincronizar se muestran en la aplicación Android; los avisos de vencimiento los entrega la API. |
