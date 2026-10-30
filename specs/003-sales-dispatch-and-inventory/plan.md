# Plan técnico 003: ventas, despachos e inventario

## Revisión previa y controles accesibles — 21 de octubre de 2026

La revisión de una venta a crédito debe mostrar el vencimiento y el importe de cada cuota ya capturada, además de los totales y forma de pago. Es una proyección del acuerdo validado, sin crear reglas ni escrituras nuevas. Los controles para quitar una línea o cuota deben identificar la fila y el concepto en su nombre accesible; el importe de cada cuota debe identificarse por su número. Verificar que la revisión rechaza cuotas incompletas o cuya suma no coincide y que abrir/cancelar la revisión no encola ni envía la venta.

**Estado:** aprobado para implementación

## Objetivo del corte

### Identificación accesible del historial — 26 de octubre de 2026

Mantener el texto visual «Abrir detalle», añadiendo en su nombre accesible el tipo de operación, comprador, fecha de Lima e identificador central. Las filas con el mismo participante y fecha deben seguir siendo distinguibles. No cambiar filtros, permisos ni efectos de operación.

Registrar una venta y despacho con detalle por lote y variedad, proteger la disponibilidad de inventario, crear el cobro o saldo correspondiente y conservar evidencia de cada efecto.

## Diseño técnico propuesto

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Dominio | Venta, línea de venta, reserva, despacho, movimiento de inventario, cobro y saldo. | La disponibilidad y los totales son reglas puras y verificables. |
| Aplicación | Orquestar borrador, validación, resumen, confirmación, anulación y devolución. | No confirma el descuento solo desde la interfaz. |
| Datos locales | Mantener borradores y operaciones pendientes identificables. | No convierte una reserva local en confirmación central. |
| Sincronización | Resolver confirmación, respuesta perdida y conflicto de inventario. | Depende de CL-04 y de la política de reservas. |
| Interfaz | Guiar por comprador, despacho, lotes, liquidación y resumen. | Expone disponibilidad y estados mediante texto, icono y color. |
| Devolución comercial | Confirmar de forma idempotente el importe autorizado y compensar cuenta o caja. | Consume cantidades previamente devueltas físicamente, conserva hechos originales e invalida el comprobante anterior. |

## Invariantes que se deberán probar

1. Una línea de venta no puede confirmar una cantidad mayor que la disponibilidad autorizada del lote.
2. Una confirmación produce a lo sumo un movimiento de inventario por cada línea aprobada.
3. Venta al contado y venta al crédito producen efectos financieros distintos y trazables.
4. El comprobante representa exactamente la venta confirmada, sin reconstruir importes divergentes.
5. Una anulación, devolución o merma autorizada ajusta efectos mediante una operación trazable, nunca eliminando el historial.
6. Una devolución comercial no puede exceder las cantidades físicamente devueltas, el importe restante de la línea ni el flete originalmente cobrado.
7. El crédito reduce vencimientos abiertos desde el más lejano y el excedente se devuelve por caja una sola vez.

## Contratos y decisiones previas

1. Elegibilidad, reserva, vencimiento de reserva y disponibilidad de lote.
2. Identificador idempotente, prioridad y resolución de conflictos entre tablets.
3. Límites de descuento, autorización de cambio de precio y validación de crédito.
4. CL-12: devolución comercial idempotente, descuento proporcional, ajuste explícito de flete, compensación de cuenta o caja y comprobante interno.
5. Contrato de comprobante interno y permisos de compartición, coordinado con 006.

## Estrategia de verificación

- Pruebas de dominio de disponibilidad, totales, descuentos, flete, contado y crédito.
- Pruebas de contratos para un único descuento, saldo o cobro ante reintentos.
- Pruebas de flujo de venta, rechazo por stock, crédito, anulación y comprobante.
- Validación de DS-020 a DS-023 en tablet y revisión de accesibilidad.
- Convergencia con las especificaciones 004, 005 y 006 por sus efectos compartidos.

## Bloqueadores

| ID | Bloquea |
|---|---|
| CL-04 | Idempotencia, conflictos, confirmación y rechazo de operaciones de inventario. |
| CL-05 | Límites de venta y despacho del Encargado durante reemplazo. |
| CL-07 | Elegibilidad, reserva y disponibilidad de lote. |




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU03: Registrar venta/despacho sin validación ni descuento de stock.
- [ ] Verificar HU11: Consultar historial de ventas/despachos por fecha o participante.


## Corte vigente sin inventario — 7 de octubre de 2026

La especificación reconciliada sustituye disponibilidad/valoración/reposición. Añadir `sale_lines.variety_id`, rellenar desde el lote histórico con aislamiento por negocio y exigir variedad para todas las líneas. Conservar `lot_id`/`lot_version` antiguos; hacerlos anulables para ventas nuevas. Unicidad de variedad por venta nueva mediante índice parcial, sin impedir varias líneas históricas de la misma variedad desde lotes distintos. Migración transaccional y fail-fast ante relaciones históricas incompatibles; no borrar datos. La reversión se rechaza si existen líneas nuevas sin lote para impedir pérdida de datos.

