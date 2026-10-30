# Plan técnico 002: recepción, pesaje y liquidación

**Estado:** requiere reconciliación por cambio de alcance del 7 de octubre de 2026

> Aviso técnico: este plan contiene decisiones anteriores sobre lote, inventario y disponibilidad. No deben implementarse ni usarse como criterios de convergencia. Se preservan el historial de la operación, la liquidación financiera, la idempotencia y la auditoría; la revisión debe retirar efectos de existencias sin borrar datos o migraciones históricas.

## Objetivo del corte

### Identificación accesible del historial — 26 de octubre de 2026

Mantener el texto visual «Abrir detalle», añadiendo en su nombre accesible el tipo de operación, proveedor, fecha registrada e identificador central. Las filas con el mismo participante y fecha deben seguir siendo distinguibles. No cambiar filtros, permisos ni efectos de operación.

### Recuperación tras retroceso externo web — 12 de octubre de 2026

La versión instalada de Expo Router reconstruye el estado desde su historial web mediante resetRoot. Conservar una copia en memoria de los datos iniciales por sesión autenticada para sobrevivir al desmontaje de ruta, sin simular que se impidió el retroceso. Restaurar campos y referencias al volver a una recepción nueva, con aviso explícito de edición recuperada. Una recepción existente no consume esta copia. Limpiar tras descarte explícito, guardado duradero en cola o cierre/cambio de sesión. No usar almacenamiento persistente ni backend para esta copia; recargar completamente o cerrar el proceso puede perderla. Verificar recuperación real con tab.back y aislamiento entre sesiones, además de cancelación y ausencia de efectos comerciales.

La recuperación de edición después de retroceder y la limpieza tras nuevo login fueron verificadas en Expo Web el 12 de octubre. Evidencia: `docs/sdd/verificacion-recuperacion-edicion-compra-2026-10-12.md`. El retroceso sigue navegando; la edición se recupera al volver. No confundir esa protección con almacenamiento persistente o bloqueo del botón externo del navegador.

### Salida de datos iniciales sin guardar — 11 de octubre de 2026

Detectar cambios respecto a la fecha y campos iniciales, incluidos proveedor, vehículo y variedades seleccionados. El formulario inicial no es una recepción duradera antes de continuar. Pedir confirmación al salir con cambios; cancelar conserva los datos y confirmar descarta solo esa edición. Bloquear salida durante guardado y proteger también acciones del navegador de rutas mediante usePreventRemove, siguiendo el patrón vigente de ventas. Sin historial, retornar al menú protegido; con historial, conservar la acción original. Mantener los diálogos existentes de pesaje y liquidación sin sustituir datos ya persistidos ni encolar una operación para cancelar.

La verificación real del 11 de octubre acredita el botón Volver, cancelación, descarte y disposición compacta, pero detecta una brecha en el retroceso externo del navegador: la prueba `tab.back()` sale sin aviso. No cerrar esa guarda por el callback simulado; resolver el recorrido web y verificar Android. Referencia: `docs/sdd/verificacion-salida-inicial-compra-2026-10-11.md`.

Aplicar al formulario inicial el adaptador público Navigation verificado en historial de ventas y el hook compartido useBrowserTraversalGuard. Conservar la condición protectDetailsExit, bloqueo por guardado, diálogo y limpieza explícita del borrador por token después del descarte. Cancelar una travesía antes de cambiar URL; continuar a su destino original tras aprobación. No modificar los mecanismos de pesaje/liquidación ya persistidos. Verificar el formulario de compra real por separado; el éxito de 003 no acredita 002.

Registrar una recepción completa, desde los datos iniciales y el pesaje individual hasta la liquidación financiera y su historial trazable, sin duplicar cuentas o caja. Conforme al cambio aprobado del 7 de octubre, no crear lotes ni existencias de mercadería para nuevas operaciones.

## Diseño técnico propuesto

### Compra sin inventario

WeighingService cierra y corrige el detalle de sacos usando sus repositorios, bloqueo de recepción, versión y UUID existentes; su auditoría presenta cantidad de variedades/sacos y peso, sin lote creado. ReceptionService anula la recepción conservando el estado y motivo, sin tocar registros históricos de inventario. PurchaseService calcula los importes directamente de los sacos vigentes y conserva flete, cuenta/cuotas, caja y auditoría en la misma transacción; se retiran creación/activación/valoración de lotes y movimientos. Anular una compra no depende de ventas o movimientos de mercadería: conserva las restricciones financieras de pagos sin revertir y flete liquidado. Probar cierre/corrección sin repositorios de inventario, contado/crédito, reversos, UUID repetido y versiones obsoletas. Ninguna tabla/migración histórica se elimina.

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Dominio | Recepción, saco, variedad, lote, liquidación y cálculo de importes. | Cálculos de peso y dinero no viven en componentes visuales. |
| Aplicación | Orquestar inicio, captura, corrección, cierre y liquidación. | No decide conflictos centrales ni reglas financieras no aprobadas. |
| Datos locales | Conservar la operación abierta y los eventos pendientes de forma recuperable. | No confirma efectos centrales solo por persistir localmente. |
| Sincronización | Enviar operaciones idempotentes, relacionar confirmaciones y rechazos. | Depende de la política CL-04. |
| Interfaz | Reproducir la composición amplia de COMPRA en tablet y adaptar las etapas a tamaños compactos, mostrando totales, estado y confirmación. | No usa color como único indicador ni permite cierres ambiguos. |

## Invariantes que se deberán probar

