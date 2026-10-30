# Especificación 006: Reportes y comprobantes

> Alcance vigente desde el 7 de octubre: `docs/sdd/cambio-alcance-sin-inventario.md` sustituye los requisitos históricos de existencias, alertas de stock y valoración/margen por lote. La numeración de esos requisitos se conserva para trazabilidad, pero no autoriza su implementación. El reporte vigente mantiene operaciones comerciales, precios, costos registrados y saldos financieros. No se incorpora una fórmula nueva de margen hasta su aclaración.

**Estado:** backend implementado y verificado; composición móvil pendiente

## Objetivo

Ofrecer consultas claras sobre operaciones comerciales y generar comprobantes internos compartibles que respalden compras, ventas y despachos.

## Trazabilidad

- RF12: generación y compartición de comprobante interno o resumen de pedido.
- RF16: alertas de vencimiento, bajo stock y pendientes.
- RF17 y RF18: consultas y evolución de precios.
- HU04: consulta de cuentas; HU11: búsqueda comercial sin inventario.
- AC04 y AC05: aislamiento de información y comprensión por parte del usuario.
- R05 y DA03: autorización y separación por negocio.

## Requisitos funcionales verificables

1. El Mayorista puede consultar compras, ventas, utilidad estimada, costos de estiba y transporte, stock y estado de cuentas dentro de su negocio.
2. Las consultas permiten filtrar por periodo, operación, contraparte, variedad y estado cuando corresponda.
3. El sistema muestra alertas de cuentas vencidas o próximas a vencer, bajo stock y operaciones pendientes.
4. Una compra o venta confirmada puede generar un comprobante interno o resumen de pedido.
5. El comprobante conserva datos de la operación, contraparte, productos, cantidades, importes, forma de pago y referencia trazable.
6. El comprobante solo puede ser consultado o compartido por usuarios autorizados del negocio.
7. El sistema permite comparar evolución de precios por variedad, calidad, procedencia, proveedor, cliente y periodo.
8. El reporte denomina al indicador **margen comercial estimado** y lo presenta separado de una utilidad contable o tributaria.
9. El ingreso de mercadería se reconoce por la fecha de confirmación de la venta y equivale al bruto de líneas menos descuento; el flete cobrado se muestra aparte.
10. El costo de mercadería vendida usa la base y precio aprobados del lote de compra, con el descuento de compra distribuido proporcionalmente entre lotes y residuo en el último.
11. El flete de compra se muestra separado y no se capitaliza. El flete de venta, la descarga de compra y la carga de venta se descuentan en el periodo de su liquidación.
12. El reporte muestra ingreso, costo, flete de venta liquidado, estiba liquidada, margen, fecha de corte y operaciones cuyo costo no puede determinarse.
13. Las anulaciones se excluyen. Las devoluciones comerciales reducen ingreso y costo en su fecha de confirmación.

## Criterios de aceptación

### Escenario: Consulta de cuentas

**Dado** un Mayorista autenticado, **cuando** filtra las cuentas por vencer, **entonces** observa únicamente cuentas de su negocio con saldo, vencimiento, contraparte y estado.

### Escenario: Comprobante de venta

**Dado** una venta confirmada, **cuando** el usuario autorizado genera el resumen de pedido, **entonces** recibe un comprobante interno trazable con los datos de la venta y puede usar el medio de compartición aprobado por la plataforma.

### Escenario: Aislamiento de reportes

**Dado** un usuario autenticado de un negocio, **cuando** consulta un reporte o comprobante, **entonces** no puede recuperar datos ni archivos de otro negocio.

### Escenario: Margen comercial estimado

**Dado** ventas, devoluciones comerciales y costos liquidados dentro de un periodo, **cuando** el Mayorista consulta el margen, **entonces** recibe cada componente, el resultado exacto, la fecha de corte y la lista de operaciones sin valoración determinable, limitados a su negocio.

## Diseño y experiencia

- Los reportes deben comunicar periodo, filtros activos y fecha de última actualización.
- Un comprobante debe ser legible en tablet y adecuado para compartir; no debe mostrar datos que el destinatario no necesita.
- Los indicadores y alertas usan texto, iconos y color de forma complementaria.
- Figma requiere pantallas de detalle de operación, vista previa de comprobante, filtros de reporte y centro de alertas.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones y aclaraciones

1. Definir el formato final del comprobante y los medios de compartición soportados en Android.
2. Definir retención, regeneración y anulación de comprobantes ante correcciones de la operación de origen.
3. CL-11 aprobó la fórmula, el periodo de reconocimiento, la valoración por lote y el desglose del margen comercial estimado.
4. Definir quién puede consultar, exportar o compartir cada tipo de reporte y comprobante.



## Alineación de historias del 7 de octubre de 2026

HU10: comprobantes internos; HU11: búsqueda comercial; HU14: avisos de vencimiento. Canal externo pendiente. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.

## Características comerciales RF04 / CL-13 — 14 de octubre de 2026

Calidad comercial y lugar de origen de la papa se capturan por saco de compra y línea de venta, de forma independiente de proveedor, comprador y variedad. El Mayorista administra las dos listas y el Encargado selecciona opciones existentes solo en sus operaciones autorizadas. «No informada» es una opción explícita; no reconstruir características históricas a partir de otros campos. Conservar etiquetas en el hecho, herencia de devoluciones y consultas/PDF trazables aunque se edite o desactive el catálogo. Sin inventario ni cambios de criterios predictivos. Decisión y secuencia de confirmación: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`. Contratos y plan transversal: `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`. Implementación y convergencia todavía pendientes; no declarar RF04 terminado por el catálogo.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
