# Tareas 004: cuentas, caja, flete y estiba

**Estado:** activo para implementación secuencial

- [x] Aplicar la composición de Deudas con activos originales, búsqueda y paginación completas, consulta de identidad correcta y acceso a operaciones de origen sin deuda manual. Android 1280×800 normal/200 % y escala restaurada; 505 pruebas/69 suites, tipos/lint y exportación aprobados. `docs/sdd/verificacion-deudas-figma-2026-10-16.md`. No cierra todos los tamaños ni la convergencia del marco.
- [x] Implementar en la proyección y listado vencimiento pendiente y último cambio de saldo/estado, sin sustituirlos por creación ni modificar efectos financieros. Tipos/lint, 508 pruebas frontend, 211 backend y SELECT PostgreSQL de solo lectura aprobados; `docs/sdd/verificacion-fechas-deudas-2026-10-16.md`.
- [x] Activar API compilada y comprobar HTTP real de fechas: listado/detalle de cuenta existente coherentes, ausencia de vencimiento anulada, fecha del cambio, rechazo anónimo y cierre de sesión. `tmp/account-dates-live-http-20261016.json`; sin mutaciones comerciales.
- [x] Verificar render de fechas de cuenta existente en Android tablet 1280×800, escala 1.0 y 2.0, sin solapamientos; restaurar escala y cerrar sesión SDK. `docs/sdd/verificacion-fechas-deudas-2026-10-16.md`, capturas y grabación de 18 acciones.
- [ ] Completar fechas en teléfono y lector de pantalla; el caso nativo probado corresponde a cuenta anulada. No extrapolar a todos los dispositivos ni a vencimiento abierto real.

- [x] Aplicar la decisión humana de retirar Catálogo del aplicativo y administrar referencias dentro de Compra/Venta; conservar acuerdos, permisos y guardas al volver/cancelar. Menú/ruta anterior retirados, editores contextuales por lista; 491 pruebas frontend y export/instalación QA aprobados. `docs/sdd/verificacion-referencias-en-operaciones-2026-10-14.md`. Los renglones de Datos maestros inferiores son evidencia de infraestructura reutilizada, no de navegación vigente.
- [ ] Converger los editores contextuales y Carros (teléfono/placa separados) con Figma, Android, teclado y lector de pantalla.
- [x] Cuando una referencia se guarda pero falla la recarga de opciones al volver a Compra/Venta, ofrecer reintento explícito solo de lectura dentro del formulario, conservar acuerdos/pesos/líneas y no repetir el alta ni una operación comercial. Evitar lecturas simultáneas y descartar resultados posteriores al cambio de sesión/salida. Código y regresiones: `docs/sdd/verificacion-reintento-referencias-2026-10-15.md`, 494 pruebas/68 suites, tipos/lint y export/instalación QA aprobados.
- [ ] Verificar visualmente el reintento de opciones nuevo en Compra/Venta y dispositivos. Alta contextual de proveedor/calidad y conservación de conductor observados con el paquete anterior; no cerrar este gate por el verificador PostgreSQL.
- [x] Corregir edición contextual de campos opcionales: vaciar teléfono de proveedor/comprador o destino de comprador envía el vacío explícito que la API normaliza a null, conservando límite de crédito. Dos regresiones fallaron antes y pasan después; 496 pruebas/68 suites, tipos/lint y paquete QA aprobados. `docs/sdd/verificacion-vacios-referencias-2026-10-15.md`. Cancelar descarte conserva campos sin escribir; fallos conservan la ruta de recuperación existente.
- [ ] Comprobar guardado/reapertura real de campos opcionales vaciados en referencias de Compra/Venta y dispositivos; el cuerpo simulado y la revisión de normalización no sustituyen ese recorrido.
- [x] Verificar en Android el proveedor contextual de Compra: cancelar conserva borrador, descarte/Variedades conservan conductor, alta única POST 201, teléfono vacío PATCH 200 y reapertura/selección tras recarga. PostgreSQL confirma null, unicidad y 14 tablas comerciales preservadas. `docs/sdd/verificacion-proveedores-compra-android-2026-10-16.md`. Ejecutado con IME de pruebas; no cierra Venta, teclado normal, lector ni Figma.
- [x] Implementar solicitud de foco en Nombre al editar una referencia desde su fila o volver a la misma edición, conservando valores y confirmación antes de reemplazarla. TypeScript/lint y 501 pruebas/69 suites aprobados tras repetir el timeout documentado; exportación/instalación local verificadas: `docs/sdd/verificacion-foco-referencias-2026-10-16.md`.
- [ ] Verificar el foco nativo nuevo de referencias, cancelación/reemplazo con teclado normal y lector de pantalla. La captura previa y el IME de pruebas no cierran este criterio.

