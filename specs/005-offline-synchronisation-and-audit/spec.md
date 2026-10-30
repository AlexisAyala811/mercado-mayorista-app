# Especificación 005: Operación offline, sincronización y auditoría

**Estado:** aprobada para implementación

## Objetivo

Permitir que las operaciones autorizadas continúen durante interrupciones de conexión, se sincronicen de manera segura al recuperar Internet y mantengan un historial auditable sin duplicar efectos comerciales.

## Trazabilidad

- HU05: registro de pesajes, compras y ventas durante una interrupción de Internet.
- RF21: guardado temporal y sincronización posterior.
- RF22: auditoría de operaciones.
- AC01 y AC02: guardado local rápido y continuidad durante dos horas sin conexión.
- AC03: efecto único ante hasta cinco reintentos.
- AC04 y AC08: aislamiento, protección y recuperación.
- R01, R03 y R05: tablets Android, fuente central oficial y aislamiento por negocio.
- DA01, DA02, DA03 y DA07: continuidad, idempotencia, autorización y recuperación.
- CL-04, CL-05, CL-06 y CL-10.

## Alcance

Esta especificación cubre la captura local, estados de sincronización, confirmación central, rechazo, reintento, auditoría y recuperación de operaciones pendientes. No define aún el algoritmo final de conflictos ni la política de reemplazo de roles; esas decisiones permanecen abiertas.

## Flujo principal

1. El usuario autorizado realiza una operación de pesaje, compra o venta mientras no existe conexión.
2. El dispositivo valida los datos permitidos y guarda una operación local única con usuario, negocio, fecha y estado pendiente.
3. La interfaz informa que la operación no está confirmada por el servicio central.
4. Al recuperar conexión, el dispositivo envía las operaciones pendientes de forma segura.
5. El servicio central valida identidad, autorización vigente, negocio y consistencia antes de confirmar.
6. Si se confirma, el dispositivo actualiza el estado a confirmado y conserva la referencia central.
7. Si se rechaza o existe un conflicto, el dispositivo muestra el motivo y una acción permitida, sin aplicar un efecto duplicado.

## Requisitos funcionales verificables

1. El dispositivo puede guardar localmente operaciones autorizadas cuando no existe conexión.
2. Cada operación pendiente conserva un identificador único, usuario, negocio, fecha, tipo, datos necesarios y estado de sincronización.
3. El usuario puede distinguir operaciones pendientes, en sincronización, confirmadas y rechazadas.
4. El reintento de una misma operación no genera más de un efecto confirmado sobre pesos, operaciones comerciales, saldos financieros o caja.
5. El servicio central es la fuente oficial de operaciones y saldos confirmados.
6. Antes de confirmar una operación sincronizada, el servicio vuelve a validar autorización por rol y negocio.
7. La auditoría conserva creación local, intentos de sincronización, confirmación, rechazo, actualización y anulación autorizada.
8. La información temporal de negocio y las operaciones pendientes permanecen separadas y protegidas en el dispositivo.
9. El cierre de sesión, reinicio de la aplicación o recuperación de caché no debe convertir una operación pendiente en una operación confirmada ni eliminar silenciosamente su evidencia.
10. El sistema ofrece una recuperación comprensible cuando una operación se rechaza, queda incompleta o requiere intervención del Mayorista.

## Criterios de aceptación

### Escenario: Captura sin conexión

**Dado** un usuario autorizado y una interrupción de Internet, **cuando** registra un peso, compra o venta permitida, **entonces** la aplicación guarda la operación localmente en menos de un segundo y la muestra como pendiente.

### Escenario: Reintentos

**Dado** una operación pendiente enviada cinco veces por una respuesta perdida, **cuando** el servicio central procesa los reintentos, **entonces** existe un único registro confirmado y un único efecto comercial.

### Escenario: Rechazo por permisos

**Dado** una operación creada por un Encargado, **cuando** la autorización de reemplazo ya no está vigente al sincronizar, **entonces** el servicio central la rechaza, registra el evento y la aplicación muestra un estado recuperable sin confirmar efectos adicionales.

### Escenario: Recuperación tras reinicio

