# Especificación 002: Recepción, pesaje y liquidación de compra

> Adaptación vigente del 7 de octubre: el cierre conserva sacos, pesos, variedades, estado, versión y auditoría, sin crear lotes/existencias. La corrección autorizada de un pesaje cerrado recalcula el detalle sin acceder al inventario. La liquidación registra importes, flete, caja o cuenta por pagar; no activa mercadería ni fija costo por lote. La anulación conserva los controles y reversos financieros, sin consultar movimientos o revertir saldos de mercadería. Los párrafos históricos de lotes quedan sustituidos por `docs/sdd/cambio-alcance-sin-inventario.md`; datos y migraciones antiguos se preservan.

**Estado:** requiere reconciliación por cambio de alcance del 7 de octubre de 2026

> Aviso de alcance: la recepción y el pesaje conservan cantidades y pesos por operación, pero no crean existencias ni saldo de mercadería. RF08/RF09 están retirados y sus códigos no se reutilizan. Las referencias posteriores a lote de inventario, disponibilidad o efectos de inventario son históricas y no autorizan implementación hasta reconciliar esta especificación con `docs/sdd/cambio-alcance-sin-inventario.md`.

## Objetivo

Registrar una recepción de papa desde la llegada del vehículo hasta la creación del lote y la liquidación de compra, conservando el peso individual de cada saco, los totales por variedad, los costos acordados y el saldo del proveedor cuando corresponda.

## Trazabilidad

- HU01: registro de proveedor, variedades y peso de cada saco durante la descarga.
- HU02: registro de precio, flete, adelantos y forma de pago.
- RF05: datos iniciales de recepción.
- RF06, RF06A y RF06B: captura secuencial de sacos, totales, correcciones autorizadas y cierre de pesaje.
- RF07: importe bruto, flete, adelantos, descuentos y monto líquido.
- RF08: creación del lote y actualización de inventario.
- RF14 y RF15: saldo del proveedor, pagos y liquidación de flete y estiba.
- AC01, AC03 y AC05: captura rápida, un único efecto ante reintentos y uso táctil comprensible.
- DA01 y DA02: continuidad offline e integridad transaccional.
- CL-04 y CL-07: sincronización, estados de confirmación, lote, tara, redondeo y correcciones.

## Actores

| Actor | Participación |
|---|---|
| Mayorista | Ejecuta o supervisa toda la recepción, el pesaje, la liquidación, los pagos y el cierre. |
| Encargado | Cuando reemplaza al Mayorista, registra los datos autorizados de pesaje y compra. Los permisos efectivos dependen de la política definida para el reemplazo. |

## Flujo principal

1. El usuario autorizado inicia una recepción e ingresa fecha, proveedor, teléfono si corresponde, vehículo, conductor y variedades esperadas.
2. Durante la descarga, registra de forma consecutiva el peso de cada saco y su variedad.
3. El sistema muestra en tiempo real sacos, peso y promedio por variedad y para todo el cargamento.
4. Antes del cierre, el usuario autorizado puede efectuar correcciones trazables.
5. El usuario cierra el pesaje; el sistema conserva el detalle individual, calcula los valores aprobados y crea el lote de inventario.
6. El usuario registra precio negociado, flete, adelantos, otros descuentos y forma de pago.
7. El sistema calcula importe bruto, monto líquido y, cuando el pago es en cuotas, el saldo del proveedor con vencimientos y abonos.
8. El sistema registra los efectos autorizados en inventario, cuentas, caja, estiba, reportes y auditoría.

## Requisitos funcionales verificables

