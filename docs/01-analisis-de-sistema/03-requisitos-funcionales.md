# Requisitos funcionales

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Contenido derivado de `build_propuesta.py`, conservando los identificadores de la propuesta vigente. Las reglas detalladas se mantienen en las especificaciones aprobadas del proyecto documental compartido.

| Proceso | Código | Requisito |
| --- | --- | --- |
| Usuarios y acceso | RF 01 | Permitir el acceso seguro del mayorista y del encargado mediante credenciales individuales. |
| Usuarios y acceso | RF 02 | Otorgar al mayorista acceso total y restringir al encargado, cuando lo reemplace, al pesaje y al ingreso de datos de compras y ventas. |
| Catálogos | RF 03 | Gestionar clientes y proveedores con datos de contacto, ubicación, límite de crédito y estado. |
| Catálogos | RF 04 | Gestionar productos por variedad, calidad, procedencia, presentación, unidad de medida y precio referencial. |
| Recepción | RF 05 | Permitir al mayorista o al encargado que lo reemplaza registrar fecha, proveedor, teléfono, vehículo, conductor y variedades antes de la descarga. |
| Recepción | RF 06 | Permitir al mayorista o al encargado que lo reemplaza registrar consecutivamente cada saco y asociarlo con la variedad correspondiente. |
| Recepción | RF 06A | Mostrar en tiempo real sacos, peso y promedio por variedad y del cargamento completo, y permitir correcciones autorizadas antes del cierre. |
| Recepción | RF 06B | Cerrar el pesaje, calcular tara y peso neto cuando corresponda, conservar el detalle individual y generar el lote de inventario. |
| Compras | RF 07 | Registrar el precio negociado y calcular importe bruto, flete por kilos o sacos, adelantos, otros descuentos y monto líquido por pagar al proveedor. |
| Inventario | RF 08 | Actualizar existencias a partir de ingresos, ventas, devoluciones, mermas y ajustes autorizados. |
| Inventario | RF 09 | Consultar stock por variedad, calidad, presentación, lote y antigüedad. |
| Ventas | RF 10 | Registrar ventas y despachos a compradores mayoristas de otros departamentos con variedades, sacos, peso, precio, vehículo, destino, flete y forma de pago. |
| Ventas | RF 11 | Aplicar precios negociados y descuentos dentro de límites configurables. |
| Ventas | RF 12 | Generar y compartir un comprobante interno o resumen de pedido por medios digitales. |
| Cuentas por cobrar | RF 13 | Registrar condiciones de crédito de clientes, vencimientos, abonos, saldos y compromisos de pago. |
| Cuentas por pagar | RF 14 | Generar el saldo del proveedor cuando el pago sea en cuotas y registrar vencimientos, abonos, adelantos descontados y cancelación. |
| Caja | RF 15 | Registrar pagos de proveedores, cobros de ventas y liquidación diaria de flete y estiba para uno o varios grupos de trabajadores. |
| Alertas | RF 16 | Mostrar cuentas vencidas o próximas a vencer, bajo stock y operaciones pendientes. |
| Reportes | RF 17 | Consultar compras, ventas, utilidad estimada, costos de estiba y transporte, stock y estado de cuentas. |
| Analítica | RF 18 | Comparar la evolución de precios por variedad, calidad, procedencia, proveedor, cliente y periodo. |
| Inteligencia artificial | RF 19 | Analizar progresivamente el historial validado para detectar tendencias y patrones; al alcanzar datos suficientes, generar una estimación semanal con rango, confianza y seguimiento del error. |
| Inteligencia artificial | RF 20 | Mostrar cada estimación con rango, fecha, variables utilizadas y nivel de confianza, y comparar luego el valor previsto con el real. |
| Operación móvil | RF 21 | Guardar temporalmente operaciones cuando no exista conexión y sincronizarlas al recuperarla. |
| Auditoría | RF 22 | Registrar usuario, fecha y detalle de creación, actualización o anulación de operaciones. |
| Notificaciones | RF 23 | Enviar recordatorios configurables de pagos, cobranzas, bajo stock y pedidos pendientes. |

## Relación con los cortes de implementación

| Corte SDD | Requisitos principales | Resultado de negocio |
| --- | --- | --- |
| 001 Identidad y autorización | RF01, RF02, RF22 | Acceso individual y aislamiento por negocio |
| 002 Recepción, pesaje y compra | RF03–07, RF06A, RF06B, RF14 | Cargamento trazable y liquidación del proveedor |
| 003 Ventas, despacho e inventario | RF08–11, RF13 | Existencias y resultado comercial consistentes |
| 004 Cuentas, caja y costos | RF13–15 | Saldos, cuotas, pagos, flete y estiba |
| 005 Sincronización y auditoría | RF21–22 | Continuidad local y efectos centrales únicos |
| 006 Reportes y comprobantes | RF12, RF16–18 | Información comercial y PDF interno |
| 007 Analítica progresiva | RF19–20 | Predicción condicionada por criterios aprobados |

RF23 conserva el alcance documental de recordatorios configurables. Esta revisión no acredita un canal externo implementado. Las alertas internas RF16 no demuestran por sí mismas el cumplimiento de RF23.

La relación entre historias y requisitos se conserva en el documento de historias. RF06A y RF06B son extensiones vigentes del pesaje; no deben eliminarse para ajustar la numeración del ejemplo.
