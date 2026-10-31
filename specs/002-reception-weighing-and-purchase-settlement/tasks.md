# Tareas 002: recepción, pesaje y liquidación

- [x] Revisar recepción inicial web a 360 × 800: obligatorios, proveedor contextual, cancelación/descarte y conservación de datos. `docs/sdd/verificacion-compra-venta-movil-2026-10-21.md`. No acredita pesaje/liquidación nuevos ni Android.

**Estado:** suspendido para reconciliación por cambio de alcance del 7 de octubre de 2026

> Las marcas completadas describen el alcance anterior y no acreditan convergencia vigente cuando involucran lote de inventario, existencias, disponibilidad o descuento de stock. No borrar datos ni migraciones; crear tareas de adaptación después de reconciliar especificación, plan, contratos, diseño y pruebas.

## Definición y diseño

- [x] T201 Documentar máquina de estados de recepción y lote, incluida corrección y anulación. **Resuelto por CL-07.**
- [x] T202 Aprobar unidad, tara, precisión y redondeo de peso y dinero con ejemplos. **Resuelto por CL-07.**
- [x] T203 Definir contratos de operación idempotente, rechazo y conflicto para recepción y liquidación. **Resuelto por CL-04.**
- [x] T204 Definir permisos de crear, corregir, cerrar, liquidar y anular para el Encargado. **Resuelto por CL-05.**
- [x] T205 Diseñar DS-010 a DS-014: captura, corrección, cierre y liquidación. **Implementados los cuatro pasos táctiles y sus estados de carga, error y confirmación; los estados de sincronización pendientes se completarán con T211.**

### Avance de interfaz no funcional

- [x] Se implementó la composición adaptable del primer paso de DS-010 con fecha, proveedor, teléfono, vehículo, conductor y variedades esperadas.
- [x] Se implementó la composición del segundo paso con captura rápida, detalle virtualizado y resumen recibido desde el dominio.
- [x] El backend implementa recepciones borrador aisladas por negocio, validación de catálogos, `clientOperationId` y creación idempotente con bloqueo transaccional.
- [x] El backend implementa captura, corrección, retiro, cierre versionado, lote pendiente, liquidación y efectos transaccionales; la composición móvil consume los contratos de creación, captura, corrección, cierre y liquidación.
- [x] La aplicación móvil conecta catálogos, recepción, pesaje con tara, corrección previa al cierre, cierre explícito y liquidación al contado o crédito con cuotas.
- [x] La confirmación móvil presenta importes calculados por la API; la interfaz no confirma ni replica efectos de inventario, caja o cuentas por sí sola.

## Implementación vertical, después de decisiones

- [x] T206 Crear entidades y reglas puras de recepción, saco, totales y promedios. **Implementado en la API y cálculos de dominio.**
- [x] T207 Implementar captura consecutiva y corrección trazable de sacos. **Implementado antes y después del cierre, previo a liquidación. Historial guarda anulaciones y correcciones antes del envío y consulta el resultado central; conserva el éxito y permite reintentar solo la lectura cuando falla refrescar. Ocho pruebas de pantalla en `docs/sdd/frontend-web-verification.md`; convergencia nativa pendiente.**
- [x] T208 Implementar cierre idempotente y creación de lote asociada. **Implementado con lote `pending`.**
- [x] T209 Implementar liquidación, flete, adelantos, descuentos y condiciones de pago. **Implementado. Liquidación móvil guarda UUID y cuerpo antes de enviar y conserva dependencia de recepción local. La confirmación central se mantiene ante un fallo posterior de lectura, con reintento exclusivo de consulta. Cinco pruebas de flujo controlado en `docs/sdd/frontend-web-verification.md`; evidencia nativa pendiente.**
- [x] T210 Integrar inventario, cuentas, caja, estiba y auditoría mediante operaciones autorizadas. **Contratos centrales implementados.**
- [ ] T211 Persistir operaciones abiertas y pendientes, y mostrar sincronización. **Recepción, sacos, corrección previa al cierre, cierre y liquidación guardan UUID y cuerpo antes del envío. Las acciones posteriores a un pesaje incierto permanecen en cola y conservan versiones/dependencias. Fallar el almacenamiento no deja el formulario ocupado ni publica una confirmación. La recuperación central abierta está cubierta por T220; falta recuperar el contexto de captura de borradores exclusivamente locales después de reiniciar sin conexión, además de la convergencia Android. La persistencia de eventos no acredita por sí sola la recuperación editable de la operación abierta.**

## Verificación y convergencia

