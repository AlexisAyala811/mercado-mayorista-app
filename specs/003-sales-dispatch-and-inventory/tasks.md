# Tareas 003: ventas, despachos e inventario

- [x] Revisar preparación de venta web en teléfono; mostrar cuotas en revisión y distinguir controles de quitar/importe, rechazar suma incorrecta y corregir desbordamiento del grupo de cuotas. 161 pruebas y revisión real; `docs/sdd/verificacion-compra-venta-movil-2026-10-21.md`. No confirma venta ni cierra T314/T315.

**Estado:** activo para implementación secuencial

## Definición y diseño

- [x] T301 Definir elegibilidad, reserva y liberación de lote para venta. **Resuelto por CL-07.**
- [x] T302 Definir política de conflicto de inventario y confirmación central de ventas. **Resuelto por CL-04.**
- [x] T303 Definir límites de descuento, precio, crédito, devolución, merma y anulación. **CL-12 aprobó el efecto financiero de la devolución comercial.**
- [x] T304 Definir permisos efectivos del Encargado para ventas y despachos. **Resuelto por CL-05.**
- [x] T305 Diseñar DS-020 a DS-023: venta, despacho, disponibilidad, historial y estados. **Venta, despacho, disponibilidad, inventario, movimientos, historial de ventas, anulaciones y devoluciones están implementados; la convergencia visual en dispositivo se verifica en T314–T315.**

## Implementación vertical, después de decisiones

- [x] T306 Crear reglas puras de disponibilidad, líneas de venta, totales y descuentos. **Implementado en el dominio central.**
- [x] T307 Implementar borrador de venta y selección de lotes con validación inmediata. **La app valida sacos, peso, agotamiento conjunto, precio y versión del lote antes de confirmar; la API revalida bajo bloqueo.**
- [x] T308 Implementar reserva y confirmación idempotente de venta y despacho. **La confirmación central bloquea y valida lotes transaccionalmente.**
- [x] T309 Integrar movimientos de inventario, cobro o saldo y auditoría. **Implementado.**
- [x] T310 Implementar anulación, devolución o merma mediante ajustes trazables. **Incluye devolución comercial idempotente con respaldo físico, cuenta o caja, versión, auditoría e invalidación de PDF. Ajustes de inventario guardan UUID y cuerpo antes de enviar, conservan versión y origen de devolución y bloquean nuevos ajustes si falla actualizar un lote confirmado. Siete pruebas de pantalla documentadas en `docs/sdd/frontend-web-verification.md`; verificación nativa en T314.**
- [x] T311 Integrar comprobante de venta y estados de sincronización. **Contrato central implementado; nueva venta, anulación y devolución guardan UUID y cuerpo antes del envío. La app consulta la confirmación central y conserva el éxito aunque falle cargar el detalle, ofreciendo reintento exclusivo de consulta. Pruebas de pantalla/proveedor documentadas en `docs/sdd/frontend-web-verification.md`; ejecución nativa en T314. La descarga y compartición del PDF se completa con el corte 006.**

## Verificación y convergencia

- [x] T312 Probar disponibilidad, límites de crédito, descuentos y cálculos con ejemplos aprobados. **Pruebas unitarias y PostgreSQL cubren disponibilidad, descuento, cálculo exacto, límites de crédito y creación de cuenta con vencimientos.**
- [x] T313 Probar conflictos, reintentos y respuesta perdida sin duplicar stock, cobro o saldo. **Versión obsoleta, rollback, respuesta perdida y carrera entre dos ventas del mismo lote están aprobados en PostgreSQL 17.11.**
- [ ] T314 Probar venta, despacho, anulación y comprobante en tablet. **Parcial: navegación nativa a Ventas, aviso al salir, cancelación que conserva el conductor y descarte con formulario nuevo vacío comprobados el 12 de octubre en Android 1280 × 800. Se corrigió el texto recortado de los botones de confirmación y se inspeccionó su resultado en compra y venta. Evidencia: `docs/sdd/verificacion-salida-venta-android-2026-10-12.md`. Confirmación comercial completa, despacho, anulación y comprobante nativos pendientes; depende de T305, T310 y T311.**
- [ ] T315 Comparar requisito, Figma, implementación y evidencias; corregir divergencias. **Depende de T312–T314.**




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU03: Registrar venta/despacho sin validación ni descuento de stock.
- [ ] Verificar HU11: Consultar historial de ventas/despachos por fecha o participante. **Implementado y probado en web/API/PostgreSQL: filtros centrales, páginas de 20, comprador desactivado y fechas de Lima. Evidencia: `docs/sdd/verificacion-historial-ventas-2026-10-07.md`. Pendiente comparación Figma y ejecución nativa; no se cierra por pruebas parciales.**