1. Se puede crear una recepción con los datos exigidos por RF05.
2. Cada saco registrado conserva su peso, variedad, orden de captura y referencia a la recepción.
3. Los totales por variedad y del cargamento se actualizan al registrar, corregir o retirar un saco antes del cierre autorizado.
4. El cierre de pesaje conserva el detalle individual y genera un lote de inventario asociado a la recepción.
5. El importe bruto y el monto líquido se calculan a partir de los datos de compra aprobados.
6. El flete puede aplicarse según el acuerdo documentado por kilos o por cantidad de sacos.
7. Los adelantos y descuentos autorizados se reflejan una sola vez en el saldo del proveedor.
8. El pago al contado no genera saldo pendiente; el pago en cuotas genera saldo, vencimientos y abonos trazables.
9. Las acciones de creación, corrección, cierre, pago y anulación conservan usuario, fecha y detalle para auditoría.
10. Cuando no existe conexión, las operaciones autorizadas quedan pendientes para sincronización sin duplicar sus efectos confirmados.

## Criterios de aceptación

### Escenario: Pesaje consecutivo

**Dado** una recepción abierta con variedades registradas, **cuando** el usuario registra un saco con su peso y variedad, **entonces** el sistema conserva el registro individual y actualiza los sacos, peso y promedio correspondientes en menos de un segundo de forma local.

### Escenario: Corrección antes del cierre

**Dado** una recepción abierta, **cuando** un usuario autorizado corrige un peso o variedad, **entonces** el sistema recalcula los totales y registra la corrección en la auditoría.

### Escenario: Cierre y lote

**Dado** una recepción abierta con sacos registrados, **cuando** el usuario autorizado cierra el pesaje, **entonces** se conserva el detalle individual y se crea un lote de inventario sin duplicar pesos ni existencias.

### Escenario: Liquidación con saldo

**Dado** un pesaje cerrado, **cuando** se registran precio, flete, adelantos y pago en cuotas, **entonces** el sistema calcula el monto líquido y crea un saldo pendiente con los vencimientos acordados.

### Escenario: Reintento de sincronización

**Dado** una operación local pendiente, **cuando** el dispositivo reintenta enviarla tras recuperar conexión, **entonces** el sistema confirma un único efecto sobre lote, inventario y saldo, incluso si hubo una respuesta previa perdida.

### Escenario: Continuar una recepción confirmada y abierta

**Dado** una recepción guardada en el servidor en estado borrador, en pesaje o pesada, **cuando** el Mayorista vuelve a abrirla desde el historial después de salir o reiniciar, **entonces** puede continuar el pesaje o la liquidación según el estado vigente, conservando identidad, sacos, variedades y versión, sin crear una segunda recepción. Si hay escrituras locales relacionadas sin resolver, primero debe revisar su sincronización. Una recepción liquidada o anulada no se reabre mediante este acceso. La recuperación de borradores exclusivamente locales se mantiene como trabajo de continuidad offline, sin declararla cubierta por esta recuperación central.

## Diseño y experiencia

### Contexto y salida del pesaje

La composición de COMPRA presenta el usuario actual y los datos conservados de proveedor, celular y fecha; una recepción recuperada mantiene su fecha original. El resultado muestra los totales por variedad además del cargamento, excluyendo los sacos anulados. Los controles inferiores permiten volver al historial o al menú y solicitar el cierre explícito. Si hay un peso o corrección en edición todavía no guardados, la salida requiere confirmación: cancelar conserva la edición y salir conserva los sacos registrados sin enviar el peso pendiente. Durante una escritura, estos controles quedan deshabilitados.

### Revisión de liquidación

Después del cierre se conserva el detalle bloqueado y se editan precio global de la recepción, base de cálculo, flete, adelantos, otros descuentos y forma de pago. Antes de enviar, la interfaz muestra importes provisionales derivados del peso neto y los sacos vigentes; sin un precio válido mantiene los importes pendientes y no muestra una liquidación confirmada. Las deducciones no pueden superar el bruto. En crédito, cada cuota necesita una fecha existente e importe positivo y la suma debe igualar el líquido. La confirmación previa muestra bruto, flete, adelantos, descuentos, líquido y condición de pago; solo la respuesta central acredita efectos comerciales. Salir con términos editados requiere confirmación y cancelar conserva la edición.

### Recuperación de captura sin conexión