Nuevo POST /sales: cada línea exige `varietyId`, `sacks`, `weightKg`, `priceBasis`, `unitPriceCents`; retirar `lotId`/`expectedLotVersion` de entrada, rechazarlos con whitelist estricta. Servicio valida variedad activa del negocio y conserva cálculo, caja/crédito/cuotas, flete, auditoría y UUID. No crear coste de venta ni movimiento de inventario. Anulación conserva únicamente reversos financieros y trazabilidad. Devolución valida acumulados contra la venta, sin consulta física/valoración; campos históricos de reducción de coste quedan nulos para operaciones nuevas.

Comprobantes, precios, series y suficiencia analítica consumen variedad de línea, no lote. Mantener relaciones históricas almacenadas, sin usarlas como saldo. Formulario usa catálogo de variedades y no llama /inventory. Colas antiguas con contrato de lote deben presentar incompatibilidad visible y revisión del usuario; no convertir silenciosamente payloads de dinero pendientes.

Verificar migración/backfill y venta independiente sin compras en PostgreSQL, UUID/versión/compensaciones, pagos y restricciones, comprobantes y consultas. Luego recorridos web/Android y convergencia visual. Documentación académica corresponde a la tarea documental; no regenerar el DOCX antiguo.


## Contrato de historial filtrado

GET /sales conserva limit/offset (máximo 100) y añade from/to (fechas civiles opcionales), search (nombre de comprador, texto literal máximo 160), buyerId (UUID opcional) y state. DTO estricto rechaza campos desconocidos. Consulta paginada ordena createdAt e id descendentes y delimita negocio tanto en venta como en el enlace a comprador; no filtra comprador por isActive para conservar historia. Proyectar buyerName sin exponer el objeto de contacto asociado. Las fechas usan límites PostgreSQL America/Lima, alineados con 006/007. Referencia TypeORM 1.1.1: leftJoinAndMapOne, skip/take, getManyAndCount en https://github.com/typeorm/typeorm/blob/1.1.1/docs/docs/query-builder/1-select-query-builder.md.

Frontend consulta páginas de 20, mantiene criterios aplicados y elimina resultados al editar. Secuencia de petición ignora respuestas obsoletas/desmontadas. Validar fechas civiles antes de enviar y mostrar rango/conteo, estado vacío diferenciado, error y reintento. Conservar UUID/cola y lógica de anulación/devolución; este corte no modifica efectos financieros. Verificar límites nocturnos, participante desactivado, búsqueda literal, aislamiento, segunda página y respuestas tardías mediante PostgreSQL/pruebas de pantalla/API y navegador. Convergencia visual de este marco permanece pendiente por acceso Figma.

Una página posterior vacía por cambios concurrentes se recupera con una única consulta de la primera página conservando criterios; no reintentar recursivamente ni mantener un rango invertido. Evidencia del corte: `docs/sdd/verificacion-historial-ventas-2026-10-07.md`.

Historial/detalle de ventas monta un espacio propio por token. Cambiar sesión retira resultados, filtros, borradores y diálogos anteriores. Después de cada await de guardado/envío/lectura, comprobar que el espacio sigue activo antes de enviar desde esa pantalla, navegar o publicar estados. No borrar ni reenviar operaciones ya conservadas: siguen en la cola de su identidad y su resultado central pertenece al coordinador. Compartir usa la comprobación de continuidad antes del panel de plataforma, con una sola acción simultánea. Bloquear campos y retorno mientras se guarda/envía o prepara el comprobante; mantener las reglas financieras/UUID aprobadas.

Proteger un borrador local de anulación/devolución al volver al historial, remover la ruta o reemplazar el detalle. Cancelar conserva motivo/flete/líneas; descartar limpia únicamente la edición y ejecuta la acción de navegación originalmente solicitada. No borrar la cola ni revertir confirmaciones. Una vez que enqueue confirma conservación, la edición deja de ser un borrador sin guardar y el cuerpo queda a cargo de la cola; reiniciar campos locales sin alterar ese cuerpo. Abrir otra venta reinicia motivo, flete y líneas. Añadir beforeunload en web sin afirmar persistencia ante cierre forzado o muerte del proceso. Logout/caducidad sigue retirando datos de sesión. La navegación se consulta mediante el alias de React Navigation instalado en Expo Router SDK 57; usePreventRemove no garantiza procesos externos ni remociones por render condicional.

Después de una confirmación central, un fallo de consulta del detalle no convierte la operación en fallida ni habilita una nueva mutación con la versión vieja. Conservar mensaje/referencia confirmados, marcar el detalle como desactualizado y bloquear campos/acciones hasta recuperar su versión central. Reintentar consulta ejecuta únicamente GET del detalle y refresca el historial; nunca enqueue ni envío de la operación confirmada. Descartar una respuesta de reintento si se cerró/cambió detalle o sesión. Salir del detalle ya conservado no borra el resultado central.

El recorrido real de Atrás web mostró desmontaje sin beforeRemove al entrar desde el menú; recargar directamente la ruta sí mostró el aviso, con URL ya desplazada. Complementar usePreventRemove en web mediante la API pública Navigation: cancelar únicamente eventos traverse cancelables con destino identificable, antes de que cambie el historial; abrir el mismo diálogo y continuar hacia la clave original mediante traverseTo después del descarte. No duplicar entradas ni reescribir estados privados de Expo. Detectar disponibilidad; conservar las guardias existentes para Android y beforeunload. Verificar Atrás/Adelante, cancelación con URL y campos conservados, confirmación del destino, sesión retirada y fallos de reanudación; los navegadores sin esta capacidad requieren un gate separado y no se consideran verificados por la prueba del navegador QA.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
