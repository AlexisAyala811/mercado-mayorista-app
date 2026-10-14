# Requisitos funcionales

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.2

| Proceso | Código | Requisito |
| --- | --- | --- |
| Usuarios y acceso | RF 01 | Permitir iniciar y cerrar sesión con credenciales individuales, proteger rutas y revocar el acceso de la sesión cerrada. |
| Usuarios y acceso | RF 02 | Permitir al Mayorista autorizar y revocar reemplazos de máximo 24 horas; restringir al Encargado al pesaje, compras y ventas durante su vigencia. |
| Recepción, compras y ventas | RF 03 | Registrar y consultar proveedores y compradores dentro de recepción, compras y ventas, conservando contacto, ubicación, límite de crédito y estado. |
| Recepción y ventas | RF 04 | Registrar y consultar los datos de papa dentro de recepción y ventas: variedad, calidad, procedencia, presentación, unidad de medida y precio referencial. |
| Recepción | RF 05 | Permitir al mayorista o al encargado que lo reemplaza registrar fecha, proveedor, teléfono, vehículo, conductor y variedades antes de la descarga. |
| Recepción | RF 06 | Permitir al mayorista o al encargado que lo reemplaza registrar consecutivamente cada saco y asociarlo con la variedad correspondiente. |
| Recepción | RF 06A | Mostrar en tiempo real sacos, peso y promedio por variedad y del cargamento completo, y permitir correcciones autorizadas antes del cierre. |
| Recepción | RF 06B | Cerrar el pesaje, calcular tara y peso neto cuando corresponda, conservar el detalle individual del cargamento para su historial comercial. |
| Compras | RF 07 | Registrar el precio negociado y calcular importe bruto, flete por kilos o sacos, adelantos, otros descuentos y monto líquido por pagar al proveedor. |
| Ventas | RF 10 | Registrar ventas y despachos a compradores mayoristas de otros departamentos con variedades, sacos, peso, precio, vehículo, destino, flete y forma de pago. |
| Ventas | RF 11 | Aplicar precios negociados y descuentos dentro de límites configurables. |
| Ventas | RF 12 | Generar y compartir comprobantes internos de compras y ventas confirmadas por medios digitales. |
| Cuentas por cobrar | RF 13 | Registrar condiciones de crédito de clientes, vencimientos, abonos, saldos y compromisos de pago. |
| Cuentas por pagar | RF 14 | Generar el saldo del proveedor cuando el pago sea en cuotas y registrar vencimientos, abonos, adelantos descontados y cancelación. |
| Caja | RF 15 | Registrar pagos a proveedores, cobros de ventas y liquidación diaria de flete y estiba para uno o varios grupos de trabajadores. |
| Alertas | RF 16 | Mostrar cuentas vencidas o próximas a vencer, operaciones pendientes. |
| Reportes | RF 17 | Consultar compras, ventas, cantidades, pesos, importes registrados, costos de estiba y transporte y estado de cuentas. |
| Analítica | RF 18 | Comparar la evolución de precios por variedad, calidad, procedencia, proveedor, cliente y periodo. |
| Inteligencia artificial | RF 19 | Analizar progresivamente el historial validado para detectar tendencias y patrones; al alcanzar datos suficientes, generar una estimación semanal con rango, confianza y seguimiento del error. |
| Inteligencia artificial | RF 20 | Mostrar cada estimación con rango, fecha, variables utilizadas y nivel de confianza, y comparar luego el valor previsto con el real. |
| Operación móvil | RF 21 | Guardar temporalmente operaciones cuando no exista conexión y sincronizarlas al recuperarla. |
| Auditoría | RF 22 | Registrar usuario, fecha, acción y motivo cuando corresponda; permitir al Mayorista consultar la auditoría de su negocio. |
| Notificaciones | RF 23 | Enviar recordatorios configurables de pagos, cobranzas y operaciones pendientes. |
| Historial | RF 24 | Permitir al Mayorista buscar compras, pesajes, ventas y despachos por fecha o participante comercial y consultar su detalle. |

## Relación con los cortes de implementación

| Corte SDD | Requisitos principales | Resultado de negocio |
| --- | --- | --- |
| 001 Identidad y autorización | RF01, RF02, RF22 | Acceso individual y aislamiento por negocio |
| 002 Recepción, pesaje y compra | RF03–07, RF06A, RF06B, RF14 | Cargamento trazable y liquidación del proveedor |
| 003 Ventas y despacho | RF10–11, RF13 | Despachos y resultado comercial trazables |
| 004 Cuentas, caja y costos | RF13–15 | Saldos, cuotas, pagos, flete y estiba |
| 005 Sincronización y auditoría | RF21–22 | Continuidad local y efectos centrales únicos |
| 006 Reportes y comprobantes | RF12, RF16–18 | Información comercial y PDF interno |
| 007 Analítica progresiva | RF19–20 | Predicción condicionada por criterios aprobados |

RF23 conserva el alcance documental de recordatorios configurables. Esta revisión no acredita un canal externo implementado. Las alertas internas RF16 no demuestran por sí mismas el cumplimiento de RF23.

