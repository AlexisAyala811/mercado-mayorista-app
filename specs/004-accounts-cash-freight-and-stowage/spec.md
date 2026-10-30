# Especificación 004: Cuentas, caja, flete y estiba

**Estado:** aprobada para implementación

## Objetivo

Controlar obligaciones con proveedores, cobranzas de compradores, pagos, abonos, flete y estiba, manteniendo saldos consistentes y una liquidación diaria trazable.

## Trazabilidad

- HU02: monto líquido del proveedor, flete, adelantos y forma de pago.
- HU04: consulta de obligaciones y cobranzas por vencimiento.
- RF07: cálculo de flete, adelantos, descuentos y monto líquido.
- RF13 y RF14: cuentas por cobrar y por pagar.
- RF15: pagos, cobros y liquidación diaria de flete y estiba.
- RF16 y RF17: alertas y reportes de cuentas, costos y resultados.
- RF22: auditoría de movimientos.
- AC03: un único efecto por operación confirmada.
- DA02: consistencia de saldos ante reintentos.

## Actores

| Actor | Participación |
|---|---|
| Mayorista | Consulta y gestiona cuentas, caja, vencimientos, pagos, cobros, flete, estiba y reportes. |
| Encargado | Durante un reemplazo vigente y autorizado, registra únicamente los datos de compra y venta permitidos; no accede a cuentas ni caja. |

## Flujos principales

### Cuenta por pagar al proveedor

1. Una compra liquidada identifica importe bruto, flete, adelantos, descuentos y monto líquido.
2. Si la forma de pago es en cuotas, se crea una cuenta por pagar con saldo inicial y vencimientos.
3. El Mayorista registra abonos o cancelación.
4. El sistema actualiza el saldo una sola vez, conserva el origen y genera alertas según vencimiento.

### Cuenta por cobrar al comprador

1. Una venta a crédito crea una cuenta por cobrar con saldo inicial, vencimiento y compromiso de pago.
2. El Mayorista registra cobros parciales o totales.
3. El sistema actualiza el saldo, relaciona el cobro con la venta y refleja el movimiento en caja.

### Liquidación de flete y estiba

1. El Mayorista registra el acuerdo de flete asociado a la compra o venta.
2. Registra los grupos de trabajadores y el costo de estiba de carga o descarga.
3. Al finalizar el día, revisa las operaciones y liquida los importes aprobados.
4. El sistema conserva la relación entre liquidación, operaciones de origen y pagos realizados.

## Requisitos funcionales verificables

1. Una cuenta por pagar o cobrar conserva su operación de origen, contraparte, saldo inicial, vencimientos, abonos, estado y auditoría.
2. Un abono o cobro confirmado actualiza el saldo una sola vez y registra su movimiento de caja.
3. El sistema distingue pago al contado, pago en cuotas, adelanto, abono y cancelación.
4. El flete puede asociarse a una compra o venta e indicar si se calcula por kilos o sacos según el acuerdo.
5. La estiba se registra por grupo de trabajadores y operación de carga o descarga.
6. La liquidación diaria relaciona flete y estiba con sus operaciones y pagos de origen.
7. El sistema muestra obligaciones y cobranzas ordenadas por vencimiento, saldo y estado.
8. El sistema genera alertas de cuentas vencidas, próximas a vencer y operaciones pendientes.
9. Los reportes reflejan compras, ventas, costos de transporte y estiba, utilidad estimada y estado de cuentas.
10. Las anulaciones o correcciones autorizadas preservan el historial y no permiten saldos inconsistentes.

## Criterios de aceptación

### Escenario: Compra en cuotas

**Dado** una compra liquidada con pago en cuotas, **cuando** se confirma la forma de pago y vencimientos, **entonces** el sistema crea una única cuenta por pagar con saldo inicial igual al monto líquido pendiente.

### Escenario: Abono al proveedor

**Dado** una cuenta por pagar activa, **cuando** el Mayorista registra un abono válido, **entonces** el sistema reduce el saldo una sola vez, conserva el abono y registra el movimiento de caja asociado.

