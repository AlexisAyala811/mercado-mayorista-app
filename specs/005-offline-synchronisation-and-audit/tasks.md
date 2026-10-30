# Tareas 005: operación offline, sincronización y auditoría

**Estado:** activo para implementación secuencial

## Definición y diseño

- [x] T501 Definir identidad idempotente, orden de cola, conflictos, respuesta perdida y rechazo central. **Resuelto por CL-04.**
- [x] T502 Definir vigencia y revocación de reemplazo con operaciones creadas offline. **Resuelto por CL-05.**
- [x] T503 Definir conservación, cifrado, recuperación y descarte de caché y pendientes. **Resuelto por CL-06 e implementado con cola cifrada, separación por identidad y descarte razonado.**
- [x] T504 Definir retención, protección y consulta de eventos de auditoría, archivos y derivados. **Resuelto por CL-10.**
- [x] T505 Diseñar DS-040 y DS-041 y añadir estados de sincronización a los flujos operativos. **Indicador global y detalle textual de pendiente, sincronizando, confirmado, rechazado y revisión implementados.**

## Implementación vertical, después de decisiones

- [x] T506 Crear modelos y máquina de estados puros para pendientes, confirmaciones, rechazos y auditoría. **Implementada con transiciones validadas, intentos, mensajes, marcas de tiempo y referencia central.**
- [x] T507 Implementar almacenamiento local protegido y separación por usuario y negocio. **Archivo AES-GCM y clave en SecureStore separados por negocio y usuario; cerrar sesión bloquea la cola sin borrarla.**
- [x] T508 Implementar la cola y el reintento idempotente contra los contratos centrales. **FIFO, mismo UUID, máximo cinco intentos y resolución de referencias entre recepción, sacos, cierre y liquidación.**
- [x] T509 Implementar revalidación central, reconciliación y recuperación autorizada. **Consulta `/operations` antes de reenviar o descartar, con conflicto 409 enviado a revisión y permisos revalidados por la API.**
- [x] T510 Integrar indicadores y detalle de estado en compras, ventas, cuentas y pagos. **Compras, ventas, inventario, cuentas, flete y estiba encolan mutaciones idempotentes al perder conexión; el indicador global y la pantalla de detalle permanecen visibles.**

## Verificación y convergencia

- [ ] T511 Probar reintentos, respuesta perdida y conflicto sin duplicar efectos. **La máquina de estados prueba confirmación, conflicto, rechazo y descarte; el proveedor prueba recuperación central de devoluciones/anulaciones sin reenvío, conservación ante fallo HTTP de consulta, protección de estados terminales y guardado antes del envío. Historial integra ese guardado y tiene pruebas de confirmación, resultado incierto y fallo de almacenamiento. `401/403` del envío se conservan para revisión y el backend cubre idempotencia. Falta el recorrido instrumental de cinco reintentos desde Android y cierre abrupto durante envío comercial. Evidencia: `docs/sdd/frontend-web-verification.md`.**
- [ ] T512 Probar reinicio, cierre de sesión, pérdida de conexión y restauración segura. **El proveedor prueba restauración del registro Sincronizando tras fallar el guardado de la confirmación, conservando UUID, cuerpo e intentos y consultando el resultado sin reenviar. El adaptador tiene pruebas de clave perdida sin sustitución, cola inválida, identidad ajena, duplicados y almacenamiento no disponible sin sobrescritura. API/cifrado/almacenamiento controlados; falta evidencia instrumental de AES, conservación del archivo tras escritura interrumpida, reinicio y cierre de sesión en Android.**
- [ ] T513 Probar aislamiento por negocio, autorización y auditoría de intentos denegados. **Consulta del 26/10: trece pruebas de interfaz/contrato cubren filtros, paginación, respuestas tardías y restricción al Mayorista; seis pruebas del backend y PostgreSQL de solo lectura cubren límites civiles, orden y negocio. Evidencia: `docs/sdd/verificacion-auditoria-paginada-2026-10-26.md`. No cierra recorridos instrumentales ni auditoría real de todos los intentos denegados; depende de T504 y T509.**
- [ ] T514 Probar estados y recuperación en tablet. **La interfaz ofrece reintento para pendientes/conflictos, consulta central después del quinto envío y descarte razonado para pendientes, conflictos y rechazos. La acción tras cinco intentos y su error tienen pruebas de pantalla; falta evidencia táctil en Android.**
- [ ] T515 Comparar requisito, Figma, implementación y evidencias; corregir divergencias. **Depende de T511–T514.**




## Evidencia adicional del 5 de octubre de 2026

Recepción offline completa verificada desde Expo Web con cifrado y almacenamiento reales, cinco operaciones conservadas tras recarga y nuevo acceso, confirmación ordenada contra API/PostgreSQL y lote central único de 102 kg. Evidencia y límites en `docs/sdd/frontend-web-verification.md`. Complementa T511/T512; no cierra sus requisitos Android, respuesta perdida ni el resto de escenarios.

## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU05: Reenvío sin duplicación y revalidación de rol/reemplazo.
- [ ] Verificar HU13: Consultar responsable, fecha, acción y motivo sin alterar auditoría.

## Corte de catálogos tras reinicio
- [x] Extraer almacenamiento cifrado compartido conservando formatos/nombres de cola; verificar regresiones del adaptador web y del adaptador de archivos nativos. **Pruebas aprobadas; no equivale a Android instalado. Evidencia: `docs/sdd/verificacion-catalogos-offline-2026-10-08.md`.**
- [x] Consultar catálogos completos, guardar copia por usuario/negocio y recuperar solo ante fallo de conexión con sesión vigente. **Pruebas de contrato/servicio y navegador real aprobadas, con conservación de datos ante errores.**
- [ ] Integrar avisos de origen y guardado en compra/venta; verificar reinicio offline, reconexión y rechazo central, sin declarar confirmaciones locales. **Implementado; navegador recupera catálogos y una venta nueva se conserva/confirmó una vez. Rechazos centrales cubiertos por servicio. La revalidación ya conserva sincronización en navegador y Android con cero pendientes; falta conjunto de recorridos con operaciones/catálogos reales en Android y duración.**

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Integridad de reintentos — 29 de octubre de 2026

- [x] Rechazar con `409 operation-id-conflict` un UUID reutilizado con datos distintos en recepciones, sacos, compras, ventas, devoluciones, abonos, reversos, estiba y flete; conservar el resultado original y no aplicar efectos. `backend/src/common/domain/operation-replay.ts`; 10 pruebas nuevas (reutilización en cuenta, importe, reverso, venta, comprador, proveedor y registros de flete). Evidencia: [verificación del backend](../../docs/sdd/verificacion-backend-2026-10-29.md).
- [x] Ejecutar las e2e en PostgreSQL de forma secuencial: las suites compartían la base y migraban en paralelo. 35/35 en local y en la CI de los PR #1 y #2.
- [ ] Tratar `409 operation-id-conflict` en la cola cifrada de Android: no reintentar, mostrar la orden en revisión y reenviar con UUID nuevo solo tras confirmación. Verificar en tablet.