Las historias conservan el formato ID y necesidad del usuario; la trazabilidad de requisitos se mantiene en las especificaciones compartidas. RF06A y RF06B son extensiones vigentes del pesaje; no deben eliminarse para ajustar la numeración del ejemplo.

## Alcance vigente: registro comercial sin control de existencias

Decisión del usuario, 7 de octubre de 2026: conservar compras, pesajes, ventas y despachos sin calcular mercadería restante. RF08 y RF09 se retiran del alcance; sus identificadores no se reutilizan. RF06B conserva el pesaje cerrado sin generar existencias; RF16, RF17 y RF23 conservan alertas, reportes y recordatorios comerciales sin indicadores de stock.

Una compra de 100 sacos y una venta de 30 sacos quedan como registros independientes; el sistema no presenta 70 sacos disponibles, no descuenta mercadería y no bloquea ventas por falta de existencias. Los saldos por pagar/cobrar siguen calculándose. Las correcciones y devoluciones comerciales conservan su efecto financiero y su historial.

La asociación entre una venta y un cargamento de compra no se vuelve obligatoria por esta decisión; no se incorpora una regla nueva de conciliación de cantidades.

## Trazabilidad de historias y aceptación

| Historia | Requisitos | Criterio de aceptación |
| --- | --- | --- |
| HU01 | RF05, RF06, RF06A, RF06B | Conservar cada saco por variedad y mostrar totales por cargamento; cerrar pesaje sin crear existencias. |
| HU02 | RF07, RF14 | Calcular bruto, flete, adelantos, descuentos y líquido; conservar pago o cuotas y saldo financiero. |
| HU03 | RF10, RF11, RF13, RF15 | Conservar comprador, destino, pesos, sacos y flete; registrar cobro o deuda sin descontar mercadería. |
| HU04 | RF13, RF14 | Mostrar origen, vencimiento, abonos y saldo de cuentas del negocio del Mayorista. |
| HU05 | RF21, RF22 | Conservar órdenes autorizadas y reintentar sin duplicar registros ni efectos financieros; revalidar permisos. |
| HU06 | RF18, RF19, RF20 | Diferenciar tendencias de predicción; esta última requiere CL-08 y datos suficientes antes de habilitarse. |
| HU07 | RF01, RF02 | Autenticar credenciales individuales; mostrar rutas autorizadas y revocar la sesión al salir. |
| HU08 | RF13, RF14, RF15 | Guardar abono con origen y actualizar saldo una sola vez; rechazar importes superiores al saldo. |
| HU09 | RF15 | Conservar grupo, operación y costo; liquidar estiba con origen y registro de caja trazables. |
| HU10 | RF12 | Generar PDF interno de compra o venta confirmada y permitir compartirlo con autorización. |
| HU11 | RF24 | Filtrar por fecha o participante y mostrar el detalle de la operación, sin saldo de mercadería. |
| HU12 | RF02 | Crear reemplazo de máximo 24 horas y revocarlo; servidor revalida su vigencia en cada orden. |
| HU13 | RF22 | Mostrar usuario, fecha, acción y motivo cuando corresponda; impedir cambios de hechos auditados. |
| HU14 | RF16, RF23 | Mostrar aviso vinculado a una cuenta y vencimiento; evitar duplicados. Canal externo pendiente de definir. |

HU04 consulta cuentas; HU08 registra abonos. HU03 registra ventas; HU11 localiza registros anteriores. HU11 muestra operaciones comerciales; HU13 muestra acciones y responsables. HU14 agrega avisos de vencimiento y no una segunda consulta de saldos. RF24 explicita búsqueda e historial ya contemplados en el alcance; no reutiliza RF08/RF09 retirados. Los recordatorios externos requieren definir canal y política antes de implementarlos.

## Ejemplos de saldos y excepciones

| Operación ilustrativa | Importe inicial | Abono | Saldo financiero |
| --- | --- | --- | --- |
| Compra a crédito del proveedor | S/1.000,00 | S/600,00 pagados | S/400,00 por pagar |
| Venta a crédito al comprador | S/800,00 | S/300,00 cobrados | S/500,00 por cobrar |

En la compra el importe inicial representa la obligación final después de los descuentos acordados. Cada abono conserva fecha, responsable, origen y UUID. Reenviar el abono no modifica el saldo por segunda vez. Un abono mayor al saldo se rechaza sin escrituras parciales. El comprobante y la consulta de cuenta deben mostrar los mismos importes confirmados.

Los sacos y pesos permanecen en el detalle de cada operación. Una compra de 100 sacos y una venta de 30 no producen un saldo de 70 sacos disponibles.

Una anulación después de abonos no borra compra, venta ni pagos: conserva el origen y registra las compensaciones autorizadas. La comprobación debe contrastar cuenta, caja, abonos y auditoría antes/después. Anular una operación no demuestra por sí solo una devolución real de dinero; no se inventa un reembolso automático. La política del caso concreto debe estar especificada antes de implementarlo.

Si el reemplazo vence antes de sincronizar, la API rechaza la confirmación y no aplica efectos. La interfaz conserva la orden como pendiente de revisión y muestra el motivo; no elimina el registro ni promete confirmación automática. El tratamiento posterior requiere una acción autorizada conforme a la especificación.