- [x] Adaptar pesaje/liquidación a texto ampliado, completar detalle cerrado/resumen provisional en compacto y comprobar Android al 200 % con escala restaurada. Evidencia `docs/sdd/verificacion-compra-texto-ampliado-2026-10-16.md`; 503 pruebas/69 suites, sin escrituras comerciales. No sustituye todos los tamaños, TalkBack ni teclado.

- [x] Incorporar el SVG original User de COMPRA en la cabecera compartida y comprobar sus dos llamadas en Android 1280×800 sin escrituras comerciales. Plan `purchase-user-plan.md`; evidencia `docs/sdd/verificacion-user-compra-2026-10-16.md`, 501 pruebas. No cierra la convergencia completa del marco.

- [x] T212 Probar reglas de peso, totales, importes, flete, adelantos y saldo con ejemplos aprobados. **PostgreSQL verifica pesos, importes, flete, adelanto, descuento, caja al contado y cuenta por pagar con vencimientos exactos.**
- [x] T213 Probar corrección, cierre, reintento y respuesta perdida sin duplicar lote ni efectos. **Cierre, respuesta perdida, correcciones concurrentes y corrección posterior al cierre están aprobados en PostgreSQL 17.11.**
- [ ] T214 Medir captura consecutiva en tablet y comprobar accesibilidad de los estados. **Depende de T207 y T205.**
- [ ] T215 Comparar requisito, Figma, implementación y evidencias; corregir divergencias. **Depende de T212–T214.**

### Fidelidad visual solicitada el 6 de octubre de 2026

- [x] T216 Registrar la prioridad de reproducir MERCADO y los valores verificados del contexto COMPRA, sin imponer la propuesta verde.
- [ ] T217 Aplicar los valores visuales verificados a compra mediante componentes reutilizables y verificar el resultado renderizado. **Paleta y superficies implementadas; comparación visual pendiente.**
- [ ] T218 Reproducir composición, tipografía y activos exactos de COMPRA para tablet, con adaptación compacta y flujos aprobados. **Contexto completo de COMPRA recuperado de esta tarea y activos originales conservados localmente. Pesaje de tablet incorpora bandas de proveedor/celular/fecha, totales por variedad y navegación original con dimensiones intrínsecas. Liquidación de tablet incorpora detalle cerrado, Resultado/Flete/Resumen, cálculo provisional exacto, contado/crédito y cuotas compartidas con teléfono. La salida advierte sobre datos todavía no guardados. 185 pruebas/32 suites, tipos, lint y exportaciones web/Android pasan. Faltan componente de cuenta conectado, activos y ajustes de geometría restantes y convergencia visual/nativa; no se cierra por pruebas funcionales ni por exportar.**
- [ ] T219 Comparar LOGIN, MENU y restantes interfaces por marco, dejando evidencia de diferencias y correcciones. **La paleta de compra no certifica las demás pantallas.**

- [x] T220 Permitir continuar recepciones centrales abiertas desde el historial, usando estado/sacos/versiones vigentes y bloqueando escrituras locales relacionadas sin resolver; verificar sin crear duplicados. **Implementado y verificado en Expo Web contra API real: misma recepción, 3 sacos, 33 kg y recuperación de liquidación tras recarga. Suite completa de 134 pruebas. No sustituye recuperación offline de borradores locales ni prueba nativa.**

- [ ] T221 Recuperar captura local desde la cola cifrada después de reiniciar sin API, conservando nombres, sacos, correcciones, cierre y referencias; verificar reconexión e identidad única. **Implementado y probado en navegador: 2 sacos y 35 kg recuperados tras recargas y cierre. Reconexión confirmó cuatro órdenes, una recepción `b374bb89-aeba-4bdc-885d-243b5920e8be`, versión 3, sin duplicados. TypeScript, lint y 159 pruebas pasan. Sigue pendiente validar el nuevo recorrido en Android y el ensayo de duración offline.**



## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU01–HU02: Captura y liquidación sin existencias.
- [ ] Verificar HU11: Consultar historial de recepciones/compras por fecha o participante. **Implementado y verificado en API/PostgreSQL, navegador y ancho compacto: filtros centrales, fecha de recepción, proveedor desactivado, páginas de 20 y detalle. Evidencia: `docs/sdd/verificacion-historial-compras-2026-10-08.md`. Pendiente Figma/Android.**

## Recuperación de edición inicial y navegación

- [x] Verificar Atrás del sistema Android en el AVD 1280 × 800: confirmar salida con datos iniciales, cancelar conservando campo, descartar volviendo al menú y abrir una compra limpia sin operaciones comerciales. Evidencia: `docs/sdd/verificacion-salida-compra-android-2026-10-12.md`. No cierra las pruebas de todos los recorridos/tamaños del módulo.