Una recepción iniciada en este dispositivo conserva en la cola cifrada su identidad de creación y el contexto de nombres necesario para reconocer proveedor, vehículo y variedades. Al reabrirla desde Operaciones del dispositivo después de reiniciar, se reconstruyen los sacos y versiones en orden usando las operaciones guardadas, sin registrar otra creación ni reenviar automáticamente. Los totales y estados reconstruidos son locales y se identifican como pendientes de confirmación central. Una liquidación ya enviada, una anulación, un rechazo/conflicto o una secuencia que no se puede reconstruir impiden seguir editando y remiten a revisión de sincronización. Si todas las operaciones están confirmadas, la continuación usa la identidad central y vuelve a consultar su estado. El contexto de presentación no se agrega al contrato comercial de la API.

- La operación mantiene las etapas de datos de recepción, captura de sacos, cierre, liquidación y confirmación. Por instrucción del usuario del 6 de octubre de 2026, la composición amplia debe reproducir COMPRA de Figma, agrupando captura y paneles de resultado, flete y resumen; los pasos separados pueden mantenerse en tamaños compactos. La composición visual no elimina los cierres explícitos ni permite liquidar un pesaje abierto.
- La captura de peso debe priorizar velocidad, legibilidad y confirmación inmediata.
- Deben existir estados visibles de operación pendiente, confirmada y rechazada durante sincronización.
- El cierre de pesaje debe requerir una confirmación explícita y mostrar el resultado que quedará bloqueado o sujeto a corrección autorizada.
- Los colores no pueden ser el único indicador de estado.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones aprobadas

1. Definir estados del lote antes y después de precio, pago y confirmación central (CL-07).
2. Definir tara, unidad y precisión de peso, redondeo y tratamiento de correcciones posteriores al cierre (CL-07).
3. Definir si el lote está disponible para venta inmediatamente después del cierre de pesaje o después de otra confirmación (CL-07).
4. Definir cómo se resuelven conflictos entre tablets, respuesta perdida y rechazo central durante sincronización (CL-04).
5. Definir reglas detalladas de estiba, grupos de trabajadores y liquidación diaria.
6. Definir los límites de modificación, anulación y reapertura de una recepción cerrada.



## Alineación de historias del 7 de octubre de 2026

HU01/HU02: recepción, pesaje y compra; HU11: búsqueda del historial de estas operaciones. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.

## Historial de compras y pesajes (HU11)

El Mayorista puede buscar todas las recepciones del negocio por fecha de recepción registrada (`receivedOn`), nombre literal de proveedor y estado. Fechas opcionales, inclusivas, civiles, sin convertirlas a fecha UTC de creación. Mostrar proveedor, fecha, conductor y estado; conservar operaciones de proveedores desactivados. Los resultados se consultan en páginas de 20, sin truncar el conjunto en 100. Orden estable por fecha de recepción, creación e identificador descendentes.

Editar filtros retira los resultados anteriores; una respuesta tardía no sustituye criterios nuevos. Distinguir carga, consulta vacía y error con reintento. Fechas inexistentes y rangos invertidos se rechazan. Abrir y cerrar el detalle conserva página y filtros; continuar pesaje o liquidación mantiene la identidad de recepción. Si una página posterior queda vacía por cambios concurrentes, consultar la primera una sola vez con los mismos criterios. Ningún filtro ni detalle representa saldo de mercadería.

## Características comerciales RF04 / CL-13 — 14 de octubre de 2026

Calidad comercial y lugar de origen de la papa se capturan por saco de compra y línea de venta, de forma independiente de proveedor, comprador y variedad. El Mayorista administra las dos listas y el Encargado selecciona opciones existentes solo en sus operaciones autorizadas. «No informada» es una opción explícita; no reconstruir características históricas a partir de otros campos. Conservar etiquetas en el hecho, herencia de devoluciones y consultas/PDF trazables aunque se edite o desactive el catálogo. Sin inventario ni cambios de criterios predictivos. Decisión y secuencia de confirmación: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`. Contratos y plan transversal: `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`. Implementación y convergencia todavía pendientes; no declarar RF04 terminado por el catálogo.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