- [x] Proteger la edición de las cinco listas de Datos maestros al salir, cambiar lista/registro, cancelar o preparar desactivación; conservar campos al cancelar/fallar y evitar doble continuación. Tipos/lint, suite completa 483 y 16 pruebas enfocadas posteriores; export/instalación QA y huellas comerciales conservadas. `docs/sdd/verificacion-borrador-catalogos-2026-10-14.md`.
- [ ] Verificar ese recorrido de Datos maestros en navegador/dispositivos y con lector de pantalla, y converger con Figma. La instalación del paquete no cierra este gate.

## Definición y diseño

- [x] T401 Definir vencimiento, mora, orden de aplicación de abonos, pago anticipado y excedentes. **Decisión aprobada.**
- [x] T402 Definir reversos, anulaciones, correcciones y cierre de movimientos de caja. **Decisión aprobada.**
- [x] T403 Definir fórmulas, unidades y redondeo de flete y estiba, incluidos grupos de trabajadores. **Decisión aprobada.**
- [x] T404 Definir contratos idempotentes para abonos, cobros, liquidaciones y ajustes offline. **Resuelto por CL-04.**
- [x] T405 Diseñar DS-030 a DS-033: cuentas, abono, cobro, caja, flete y liquidación. **La app implementa listado, detalle, vencimientos, pagos, cobros, reversos, entradas y liquidaciones de flete y estiba con confirmación textual.**

## Implementación vertical, después de decisiones

- [x] T406 Crear reglas puras de cuentas, vencimientos, saldo y movimientos de caja. **Implementado.**
- [x] T407 Implementar creación de cuenta desde compra o venta y su trazabilidad de origen. **Implementado.**
- [x] T408 Implementar abonos, cobros y ajustes idempotentes con saldo resultante visible. **Implementado con control de versión y guardado previo en cola para pagos/cobros y reversos. El éxito central se conserva ante un fallo posterior de consulta; se bloquean nuevos movimientos hasta refrescar el saldo. Cinco pruebas de pantalla documentadas en `docs/sdd/frontend-web-verification.md`; recorrido nativo pendiente en T413.**
- [x] T409 Implementar acuerdos, costos y liquidación de flete y estiba. **Flete calculado por base aprobada y estiba liquidable por grupo y operación. Liquidaciones y jornadas guardan la operación antes de enviarla. El éxito central se conserva ante un fallo posterior de consulta, con bloqueo de nuevos costos y reintento exclusivo de lectura. Seis pruebas de pantalla documentadas en `docs/sdd/frontend-web-verification.md`; verificación nativa pendiente en T413.**
- [x] T410 Implementar consultas, alertas y reportes de cuentas y caja por permisos. **Implementado para el Mayorista.**

## Verificación y convergencia

- [x] Aislar Flete/estiba por sesión, descartar lecturas/envíos tardíos, impedir doble creación de grupo y validar fecha civil antes de encolar; revisar campo compacto y fecha de Lima. 61 pruebas focalizadas y recorrido QA sin mutaciones comerciales: `docs/sdd/verificacion-costos-sesion-fechas-2026-10-26.md`. No cierra registros/liquidaciones positivos ni Android.