**Dado** una operación pendiente almacenada localmente, **cuando** se reinicia la aplicación, **entonces** la operación sigue identificada como pendiente y no se pierde ni se duplica al volver a sincronizar.

## Diseño y experiencia

- Debe existir un indicador global de conectividad y cola pendiente, sin ocultar el estado por defecto.
- Cada operación relevante muestra estado textual: pendiente, sincronizando, confirmada, rechazada o requiere revisión.
- Las acciones de reintentar, revisar y descartar solo aparecen cuando están autorizadas y deben explicar sus consecuencias.
- La aplicación debe permitir revisar el detalle de un rechazo y su operación de origen.
- Los estados offline deben estar presentes en los flujos de compra, venta, pesaje, pagos y cuentas; no ser una pantalla aislada.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones aprobadas

1. Definir resolución de conflictos entre tablets, respuesta perdida y rechazo central (CL-04).
2. Definir inicio, vencimiento y revocación del reemplazo del Mayorista, incluso cuando existe trabajo offline (CL-05).
3. Definir qué información local se conserva al cerrar sesión, reiniciar, reconstruir caché o perder una tablet (CL-06).
4. Definir protección, retención y consulta de auditoría para archivos, registros y datos derivados (CL-10).
5. Definir límites de cola local, orden de sincronización y comportamiento ante falta de espacio en el dispositivo.



## Alineación de historias del 7 de octubre de 2026

HU05: continuidad offline (antes HU06); HU13: consulta de responsables y motivos auditados. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.


## Revalidación de la sesión al reconectar

Después de sincronizar o comprobar un pendiente desde una identidad restaurada offline, ejecutar el flujo existente de bootstrap de sesión para recuperar identidad/permisos/expiración centrales y actualizar el indicador global. No afirmar estado online por un cambio visual ni prolongar la vigencia local. Si la conexión sigue caída, conservar únicamente la sesión previamente verificada y no vencida conforme a CL-05/CL-06. Un rechazo central sigue la política de acceso aprobada y no confirma pendientes. La cola conserva su identidad y sus datos durante esta revalidación.

## Catálogos para captura tras reinicio (HU05)
La captura nueva de recepción o venta puede usar la última copia local de sus catálogos consultados con éxito por el mismo usuario y negocio. La copia permanece cifrada, no contiene tokens/credenciales y no prolonga sesión ni permisos. Solo se recupera frente a fallo de conexión, nunca ante rechazo de autenticación/autorización o validación central. Mostrar origen local, fecha de consulta y advertencia de revalidación central; un participante desactivado después de la copia puede ser rechazado al sincronizar.
Con sesión vencida o sin copia íntegra, no habilitar captura a partir de datos inventados. Una copia vacía legítima es distinta de ausencia/corrupción. No sobrescribir una copia confirmada con una consulta parcial fallida. Un fallo de guardado permite usar el resultado central actual y advierte que ese resultado no quedó disponible para reinicio offline. Mantener la cola de operaciones separada de estos datos de referencia.

La copia para venta no impone acceso exclusivo de Mayorista: sigue la matriz 001/RF02, que permite captura al Encargado durante reemplazo autorizado. Los módulos exclusivos conservan sus propios guards; el catálogo local no concede un reemplazo ni confirma sus órdenes.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Integridad de reintentos — 29 de octubre de 2026

Amplía CL-04 (decisión D1 de [integridad y seguridad del backend](../../docs/sdd/decision-integridad-seguridad-backend-2026-10-29.md)). Un UUID de operación ya registrado solo devuelve el resultado original cuando el reintento describe la misma operación.

### Escenario: UUID reutilizado con datos distintos

- **Dado** una operación confirmada con un UUID
- **Cuando** llega otra orden con el mismo UUID pero distinto recurso, importe, peso, línea o conjunto de registros
- **Entonces** la API responde `409` con `code: operation-id-conflict`, no aplica efectos y conserva el resultado original
- **Y** la aplicación no reintenta esa orden: la deja en revisión y, si el usuario la confirma, la reenvía con un UUID nuevo.

Aplica a recepciones, sacos, liquidación de compra, venta, devolución comercial, abono, reverso, estiba y flete. El reintento idéntico mantiene el comportamiento de «Reintentos».