- [x] Conservar campos/referencias de una compra nueva al desmontar su ruta dentro de la misma sesión y mostrar aviso de recuperación; limpiar por descarte, guardado duradero y cierre/cambio de sesión. Evidencia del 12 de octubre: `docs/sdd/verificacion-recuperacion-edicion-compra-2026-10-12.md`; 371 pruebas, tipos/lint y recorrido real de retroceso/recuperación/nuevo login aprobados.
- [ ] Verificar protección de salida y recuperación en Android y ventas; la copia de datos iniciales no sobrevive a recarga completa o cierre del proceso y no bloquea el retroceso externo web.

## Corte HU11 del historial de compras
- [ ] Implementar y verificar filtros/paginación centrales y pantalla por fecha de recepción, proveedor y estado; conservar variedades, permisos y trazabilidad. **API/PostgreSQL y navegador aprobados; evidencia en el registro HU11 del 8 de octubre.** Cierre exige Android y convergencia Figma.
- [x] Complementar la salida inicial con la guardia web compartida y verificar Atrás real: aviso antes del cambio de URL, Cancelar conserva Conductor, descarte limpia el borrador y reabrir inicia vacío. Suite integrada 443/65 aprobada; `docs/sdd/verificacion-atras-formularios-2026-10-13.md`. No acredita pesaje/liquidación, Adelante, todos los navegadores ni Android.
- [x] Extender la protección de ruta a pesaje y liquidación, conservando edición al cancelar y acción interceptada al descartar. Tipos/lint, 452 pruebas / 66 suites y export aislado aprobados; `docs/sdd/verificacion-salida-etapas-compra-2026-10-14.md`.
- [ ] Verificar la extensión en navegador real y Android, incluida escritura en curso, Atrás/Adelante y salida sin edición. La política de URL bloqueó la reapertura del navegador QA; no sustituir este gate por las seis regresiones simuladas.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Refactor SOLID del ingreso de pesos — 30 de octubre de 2026

Plan: [refactor SOLID](plan.md#refactor-solid-del-ingreso-de-pesos--30-de-octubre-de-2026). Sin cambio de contrato HTTP ni de base de datos.

- [x] T222 Extraer las reglas de peso a `common/domain/sack-weights.ts` como función pura con error de dominio. *Verificación:* bruto positivo, tara omitida y cero, tara igual o mayor que bruto, formato inválido y tres decimales. **Hecho:** `calculateSackWeights`, 5 pruebas. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [x] T223 Crear el modelo `SackWeight` y usarlo en la comparación de reintentos. *Verificación:* mismo peso con otra escritura (`52.5` y `52.500`) se reconoce como la misma orden. **Hecho:** `SackWeight`, 2 pruebas; reintentos comparan con el modelo. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [x] T224 Crear el caso de uso `RegisterSackWeight` con los contratos `WeighingRepository`, `WeighingAudit` y `WeighingUnitOfWork`, y el adaptador PostgreSQL; `WeighingService.add` delega. *Verificación:* tipos, lint y suite completa sin cambios de comportamiento. **Hecho:** `RegisterSackWeight` y `PostgresWeighingUnitOfWork` con `useFactory`; 307 pruebas unitarias y build correctos. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [x] T225 Pruebas de contrato con adaptador en memoria: cinco reenvíos → un saco y una auditoría; mismo UUID con otro peso → `409 operation-id-conflict`; variedad ajena → `422`; recepción cerrada y versión antigua → `409` sin escrituras; fallo de auditoría → nada persistido. **Hecho:** 10 pruebas de contrato en `register-sack-weight.spec.ts`. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [x] T226 Las mismas garantías sobre PostgreSQL: e2e HTTP de reenvíos y conflicto, y rollback real cuando falla la auditoría. **Hecho:** `test/weighing.e2e-spec.ts` 3/3, incluidos cinco envíos simultáneos; suite e2e 50/50. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [x] T227 Actualizar principios de diseño, C4 nivel 4 y verificación con evidencia. **Hecho en texto:** principios de diseño v2.1 y C4 nivel 4; redibujar los SVG queda abierto abajo. Evidencia: [verificación del refactor](../../docs/sdd/verificacion-pesaje-solid-2026-10-30.md).
- [ ] Redibujar `solid-modulo-pesaje.svg` y `nivel4-clases.svg` con `RegisterSackWeight`, `SackWeight` y los contratos; renderizar sus PNG.