### Escenario: Cobro de una venta

**Dado** una venta a crédito con saldo pendiente, **cuando** el Mayorista registra un cobro, **entonces** el sistema actualiza la cuenta por cobrar y refleja el cobro en caja sin modificar el detalle original de la venta.

### Escenario: Liquidación diaria

**Dado** operaciones con flete y estiba registrados, **cuando** el Mayorista realiza la liquidación diaria, **entonces** el sistema muestra el origen de cada importe y conserva el resultado de la liquidación para consulta y auditoría.

## Diseño y experiencia

- Las pantallas de deudas deben diferenciar cuentas por pagar y por cobrar, saldo, vencimiento, estado y último movimiento.
- Los colores de estado se complementan con etiquetas de texto y filtros accesibles.
- Antes de confirmar un abono, cobro o liquidación, debe mostrarse el saldo anterior, el importe y el saldo resultante.
- Las listas deben permitir buscar, filtrar y abrir el detalle sin mezclar movimientos de negocios distintos.
- Figma requiere flujos de detalle de cuenta, registro de abono/cobro y liquidación diaria; la pantalla actual de “Deudas” no cubre estas acciones.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones aprobadas

1. Definir reglas de vencimiento, pago anticipado, mora y orden de aplicación de abonos.
2. Definir tratamiento de pagos que superan el saldo, reversos y anulaciones de movimientos de caja.
3. Definir fórmula, unidades y redondeo de flete y estiba para cada acuerdo.
4. Definir datos mínimos de los grupos de trabajadores y su liquidación.
5. Definir qué reportes puede consultar cada rol y el periodo de disponibilidad de los datos.



## Alineación de historias del 7 de octubre de 2026

HU04: consulta de cuentas; HU08: registro de abonos; HU09: estiba por grupo. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.

## Características comerciales RF04 / CL-13 — 14 de octubre de 2026

La edición de Datos maestros debe conservar los campos si se cancela un cambio de lista, reemplazo de registro o salida. Confirmar antes de descartar cambios no guardados. Abrir sin modificar o restaurar los valores originales no requiere aviso. Un guardado en curso debe conservar su resultado; un fallo permite corregir/reintentar con los datos presentes. Confirmar descarte no guarda ni desactiva el registro. No implica persistir el borrador tras cerrar el proceso.

Calidad comercial y lugar de origen de la papa se capturan por saco de compra y línea de venta, de forma independiente de proveedor, comprador y variedad. El Mayorista administra las dos listas y el Encargado selecciona opciones existentes solo en sus operaciones autorizadas. «No informada» es una opción explícita; no reconstruir características históricas a partir de otros campos. Conservar etiquetas en el hecho, herencia de devoluciones y consultas/PDF trazables aunque se edite o desactive el catálogo. Sin inventario ni cambios de criterios predictivos. Decisión y secuencia de confirmación: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`. Contratos y plan transversal: `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`. Implementación y convergencia todavía pendientes; no declarar RF04 terminado por el catálogo.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Cuotas de operaciones anuladas — 29 de octubre de 2026

Completa T402 (decisión D2 de [integridad y seguridad del backend](../../docs/sdd/decision-integridad-seguridad-backend-2026-10-29.md)).

### Escenario: Anulación de una compra o venta a crédito

- **Dado** una compra o venta a crédito sin abonos vigentes y con flete no liquidado
- **Cuando** el Mayorista la anula con motivo
- **Entonces** la cuenta pasa a `voided` con saldo cero y cada cuota pasa a `voided` con saldo cero
- **Y** ninguna cuota anulada se presenta como pagada ni suma a cobros o pagos realizados
- **Y** no se genera movimiento de caja, porque no hubo dinero recibido ni entregado.

Una cuota `paid` significa saldo efectivamente cancelado por abonos o devoluciones. Las cuotas de cuentas anuladas antes de esta decisión se reclasifican por migración.