## Convergencia sin inventario (7 de octubre de 2026)

Las marcas históricas de implementación con stock no prueban el alcance actual.

- [x] SI-04 Migración conservadora de variedad por línea y contratos sin lote; validar backfill, unicidad nueva y aislamiento.
- [ ] SI-05 Confirmación/anulación/devolución sin acceso a existencias/valoraciones, conservando pagos y auditoría.
- [ ] SI-06 Formulario de variedades sin /inventory; validaciones, resumen, catálogos vacíos/reintento y cola duradera.
- [ ] SI-07 Comprobantes, reportes, series y suficiencia por variedad de línea.
- [ ] SI-08 API/PostgreSQL, web/Android, offline y comparación contra Figma.


Evidencia del corte actual: `docs/sdd/verificacion-ventas-sin-inventario-2026-10-07.md`. 211 pruebas frontend y 117 backend pasan; nueve pruebas PostgreSQL del corte y venta/reintento HTTP real verificados. Las tareas SI-05–SI-08 incluyen validaciones pendientes; no se marca terminación por disponer de código o pruebas parciales.


Corte posterior offline/protección: `docs/sdd/verificacion-venta-offline-2026-10-07.md`. 221 pruebas frontend pasan; una venta real ficticia permanece pendiente tras recarga sin API y confirma el mismo UUID con un cobro al reconectar. Aviso de salida, edición durante guardado, línea incompleta y contratos históricos se verificaron. T314/T315/SI-06/SI-08 permanecen abiertos por sus requisitos restantes.

## Sesión y acciones del historial — 13 de octubre de 2026

- [x] Reiniciar historial/detalle/borradores por token; descartar guardado, envío y lectura tardíos sin navegar desde la pantalla retirada. Proteger continuidad de compartición y bloquear campos/retorno durante operación. Tipos/lint y 113 pruebas enfocadas aprobados; lectura/revisión/cancelación web con API real verificadas. Evidencia `docs/sdd/verificacion-sesion-historial-ventas-2026-10-13.md`.
- [x] Implementar protección del borrador al volver/remover ruta/reemplazar detalle y reinicio de motivo/flete entre registros. Cancelar conserva, descartar limpia solo edición; cuerpo conservado permanece en cola. Tipos/lint y 187 pruebas enfocadas aprobados. Evidencia `docs/sdd/verificacion-borrador-devolucion-2026-10-13.md`.
- [x] Exportar y verificar cancelación/descarte mediante el botón interno en navegador a 360 × 800, conservación de filtros y limpieza al abrir otra venta. Build y evidencia reales en `docs/sdd/verificacion-frontend-integrada-2026-10-13.md`; el límite previo de revisión no impidió esta ejecución.
- [ ] Resolver salida por Atrás del navegador, mutaciones completas, carreras reales de sesión, Android, accesibilidad y Figma. Este corte no cierra T314/T315/SI-06/SI-08.

## Recuperación de detalle confirmado — 13 de octubre de 2026

- [ ] Verificar con API real bloqueo de la versión vieja y reintento exclusivamente de consulta tras éxito central. Los cuatro casos nuevos pasaron dentro de las 432 pruebas / 63 suites, con tipos/lint y export correctos; runtime, Android y Figma siguen pendientes. Evidencia `docs/sdd/verificacion-recuperacion-detalle-venta-2026-10-13.md` y `docs/sdd/verificacion-frontend-integrada-2026-10-13.md`. No cerrar por pruebas simuladas.
- [x] Corregir y verificar Atrás en el navegador QA con motivo/peso en edición mediante guardia de Navigation API: aviso antes de cambiar URL, cancelación conserva campos/URL y descarte continúa al destino original. 440 pruebas / 64 suites, tipos, lint, build y recorrido real; `docs/sdd/verificacion-atras-web-ventas-2026-10-13.md`.
- [ ] Verificar Adelante con edición, navegadores sin Navigation API/eventos no cancelables y aplicación transversal a otros formularios; Android y carreras reales pendientes. No cerrar salida de ruta global por el caso de Atrás ni por mocks.
- [x] Extender la guardia web a Venta nueva y verificar Atrás, cancelación con destino conservado y descarte al menú sin registrar venta. Extracción compartida con pruebas de registro/retirada/errores tardíos, suite integrada 443/65; `docs/sdd/verificacion-atras-formularios-2026-10-13.md`. Adelante y demás gates reales siguen abiertos.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
