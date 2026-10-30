# Especificación 003: ventas y despachos sin inventario

Estado: alcance reconciliado el 7 de octubre de 2026; implementación y convergencia en curso. Se conserva el identificador y directorio 003 para trazabilidad histórica. Fuente: `docs/sdd/cambio-alcance-sin-inventario.md`, decisión explícita del usuario, y `specs/user-stories.md`. Los actores y permisos comerciales aprobados siguen vigentes. Esta especificación sustituye las reglas anteriores de existencias de 003.

## Objetivo y trazabilidad

Registrar ventas mayoristas y despachos independientes de las compras, conservando cantidades, pesos, precios, comprador y datos de despacho; generar caja o saldo por cobrar con evidencia trazable. HU03 y HU11; RF03/RF04, RF10–RF13, RF15, RF17/RF18, RF21/RF22. RF08/RF09 retirados, códigos reservados. Se conservan precisión monetaria, aislamiento, autorización e idempotencia de CL-04/CL-11/CL-12; disponibilidad, valoración y reposición de stock quedan retiradas. No introducir una fórmula de margen nueva.

## Actores

El Mayorista gestiona compradores, crédito, ventas, cobros, reportes, anulaciones y devoluciones comerciales. El Encargado registra ventas/despachos únicamente durante un reemplazo vigente y autorizado, dentro de sus permisos aprobados. La API valida sesión, negocio y autorización; ocultar controles no reemplaza esa validación.

## Flujo y requisitos

1. Seleccionar comprador activo del negocio; registrar destino y vehículo/conductor cuando correspondan.
2. Seleccionar variedades activas del negocio y registrar por línea sacos, peso neto positivo, base de precio y tarifa. Desde CL-13, la combinación variedad/calidad/procedencia identifica una línea; una variedad puede aparecer con combinaciones distintas. No exigir recepción, cargamento, lote ni versión de stock. El Mayorista registra/edita referencias desde los formularios de operación, sin módulo independiente de Catálogo, conforme a la decisión del 14 de octubre.
3. Calcular subtotales, descuentos, flete y total con precisión central. Conservar las reglas y límites monetarios aprobados; no inferir descuentos de precios históricos.
4. Definir contado o crédito. Las cuotas deben tener fechas civiles válidas, importe positivo y sumar el total. Mantener límite de crédito y excepción exclusiva del Mayorista conforme al contrato existente.
5. Revisar el acuerdo antes de confirmar. La confirmación registra venta/líneas una sola vez y genera caja o cuenta/cuotas y flete. No consulta, reserva ni modifica existencias.
6. Conservar UUID offline y reutilizarlo ante respuesta perdida; la confirmación central devuelve el mismo resultado sin repetir dinero o auditoría. Una venta pendiente no se presenta como confirmada.
7. Consultar historial por fecha/comprador y generar/compartir comprobante con variedad, cantidades, precios, despacho y pago. Conservar estados y trazabilidad.
8. Anulación autorizada con UUID, motivo y versión de venta; conservar original y revertir efectos financieros una vez. Mantener controles de cobros y flete liquidado. No restaurar stock. La venta con devolución comercial no se anula por este recorrido.
9. Devolución comercial exclusiva del Mayorista: UUID, versión esperada, motivo, líneas de la venta e importe bruto autorizado. Acumulados de sacos/peso e importe no superan los originales de cada línea. No exigir ni crear reposición física de inventario.
10. Mantener prorrateo half-up del descuento de venta y residuo final; ajustar flete solo explícitamente hasta el importe cobrado. En contado produce egreso; en crédito reduce saldo y vencimientos abiertos más lejanos, con egreso solo por excedente. Incrementar versión, invalidar PDF vigente y generar comprobante vinculado una vez. No calcular reducción de coste/margen por lote nueva.
11. Conservar datos, lotes, movimientos y valoraciones históricos como evidencia; no convertirlos en disponibilidad vigente ni eliminarlos. Las líneas antiguas conservan su referencia original y obtienen variedad del lote históricamente asociado.

## Aceptación verificable