- [x] T411 Probar saldos, vencimientos, excedentes, reversos y liquidaciones con ejemplos aprobados. **PostgreSQL verifica aplicación de abonos, rollback, reverso compensatorio, aislamiento por negocio y liquidaciones exactas de flete y estiba.**
- [x] T412 Probar reintentos sin duplicar movimientos de caja o saldo. **Abonos simultáneos, reversos y liquidaciones repetidas de flete y estiba están aprobados en PostgreSQL 17.11.**
- [ ] T413 Probar listados, detalle y confirmaciones en tablet con estados accesibles. **Los recorridos ya superan TypeScript, ESLint, Expo Doctor y exportación web; falta evidencia táctil en los tamaños Android aprobados.**
- [ ] T414 Comparar requisito, Figma, implementación y evidencias; corregir divergencias. **Depende de T411–T413.**




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU04: Consulta sin modificar saldo.
- [ ] Verificar HU08: Abono idempotente y rechazo de importe superior al saldo.
- [ ] Verificar HU09: Registro y liquidación trazable de estiba por grupo.
## Convergencia de colecciones financieras

- [x] Recorrer todas las páginas de las siete colecciones financieras/logísticas y de las referencias de compra/venta para estiba; rechazar consultas incompletas/cambiantes y mostrar el fallo de liquidación.
- [x] Conservar centavos exactos en los acumulados de caja con BigInt. Evidencia: `docs/sdd/verificacion-colecciones-financieras-2026-10-10.md`; 306 pruebas frontend aprobadas.
- [ ] Verificar colecciones amplias con PostgreSQL real y Android, rendimiento, filtros y convergencia Figma. Las pruebas de contrato/componente no cierran toda la funcionalidad 004.
## Revisión provisional de movimientos y liquidaciones

- [x] Revisar fecha, cantidad y total exacto de liquidaciones; rechazar selección inválida y bloquear cambios durante confirmación. Corregir retorno principal sin historial en los tres módulos de 004. Evidencia: `docs/sdd/verificacion-revision-liquidaciones-2026-10-11.md`; 360 pruebas, tipos/lint y retorno real al menú aprobados.
- [ ] Verificar confirmación de flete/estiba con registros pendientes y API real, Android y Figma. El recorrido central de este corte contenía solo estados vacíos.

- [x] Verificar con API real búsqueda, detalle, rechazo de excedente, revisión/cancelación de cobro y conservación de nombre histórico tras desactivación; cerrar el caso ficticio con saldo cero y sin pagos. Corregir historial vacío y etiqueta de vencimiento anulado. Evidencia: `docs/sdd/verificacion-detalle-cuenta-api-real-2026-10-11.md`; tipos, lint y 20 regresiones de cuentas aprobados. No acredita envío/reverso o Android.

- [x] Mostrar saldo anterior, importe y saldo resultante provisional antes de confirmar; conservar centavos exactos y bloquear la edición durante confirmación/envío.
- [x] Rechazar importe inválido/excesivo y cuenta cerrada antes del diálogo y del encolado; 12 regresiones adicionales. Evidencia: `docs/sdd/verificacion-revision-pagos-2026-10-10.md`; 318 pruebas frontend aprobadas.
- [ ] Verificar en Android/Figma y con rechazo central por versión o saldo concurrente. Identificación/búsqueda de contraparte de cuentas sigue pendiente de convergencia; no se cierra 004 por este diálogo.
## Identificación y búsqueda de cuentas

- [x] Resolver nombres de contraparte por negocio en listado/detalle, sin contactos ni nombres inventados; verificar SQL real con participantes desactivados y referencia ajena inconsistente.
- [x] Mostrar nombre/referencia, buscar y filtrar tipo/estado, distinguir vacío de búsqueda sin resultados y conservar contexto al volver del detalle. Evidencia: `docs/sdd/verificacion-identificacion-cuentas-2026-10-11.md`; frontend 321 pruebas, backend 144 pruebas y compilación aprobadas.
- [ ] Verificar recorrido completo con token HTTP real, Android, rendimiento, lector de pantalla y Figma. No se cierra 004 por estas pruebas de presentación.
## Recuperación de consultas financieras

