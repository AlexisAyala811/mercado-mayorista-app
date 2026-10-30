# Plan técnico 005: operación offline, sincronización y auditoría

## Consulta de auditoría — 26 de octubre de 2026

HU13 consume eventos solo del negocio y del Mayorista autenticado. La pantalla consultará páginas de 20 con total y navegación; no presentará la primera página como toda la colección. Orden central estable por fecha e identificador descendentes. Los filtros civiles Desde/Hasta representan días de America/Lima: inicio inclusivo y comienzo del día siguiente exclusivo, conservando eventos con precisión submilisegundo. Añadir parámetros opcionales `fromDay`/`toDay` sin cambiar los parámetros de instantes `from`/`to` existentes; validar fecha civil y orden de extremos en ambos límites.

Editar filtros retira resultados de criterios anteriores e invalida peticiones en curso. Cada sesión monta un espacio separado; ignorar éxito/error/finalización tardíos tras nueva consulta, edición, cambio de token o desmontaje. Permitir reintentar la misma página/criterios sin escribir eventos comerciales. Fechas visibles y conservación se interpretan explícitamente en Lima. Verificar límites nocturnos, paginación, vacíos, validación, recuperación, orden de respuestas, aislamiento de sesión y permisos.

**Estado:** aprobado para implementación

## Objetivo del corte

Conservar operaciones autorizadas durante una interrupción, sincronizarlas hacia una fuente central oficial y dar evidencia recuperable de cada transición sin duplicar efectos comerciales.

## Diseño técnico propuesto

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Dominio | Operación pendiente, identidad idempotente, estado de sincronización y evento de auditoría. | No depende de interfaz, red o almacenamiento concreto. |
| Datos locales | Cola protegida por usuario y negocio, borradores y evidencia de transiciones. | Persistir no equivale a confirmar. |
| Sincronización | Programar reintentos, enviar identidad de operación y reconciliar respuesta central. | Una respuesta perdida no crea un nuevo efecto. |
| Backend | Revalidar identidad, rol, negocio, reemplazo y consistencia; emitir confirmación o rechazo. | Es la autoridad final de operaciones y saldos. |
| Interfaz | Informar conectividad, pendiente, sincronizando, confirmado, rechazado o requiere revisión. | No presenta una operación pendiente como definitiva. |

## Invariantes que se deberán probar

1. Toda operación local tiene identidad única, usuario, negocio, tipo, fecha, carga mínima y estado.
2. El mismo identificador puede reenviarse sin crear más de un efecto confirmado.
3. Una confirmación siempre conserva referencia central y una transición de auditoría asociada.
4. Un rechazo conserva la operación, motivo seguro y una acción de recuperación autorizada.
5. Cerrar sesión, reiniciar o reconstruir caché no transforma ni elimina silenciosamente operaciones pendientes.
6. Una operación pendiente nunca cruza la separación de negocio o usuario definida por la política aprobada.

## Contratos y decisiones previas

1. Modelo de idempotencia, orden de cola, conflictos y confirmación o rechazo central.
2. Vigencia, revocación y tratamiento offline del reemplazo del Encargado.
3. Conservación, cifrado, recuperación y descarte de datos locales y pendientes.
4. Retención, protección, consulta y exportación de auditoría, archivos y datos derivados.
5. Límite de cola, política ante falta de espacio y recuperación de fallos persistentes.

## Estrategia de verificación

La recuperación de un resultado central confirmado no es un intento de envío: conserva el contador y registra la referencia central. Tras cinco intentos se permite consultar el resultado sin reenviar. La ausencia de resultado conserva evidencia pendiente y permite las acciones de revisión o descarte razonado aprobadas. DS-040 debe mantener visible esa consulta al alcanzar el límite.

Antes de reenviar, la cola comprueba si existe una orden anterior sin resolver del mismo origen. Recepción y su liquidación comparten origen; las referencias locales se normalizan a la referencia central cuando está confirmada. Cuentas, ventas y lotes conservan sus propios orígenes. Un pendiente, rechazo o revisión anterior impide la mutación posterior; una consulta puede recuperar un resultado central ya existente. Esto aplica a sincronización global y envío individual. Las operaciones de otros orígenes siguen siendo independientes conforme a CL-04.

- Pruebas de máquina de estados de sincronización y transiciones inválidas.
- Pruebas de reintento hasta cinco veces, respuesta perdida y conflicto aprobado.
- Pruebas de reinicio, cierre de sesión y restauración de pendientes conforme a CL-06.
- Pruebas de revalidación de negocio, rol y reemplazo antes de confirmar.
- Validación de DS-040 y DS-041 dentro de compras, ventas, cuentas y pagos.

## Bloqueadores

| ID | Bloquea |
|---|---|
| CL-04 | Conflictos, orden, reintentos y confirmación central. |
| CL-05 | Autorización offline y rechazo de operaciones del Encargado. |
| CL-06 | Persistencia, cierre de sesión, recuperación y pérdida de dispositivo. |
| CL-10 | Protección y retención de auditoría, archivos y derivados. |




## Conservación durante escritura nativa

Para CL-06, guardar primero en archivo temporal cifrado, verificar los bytes, conservar la copia anterior y verificar el destino después del movimiento. File.move no se considera garantía de atomicidad. Recuperar la copia anterior únicamente cuando falta el destino; si el destino es ilegible, bloquear sin sustituirlo silenciosamente. No devolver una cola vacía ante un primer guardado interrumpido. La comprobación instrumental de Android sigue pendiente en T512.

## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU05: Reenvío sin duplicación y revalidación de rol/reemplazo.
- [ ] Verificar HU13: Consultar responsable, fecha, acción y motivo sin alterar auditoría.


## Pendientes históricos tras retirar existencias

Comprobar primero /operations con UUID/tipo, incluso para una venta antigua con lotes o un ajuste de existencias. Si el resultado central existe, conservar referencia y confirmar recuperación sin POST. Si no existe, marcar revisión con motivo de contrato retirado, mantener cuerpo/UUID/intentos y no enviar un ajuste o transformar automáticamente una venta antigua en otra financiera. La interfaz ofrece comprobar resultado central y descarte razonado conforme al protocolo vigente. Una venta nueva utiliza variedad, cantidades y precio sin campos de lote.

## Copias cifradas de catálogos
Reutilizar el mecanismo AES y archivos verificados de la cola mediante almacenamiento genérico con espacios separados (queue, sale-catalog, reception-catalog). Conservar exactamente nombres de clave/archivo/almacenamiento de queue para no romper recuperaciones previas. Cada copia incluye versión, usuario/negocio, tipo, fecha central de consulta y únicamente campos del catálogo usados por la interfaz. Validar esquema y alcance al leer; claves distintas por espacio. Android conserva SecureStore y document files con copia previa; web conserva el modelo de cifrado local existente y sus límites.
Consultar todas las páginas de catálogos antes de guardar. Servicio de recuperación rechaza sesión inválida/vencida y solo consulta copia ante ApiUnavailableError. No reemplazar respuestas 401/403/validación por datos locales. Pantallas de compra/venta muestran origen/fecha o fallo de guardado y conservan reintento. Verificar aislamiento, corrupción, guardado fallido, sesión vencida, rechazo central, copias vacías y paginación, más recorrido real con reinicio sin API. Android y ensayo de dos horas continúan como gates independientes.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