- Sin compras previas: una venta de 30 sacos de una variedad activa se confirma con cantidades/peso/precio y efecto financiero único, sin rechazo por disponibilidad.
- Compra 100 y venta 30: ambos registros permanecen; no existe un saldo de 70, movimiento de stock ni alerta por existencias.
- Reintento/resultado perdido: mismo UUID devuelve la venta original; no duplica línea, cobro, cuenta, cuota, flete o auditoría.
- Aislamiento: comprador/variedad/vehículo de otro negocio o catálogo no elegible se rechaza antes de guardar la venta.
- Validación: peso nulo/negativo, sacos no positivos, tarifa inválida, variedades repetidas, descuentos excesivos o cuotas incorrectas no generan efectos.
- Crédito: respeta el límite y la autorización aprobada; cada cuota queda vinculada a una cuenta por cobrar de la operación.
- Anulación: versión incorrecta o cobro no revertido/flete liquidado impide anular; reintento del reverso no duplica egreso ni versión.
- Devolución: sin reposición de stock previa se admite compensación dentro de cantidades e importe originales. Superar el acumulado se rechaza; reintento devuelve el resultado previo y no duplica crédito/egreso.
- Comprobante e historial: muestran variedad y datos de cada operación, incluyendo las anteriores a la migración, sin requerir stock disponible.

## Experiencia y convergencia

Separar despacho, variedades, liquidación y confirmación. Mostrar estados de carga, catálogos vacíos, error/reintento, validación, envío pendiente, confirmación y respuesta perdida. Mantener uso táctil/accesible y adaptación móvil/tablet, con revisión visual contra Figma MERCADO. La ausencia de capturas/contexto de una pantalla no permite declarar fidelidad completa. Plan y tareas permanecen abiertos hasta validar API/PostgreSQL, web/Android, offline, comprobantes y diseño.


## Protección de edición y continuidad offline

Antes de guardar en la cola, cualquier salida del formulario con datos en edición debe avisar que aún no se han conservado. Cancelar la salida mantiene comprador, despacho, líneas, flete y cuotas. Atrás y cierre/recarga web reciben protección cuando la plataforma lo permite; una sesión revocada no conserva acceso. Mientras se guarda/envía, bloquear edición y salidas que puedan alterar el acuerdo. Una línea en edición se agrega o se vacía explícitamente antes de revisar el acuerdo: no ignorarla silenciosamente.

Después de guardado duradero, la venta pendiente se recupera desde la cola cifrada de la misma identidad, manteniendo cuerpo y UUID al reiniciar. No presentarla como venta central ni duplicarla para resolver una respuesta perdida. Al restablecer conexión, comprobar resultado central y enviar solo si no existe. Validar cantidades/importe del mismo acuerdo y un único efecto financiero.


## HU11: búsqueda del historial de ventas/despachos

Consultar todas las operaciones del negocio, incluidas confirmadas/anuladas y participantes posteriormente desactivados. Permitir fecha inicial/final opcionales y nombre de comprador (subcadena literal sin distinción de mayúsculas), combinables con estado. La fecha es la de registro central de la operación, interpretada en America/Lima: inicio inclusivo y día final completo. Fechas inexistentes o invertidas se rechazan; no convertirlas silenciosamente. No consultar existencias.

La interfaz muestra el comprador, destino, fecha comercial, estado y total; permite abrir el detalle y paginar el conjunto filtrado completo con su total central. No limitar la búsqueda a los cien elementos previamente cargados. Al editar criterios, retirar resultados anteriores y descartar respuestas tardías; una consulta fallida muestra error/reintento, no un falso estado vacío. Limpiar vuelve al historial sin filtros. No ampliar permisos del Encargado.

## Características comerciales RF04 / CL-13 — 14 de octubre de 2026

Calidad comercial y lugar de origen de la papa se capturan por saco de compra y línea de venta, de forma independiente de proveedor, comprador y variedad. El Mayorista administra las dos listas y el Encargado selecciona opciones existentes solo en sus operaciones autorizadas. «No informada» es una opción explícita; no reconstruir características históricas a partir de otros campos. Conservar etiquetas en el hecho, herencia de devoluciones y consultas/PDF trazables aunque se edite o desactive el catálogo. Sin inventario ni cambios de criterios predictivos. Decisión y secuencia de confirmación: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`. Contratos y plan transversal: `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`. Implementación y convergencia todavía pendientes; no declarar RF04 terminado por el catálogo.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Artefactos SDD relacionados

[Plan](plan.md), [tareas](tasks.md) y [checklist](checklists/requirements.md). El cambio transversal de mensajería está en la especificación 008.
