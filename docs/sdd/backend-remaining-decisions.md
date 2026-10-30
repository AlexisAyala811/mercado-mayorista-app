# Decisiones restantes para cerrar el backend comercial

**Estado:** CL-11 y CL-12 aprobadas  
**Fecha de propuesta:** 25 de septiembre de 2026  
**Fecha de aprobación:** 28 de septiembre de 2026

Este paquete completa dos reglas financieras que no quedaron definidas en el paquete inicial del backend. El usuario aprobó íntegramente las propuestas recomendadas de CL-11 y CL-12; desde esta fecha constituyen reglas vigentes para la especificación, implementación y verificación.

## CL-11 — utilidad estimada

### Propuesta recomendada

1. El indicador se denomina **margen comercial estimado** para no presentarlo como utilidad contable o tributaria.
2. Se reconoce cuando la venta queda confirmada, aunque esté pendiente de cobro. El periodo se determina por la fecha de confirmación de la venta.
3. El ingreso de mercadería es el importe bruto de las líneas menos el descuento de venta. El flete cobrado al comprador se muestra por separado y no se considera ingreso de mercadería.
4. El costo de mercadería vendida se obtiene del lote de origen con la misma base aprobada en la compra: kilogramos o sacos efectivamente vendidos. Los adelantos son forma de pago y no modifican el costo.
5. El descuento de compra se distribuye entre los lotes de la recepción en proporción a su importe bruto. El redondeo usa mitad hacia arriba y el residuo se asigna al último lote para conservar el total exacto.
6. El flete de compra se presenta por separado. No aumenta el costo del lote porque la liquidación aprobada actualmente lo descuenta al proveedor y luego lo paga al transportista; el efecto neto ya forma parte del costo liquidado. Si el negocio asume el flete adicionalmente, deberá registrarse como un costo independiente.
7. La estiba de descarga vinculada a la compra y la estiba de carga vinculada a la venta se reconocen como costos del periodo en que se liquidan. El flete de venta se reconoce como costo del periodo en que se liquida.
8. El margen estimado es: ingreso de mercadería menos costo de mercadería vendida menos flete de venta liquidado menos estiba liquidada. El reporte muestra cada componente, operaciones sin costo determinable y fecha de corte.
9. Una anulación excluye la venta y sus cantidades restauradas. Una devolución comercial reduce ingreso y costo únicamente cuando se confirma mediante la regla CL-12.

### Alternativa descartada en esta decisión

Capitalizar flete de compra y estiba de descarga en el costo del lote. Esta alternativa no forma parte de CL-11 aprobada.

## CL-12 — efecto financiero de devoluciones de venta

### Propuesta recomendada

1. Se distinguen `physical-return` y `commercial-return`. La devolución física solo repone cantidades cuando aún no se ha autorizado el efecto monetario.
2. La devolución comercial requiere UUID idempotente, versión esperada de venta, motivo, líneas y un importe autorizado por línea. Nunca elimina la venta ni los movimientos originales.
3. El importe máximo reembolsable de una línea es su importe original menos devoluciones comerciales previas. Los descuentos se prorratean según el importe bruto devuelto, con ajuste del último renglón para conservar el total exacto.
4. El flete ya prestado no se devuelve de forma automática. El Mayorista puede incluir un ajuste explícito de flete, limitado al importe cobrado originalmente y auditado.
5. En venta al contado se crea una salida de caja compensatoria. En venta a crédito se reduce primero el saldo y los vencimientos abiertos más lejanos; si la devolución supera el saldo pendiente, la diferencia crea una salida de caja.
6. La operación incrementa la versión de la venta, invalida el PDF vigente y genera un comprobante interno de devolución vinculado a la venta.
7. Solo el Mayorista confirma el efecto comercial. El Encargado puede registrar la devolución física durante un reemplazo vigente.

## Efecto de la aprobación

La aprobación habilita:

1. migración de valoración y devoluciones comerciales;
2. servicio transaccional de devolución con caja o cuenta;
3. consulta de margen comercial estimado y sus componentes;
4. comprobante interno de devolución;
5. pruebas de exactitud, idempotencia, concurrencia y aislamiento por negocio.

## Registro de decisión

- **Decisión:** aprobar íntegramente las propuestas recomendadas de CL-11 y CL-12.
- **Justificación:** permite calcular un margen comercial trazable y confirmar devoluciones monetarias sin alterar los hechos originales ni duplicar efectos.
- **Responsable y fecha:** dirección del proyecto, 28 de septiembre de 2026.
- **Artefactos afectados:** especificaciones 003 y 006, planes, tareas, contrato HTTP, modelo de datos, comprobantes, reportes y evidencia PostgreSQL.
- **Evidencia de aprobación:** instrucción explícita del usuario «Apruebo CL-11 y CL-12 recomendadas» en la tarea técnica.