- [x] Distinguir error de cuentas/caja de un resultado vacío, reintentar ambas colecciones y conservar confirmaciones centrales sin reenviar. Descartar resultados de sesión anterior y efectos de presentación después de desmontar. Evidencia: `docs/sdd/verificacion-recuperacion-lectura-cuentas-2026-10-11.md`; 347 pruebas frontend, tipos y lint aprobados.
- [ ] Verificar estos estados con servicios reales, Android y accesibilidad; no sustituir T413/T414 por pruebas simuladas.

- [x] Verificar fallo de lectura y recuperación desde Expo Web con API/PostgreSQL reales, despliegue de 49 movimientos, totales conservados y controles compactos 360 × 800. Evidencia: `docs/sdd/verificacion-cuentas-api-real-2026-10-11.md`; 348 pruebas y comprobación DOM de aria-expanded. La colección de cuentas era vacía; detalle, pagos/reversos reales, Android y Figma siguen pendientes.

## Revisión provisional de reversos

- [x] Mostrar referencia, contraparte, importe original, saldo anterior/restaurado y motivo; validar antes de confirmar y encolar, reconocer compensaciones relacionadas y permitir cancelar sin efectos. Evidencia: `docs/sdd/verificacion-revision-reversos-2026-10-11.md`; 341 pruebas frontend, tipos y lint aprobados.
- [ ] Verificar revisión de reversos con API real, interacción Android, accesibilidad y diseño; no cerrar T413/T414 por las pruebas de componente.

## Búsqueda y convergencia de Carros

- [x] Revisar también Deudas a 360 × 800 y corregir el mismo colapso de paneles; consultar cuenta anulada, buscar/limpiar conservando caja y confirmar bloqueo de cobro en ese estado. `docs/sdd/verificacion-paneles-financieros-moviles-2026-10-21.md`. No acredita cobros positivos ni todos los estados.

- [x] Revisar web real en 1440 × 1024 y 360 × 800; corregir colapso del panel compacto y comprobar búsqueda, limpieza, edición y cancelación de nuevo registro conservando borrador. 34 pruebas, tipos/lint y exportación; `docs/sdd/verificacion-carros-web-2026-10-21.md`. No cierra comparación actual Figma ni gates nativos.

- [x] Recuperar contexto 18:459 y conservar seis activos originales; registrar fuente y huellas sin declarar composición terminada.
- [x] Buscar transportista/vehículo, distinguir vacío/coincidencias y limpiar conservando edición; 324 pruebas frontend aprobadas. Evidencia: `docs/sdd/verificacion-busqueda-logistica-2026-10-11.md`.
- [x] Registrar la interpretación comunicada de la respuesta humana «los dos»: teléfono de transportista y placa de vehículo separados, conservando los campos existentes y sin inventar correlativo. `docs/sdd/decision-referencias-en-operaciones-2026-10-14.md`.
- [x] Implementar composición de Carros con activos originales, teléfono/placa separados, cuatro registros por página y acceso a formularios conservando ambos borradores. Contrastar ranuras User con metadatos/contexto; verificar paginación, nuevo registro, cancelación y recuperación de guardado/desactivación. Tipos/lint y 501 pruebas/69 suites aprobados: `docs/sdd/verificacion-carros-composicion-2026-10-15.md`.
- [ ] Completar convergencia visual real de Carros en navegador y Android, teclado, aumento de texto y lector de pantalla. No cerrar por composición, pruebas o exportación; sin mapeo Code Connect importable y sin afirmar comparación de píxeles.
- [x] Verificar Carros en tablet Android 1280×800 con login/API reales, teléfono/placa separados, búsqueda sin coincidencias, limpieza, cancelación de nuevo registro y conservación de ambos borradores al volver al mismo transportista. Corregir foco sobre la misma entidad; 501 pruebas/69 suites, tipos/lint aprobados. Evidencia `docs/sdd/verificacion-carros-android-2026-10-15.md`. No acredita teléfono, TalkBack, teclado de software ni mutaciones positivas.
- [x] Verificar Atrás del sistema Android con teclado oculto: aviso de salida, cancelar conservando ambos borradores y descarte explícito que devuelve al menú. `docs/sdd/verificacion-carros-android-2026-10-15.md`; capturas/árboles y cero escrituras comerciales en la instancia API observada. No cerrar accesibilidad ni otros tamaños por este recorrido.
- [x] Corregir crecimiento de bloques/datos de Carros compacto y observar consulta/controles al 200 % en Android 1280×800, entrando desde el menú ampliado. Restaurar escala original 1.0; conservar iconos y dimensiones originales de imágenes. `docs/sdd/verificacion-texto-ampliado-menu-carros-2026-10-15.md`. Teléfono, TalkBack, teclado y otros recorridos ampliados siguen pendientes.