1. Cada saco pertenece a una sola recepción y conserva orden, peso y variedad.
2. Los totales se derivan del detalle de sacos; no se editan como valores independientes.
3. Un cierre confirmado crea a lo sumo un lote y un efecto de inventario asociado.
4. Una liquidación aplica adelantos, descuentos y flete una sola vez.
5. Pago al contado y pago en cuotas producen efectos distintos y trazables.
6. Correcciones y anulaciones conservan usuario, fecha, motivo y operación de origen.

## Contratos y decisiones previas

1. Estados de recepción y lote, disponibilidad para venta y límites de reapertura.
2. Unidad, tara, precisión y redondeo de peso y dinero.
3. Fórmulas y condiciones de flete, estiba, adelantos y pago en cuotas.
4. Identificadores idempotentes, conflictos, confirmación y rechazo de sincronización.
5. Reglas de autorización del Encargado sobre corrección, cierre y liquidación.

## Estrategia de verificación

### Liquidación de tablet y cálculo provisional

La fase posterior al cierre mantiene la composición de COMPRA: detalle conservado a la izquierda y Resultado, Flete y Resumen a la derecha. Reutiliza los callbacks de liquidación, cierre y navegación existentes; la forma de pago y las cuotas conservan los controles compartidos con teléfono. El contrato central admite un precio global por recepción: los renglones de variedades no agregan precios independientes.

El cálculo previo a confirmar vive en el dominio del frontend, usa centavos y milésimas de kilogramo enteros con BigInt y redondea half-up una sola vez sobre el peso total, como `calculateAmountByBasis` del backend. Excluye sacos anulados, valida importes contra el límite del DTO central y deja pendiente el resultado mientras faltan datos. Se identifica como provisional y no publica efectos de inventario/caja/cuentas. El servidor conserva la autoridad final. Probar medios centavos, tarifa por saco/kilo, exclusiones, precisión superior a Number, deducciones excesivas y ausencia de un precio válido.

### Recuperación de recepción central abierta

Para la captura local se añade contexto opcional de presentación a la operación `reception.create`, cifrado junto a la cola y validado al leer/escribir. Un proyector de dominio reconstruye creación, altas/correcciones de sacos y cierre respetando identidades, referencias centrales/locales y versiones consecutivas. Su salida permite continuar captura o liquidación provisional; eventos inciertos que ya liquidan/anulan, rechazados/en revisión/descartados o datos insuficientes producen una recuperación bloqueada y conservan los originales. Una cola completamente confirmada produce una referencia central para consulta. Los catálogos no disponibles no eliminan las variedades de una operación recuperada. Probar reinicio, correcciones encadenadas, referencias parcialmente confirmadas, doble liquidación y aislamiento de identidad del almacenamiento.

El historial navega con `receptionId` hacia la misma ruta de compra. La aplicación consulta recepción y sacos sin ejecutar creación ni repetir operaciones. Borrador/en pesaje continúa captura; pesada continúa liquidación. La consulta se repite tras un error y verifica nuevamente estados y versión. Las escrituras locales relacionadas sin confirmar bloquean la recuperación editable y remiten a sincronización, incluida la cola sin hidratar o con error. Las recepciones anuladas/liquidadas conservan consulta histórica, sin reapertura implícita. Probar especialmente sacos anulados, lectura fallida, estado cambiado entre historial y apertura y ausencia de duplicados.

- Pruebas puras de totales, promedios, importe bruto, descuentos, monto líquido y saldo.
- Pruebas de flujo: registrar saco, corregir, cerrar, liquidar y consultar resultado.
- Pruebas de idempotencia para reintentos y respuesta perdida.
- Validación táctil en tablet con captura consecutiva en menos de un segundo de forma local.
- Convergencia contra DS-010 a DS-014 del inventario de pantallas.

## Bloqueadores

| ID | Bloquea |
|---|---|
| CL-04 | Identidad de operación, reintentos, conflictos y confirmación central. |
| CL-05 | Límites de operación del Encargado durante reemplazo. |
| CL-07 | Estados de lote, tara, precisión, redondeo, correcciones y disponibilidad. |




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU01–HU02: Captura y liquidación sin existencias.
- [ ] Verificar HU11: Consultar historial de recepciones/compras por fecha o participante.

## Corte de historial HU11
GET /receptions añade from/to civiles sobre receivedOn, search literal de proveedor (máximo 160), providerId UUID y state. Mantener límites 1–100 y offset del contrato paginado, guards existentes y aislamiento de venta/participante por negocio. Enlazar proveedor desactivado; proyectar providerName sin objeto de contacto. Conservar expectedVarieties y paginar entidades, no filas multiplicadas por sus variedades. Orden receivedOn/createdAt/id DESC.
Frontend usa páginas de 20, criterios aplicados separados de edición, secuencia para descartar respuestas tardías, vacío/error/reintento, fecha válida y recuperación acotada de página vacía. No modificar contratos financieros, cola ni permisos. Verificar consulta con varias variedades, más de 100 recepciones, fecha de recepción distinta de creación, participantes desactivados, caracteres literales, aislamiento, filtros y regreso del detalle. Figma y Android siguen siendo gates de convergencia.

## Protección de salida en pesaje y liquidación — 14 de octubre

Extender la protección de datos iniciales a la ruta completa: interceptar la retirada del navegador nativo y el recorrido web cancelable mientras haya peso/tara/corrección o términos de liquidación sin guardar, o una escritura en curso. Mantener el diálogo específico de cada etapa, cancelar conservando edición y continuar exactamente la acción interceptada solo tras descarte explícito. Los accesos internos al menú/historial siguen la misma decisión; una etapa sin edición puede salir sin aviso. No descartar sacos centrales ni órdenes ya persistidas. La recarga web usa beforeunload; no se afirma recuperación de estos borradores tras cerrar el proceso.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
