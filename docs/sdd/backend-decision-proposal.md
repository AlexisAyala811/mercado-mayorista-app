# Propuesta de decisiones para completar el backend

**Estado:** aprobado como regla vigente.  
**Fecha de aprobación:** 25 de septiembre de 2026

Este paquete convierte los bloqueadores del registro SDD en decisiones concretas y verificables. Su aprobación habilitaría la implementación de pesaje, lotes, inventario, ventas, cuentas, sincronización, comprobantes y reemplazo del Encargado sin dejar reglas implícitas en el código.

## CL-04 — idempotencia y conflictos

**Propuesta recomendada**

1. Toda orden que produzca efectos comerciales lleva `clientOperationId` UUID único por negocio y tipo de operación.
2. Repetir una orden ya confirmada devuelve la misma referencia y no repite efectos.
3. Cada agregado mutable lleva una versión entera. El cliente envía la versión conocida; una versión obsoleta recibe `409 Conflict` con código estable, versión central y acción de revisión.
4. La cola conserva el orden por operación de origen; no se exige un orden global entre operaciones independientes.
5. El servidor nunca sobrescribe automáticamente pesos, inventario, saldos o caja ante un conflicto.
6. Una respuesta perdida se resuelve consultando el resultado por `clientOperationId` antes de crear otra orden.

## CL-05 — reemplazo del Encargado

**Propuesta recomendada**

1. Solo el Mayorista crea, inicia, termina o revoca un reemplazo.
2. El reemplazo tiene inicio, vencimiento obligatorio, Encargado, Mayorista autorizador y motivo opcional.
3. Durante su vigencia, el Encargado puede registrar pesajes y datos de compras y ventas; no puede cerrar caja, administrar usuarios, consultar reportes financieros, ajustar inventario ni anular movimientos.
4. El backend revalida el reemplazo al recibir cada operación, incluidas operaciones creadas sin conexión. Una autorización vencida o revocada produce rechazo recuperable y auditoría.
5. Finalizar un reemplazo revoca las sesiones activas del Encargado para ese negocio.

La duración máxima permitida para un reemplazo es de 24 horas.

## CL-06 — sesión y datos locales

**Propuesta recomendada**

1. El token de sesión se guarda en almacenamiento seguro del sistema operativo.
2. Borradores y operaciones pendientes se guardan cifrados y separados por negocio y usuario.
3. Cerrar sesión revoca el token y bloquea los pendientes; no los confirma ni los borra silenciosamente.
4. El mismo usuario puede recuperar sus pendientes tras autenticarse otra vez. Otro usuario no puede abrirlos.
5. Borrar pendientes requiere una acción explícita, motivo y confirmación; si ya se enviaron, primero se consulta su estado central.

## CL-07 — pesos, lotes y disponibilidad

**Propuesta recomendada**

1. El peso se almacena en kilogramos con tres decimales (`numeric(12,3)`); nunca con punto flotante binario.
2. Cada saco conserva peso bruto, tara aplicable, peso neto derivado, variedad, consecutivo, usuario y fecha.
3. La tara puede definirse por saco o como valor común del lote; el sistema conserva cuál modalidad se usó.
4. El dinero se almacena en céntimos de sol y los precios conservan su base: por kilogramo o por saco.
5. Los importes se calculan con precisión completa y se redondean a céntimos, mitad hacia arriba, al obtener cada concepto liquidable.
6. Estados de recepción: `draft`, `weighing`, `weighed`, `settled`, `voided`. Estados de lote: `pending`, `available`, `depleted`, `blocked`, `voided`.
7. Un lote pasa a disponible solo después de que el pesaje y la liquidación de compra hayan sido confirmados centralmente.
8. Después de confirmar, una corrección crea una versión y movimientos compensatorios; no edita ni elimina el detalle original.

## Cuentas, caja, flete y estiba

**Propuesta recomendada**

1. Todo crédito requiere al menos un vencimiento. Los abonos se aplican primero al vencimiento abierto más antiguo.
2. Un pago mayor al saldo se rechaza; no se crea saldo a favor implícito.
3. No se calculan intereses ni mora automáticamente en la primera versión operativa.
4. Un reverso exige Mayorista, motivo y movimiento compensatorio; nunca elimina el movimiento original.
5. El flete registra base `kilogram` o `sack`, tarifa en céntimos y cantidad derivada de la operación confirmada.
6. La estiba registra grupo, tipo `load` o `unload`, operación de origen, importe y fecha de liquidación. El dato mínimo del grupo es un nombre único dentro del negocio.

## Ventas e inventario

**Propuesta recomendada**

1. Una venta reserva inventario al confirmarse centralmente; los borradores locales no reducen disponibilidad.
2. El servidor bloquea y valida los lotes dentro de una única transacción antes de crear movimientos, cobro o cuenta por cobrar.
3. Una devolución o anulación crea movimientos compensatorios y requiere motivo; no modifica el movimiento original.
4. El límite de crédito del comprador es opcional. Si existe, excederlo bloquea la confirmación y solo el Mayorista puede autorizar una excepción auditada.
5. Los descuentos se expresan como importes explícitos; los límites configurables quedan restringidos al Mayorista.

## CL-09 — entorno mínimo de validación

**Propuesta recomendada**

1. Dispositivo principal: tablet Android de 10 pulgadas, 1280 × 800, orientación horizontal.
2. Verificación adaptable adicional: teléfono Android de 360 × 800 y tablet de 1440 × 1024 usada por Figma.
3. Prueba de continuidad: dos horas sin conexión y cinco reintentos por operación sin duplicar efectos.
4. Prueba de carga inicial: 10 000 lotes, 100 000 sacos, 50 000 ventas y 100 000 movimientos por negocio.

## CL-10 — auditoría, archivos y comprobantes

**Propuesta recomendada**

1. Solo el Mayorista consulta auditoría de su negocio; los eventos del sistema quedan disponibles únicamente para soporte autorizado.
2. La auditoría es anexable e inmutable. Correcciones y anulaciones crean eventos nuevos.
3. Los comprobantes PDF son documentos internos, no comprobantes tributarios, y contienen un identificador verificable de la operación.
4. Archivos y registros se aíslan por negocio y se cifran en tránsito y reposo.
5. La retención es configurable y no permite eliminar evidencia vinculada a saldos o movimientos vigentes.

El plazo mínimo aprobado de retención de auditoría y comprobantes es de 5 años, sin perjuicio de ampliarlo si una obligación legal posterior lo exige.

## Efecto de la aprobación

Al aprobar este paquete, se deben actualizar el registro de decisiones, las especificaciones 001 a 006, sus planes y tareas, y luego implementar los cortes verticales en este orden:

1. Reemplazos, autorización y sesión local.
2. Pesaje cerrado, lote y liquidación de compra.
3. Inventario, venta y despacho.
4. Cuentas, caja, flete y estiba.
5. Sincronización y recuperación.
6. Reportes y comprobantes PDF.