## Carga y adaptación móvil de logística — 12 de octubre de 2026

Implementados reintento sin falso vacío, aislamiento por sesión, descarte de respuestas tardías, invalidación 401, bloqueo de campos/peticiones durante mutación y formularios dentro del ancho móvil. Tipos/lint, 26 pruebas y recorrido web real de lectura/búsqueda/actualización/cancelación aprobados; evidencia `docs/sdd/verificacion-carga-logistica-2026-10-12.md`. Composición Figma (User/N°), Android y mutaciones positivas siguen pendientes.


## Salida protegida de logística — 12 de octubre de 2026

Implementada comparación de borradores con valores originales, aviso al volver, cancelación que conserva ambos formularios, descarte explícito y bloqueo durante mutación. Tipos/lint y 28 pruebas de logística aprobados; recorrido web teléfono comprobado en `docs/sdd/verificacion-salida-logistica-2026-10-12.md`. Atrás Android, reemplazo por otro registro y convergencia Figma permanecen pendientes.


## Intento Android de salida protegida — 12 de octubre de 2026

SDK HTTP autenticado recuperado en estado propio y AVD existente abierto, pero arranque agotó tiempo y apareció ANR de Mercado/System UI antes de cargar frontend. Atrás no verificado; no cerrar este criterio. Evidencia y límites en `docs/sdd/diagnostico-arranque-android-logistica-2026-10-12.md`. Revalidar sesión/dispositivo antes de recuperar; conservar los estados cuya retirada oficial no fue confirmada.


## Reemplazo de edición y filas móviles — 12 de octubre de 2026

Implementada confirmación al reemplazar formularios modificados por otro registro, conservación del formulario independiente y protección de selección del mismo registro. Filas móviles en columna corregidas a partir del recorrido real. Suite general 401/59 aprobada, tipos/lint finales correctos y flujo web de ambos formularios comprobado en `docs/sdd/verificacion-reemplazo-logistica-2026-10-12.md`. Atrás Android y Figma pendientes.
- [x] Aplicar guardia web compartida a Logística y verificar Atrás con ambos formularios editados: URL conservada, cancelación mantiene nombre/placa y descarte vuelve al menú sin guardar catálogo. Suite integrada 443/65, tipos/lint/export/integridad PDF aprobados; `docs/sdd/verificacion-atras-formularios-2026-10-13.md`. No cierra Android, Adelante, otros navegadores o Figma.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Cuotas de operaciones anuladas — 29 de octubre de 2026

- [x] Añadir el estado `voided` de cuota; la anulación de compra y venta a crédito lo aplica con saldo cero, sin movimiento de caja. Migración `InstallmentVoidedState1793232000027` (recrea el enum y reclasifica cuotas de cuentas anuladas). Prueba unitaria de anulación de compra a crédito y e2e con la migración aplicada. Evidencia: [verificación del backend](../../docs/sdd/verificacion-backend-2026-10-29.md).
- [ ] Mostrar las cuotas `voided` como «Anulada» en el detalle de cuenta de Android y verificar que no aparezcan como cobradas o pagadas.
- [ ] Prueba e2e específica de anulación de venta a crédito sobre PostgreSQL que compruebe el estado de las cuotas.
