# Requisitos Funcionales

Los requisitos funcionales describen las funciones que debe proporcionar la aplicación móvil de gestión comercial para los mayoristas de papa.

| ID | Requisito funcional | Historias relacionadas |
|---|---|---|
| RF01 | El sistema debe permitir registrar la llegada de un cargamento indicando proveedor, fecha, teléfono, vehículo, conductor y variedades de papa. | HU01 |
| RF02 | El sistema debe permitir registrar el peso de cada saco de papa y asociarlo con su variedad correspondiente. | HU02, HU12 |
| RF03 | El sistema debe calcular la cantidad total de sacos, el peso acumulado y los totales por variedad del cargamento. | HU02, HU12 |
| RF04 | El sistema debe permitir registrar el precio acordado de compra para cada variedad de papa. | HU03, HU13 |
| RF05 | El sistema debe permitir registrar el flete según la modalidad acordada, ya sea por kilogramos o por cantidad de sacos. | HU03, HU13 |
| RF06 | El sistema debe permitir registrar adelantos y descuentos asociados a una compra. | HU03, HU13 |
| RF07 | El sistema debe calcular el monto líquido que corresponde pagar al proveedor considerando precio, flete, adelantos y descuentos. | HU03, HU13 |
| RF08 | El sistema debe permitir registrar pagos al contado o en cuotas y mantener actualizado el saldo pendiente del proveedor. | HU04 |
| RF09 | El sistema debe permitir consultar las existencias por variedad, lote y cantidad disponible. | HU05 |
| RF10 | El sistema debe permitir registrar ventas y despachos indicando comprador, destino, vehículo, variedades, cantidad de sacos, precio y flete. | HU06, HU14 |
| RF11 | El sistema debe actualizar el inventario cuando se registre una venta o despacho. | HU05, HU06 |
| RF12 | El sistema debe permitir registrar cobros, pagos, abonos y saldos pendientes de clientes y proveedores. | HU07 |
| RF13 | El sistema debe permitir consultar las cuentas por cobrar y cuentas por pagar con sus respectivos saldos. | HU07 |
| RF14 | El sistema debe permitir registrar los costos de estiba asociados a la carga y descarga de mercadería. | HU08 |
| RF15 | El sistema debe permitir registrar uno o varios grupos de estibadores que hayan participado durante la jornada. | HU08 |
| RF16 | El sistema debe permitir consultar reportes de compras, ventas, inventario, pagos, deudas, costos y resultados comerciales. | HU09 |
| RF17 | El sistema debe permitir consultar tendencias y patrones de precios a partir de la información histórica registrada. | HU10 |
| RF18 | El sistema debe almacenar temporalmente las operaciones autorizadas cuando no exista conexión a Internet. | HU11, HU15 |
| RF19 | El sistema debe sincronizar las operaciones almacenadas localmente cuando se recupere la conexión a Internet. | HU11, HU15 |
| RF20 | El sistema debe permitir que el encargado registre pesajes durante la ausencia del mayorista. | HU12 |
| RF21 | El sistema debe permitir que el encargado registre datos de compras autorizadas durante la ausencia del mayorista. | HU13 |
| RF22 | El sistema debe permitir que el encargado registre datos de ventas autorizadas durante la ausencia del mayorista. | HU14 |
| RF23 | El sistema debe restringir al encargado el acceso a inventario, cuentas, caja, reportes, inteligencia artificial, configuración y administración. | HU12, HU13, HU14, HU15 |