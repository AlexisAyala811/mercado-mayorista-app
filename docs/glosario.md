# Glosario

> **Proyecto:** Gestión comercial mayorista de papa · **Actualización:** 29 de octubre de 2026

## Términos del negocio

| Término | Significado |
| --- | --- |
| Mayorista | Dueño o responsable del negocio; tiene acceso completo. |
| Encargado | Persona que opera en ausencia del Mayorista con un reemplazo vigente. |
| Reemplazo | Autorización temporal (máximo 24 h) que el Mayorista da a un Encargado para registrar pesajes, compras y ventas. |
| Recepción | Llegada de un cargamento de papa de un proveedor; agrupa los sacos pesados. |
| Pesaje | Registro de cada saco con su peso bruto, tara y peso neto. |
| Tara | Peso del envase que se descuenta del peso bruto. |
| Liquidación de compra | Cálculo y confirmación de lo que se debe al proveedor: bruto − flete − adelantos − descuentos. |
| Líquido | Importe final por pagar al proveedor. |
| Despacho | Envío de la mercadería vendida a un comprador, normalmente de otro departamento. |
| Calidad / procedencia | Clasificación comercial de la papa y su lugar de origen, registradas por saco y por línea de venta. |
| Flete | Costo de transporte, por kilogramo o por saco. |
| Estiba | Carga y descarga realizada por un grupo de trabajadores. |
| Cuenta por pagar / por cobrar | Deuda con un proveedor o de un comprador, originada en una compra o venta a crédito. |
| Cuota | Parte de una cuenta con su fecha de vencimiento. |
| Abono | Pago parcial o total aplicado a una cuenta. |
| Reverso | Anulación de un abono; restaura el saldo y genera el movimiento de caja contrario. |
| Devolución comercial | Reducción autorizada del importe de una venta; compensa la deuda o devuelve dinero. |
| Comprobante interno | PDF de una compra, venta o devolución; no es factura electrónica. |
| Estado de cuenta | Documento con lo que debe un comprador, sus abonos y vencimientos (HU16). |

## Términos técnicos

| Término | Significado |
| --- | --- |
| UUID de operación (`clientOperationId`) | Identificador que genera la tablet para cada operación; permite reintentar sin duplicar. |
| Idempotencia | Repetir una operación produce el mismo resultado que hacerla una vez. |
| Versión | Contador de cambios de un registro; detecta modificaciones concurrentes. |
| `409 Conflict` | Respuesta cuando la versión no coincide o un UUID se reutilizó con otros datos. |
| Compensación | Registro que neutraliza el efecto de otro sin borrarlo. |
| Monolito modular | Una sola aplicación desplegada, organizada internamente en módulos. |
| C4 | Modelo de diagramas en cuatro niveles: contexto, contenedores, componentes y código. |
| CL-xx | Clarificación aprobada durante la especificación; ver [decisiones arquitectónicas](01-analisis-de-sistema/07-decisiones-arquitectonicas.md). |
| ADR | Registro de una decisión arquitectónica con su contexto y consecuencias. |
| SDD | Desarrollo guiado por especificaciones: especificar, aclarar, planificar, dividir en tareas, implementar y verificar. |
| RPO / RTO | Pérdida máxima de datos aceptable / tiempo máximo de recuperación tras una falla. |
