# Tareas 006: reportes y comprobantes

- [x] Corregir superposición de las filas de Comprobantes en teléfono y verificar vista previa/descarga PDF real de compra y paginación de 27 ventas. 75 pruebas de cuentas/comprobantes, tipos/lint y exportación; `docs/sdd/verificacion-paneles-financieros-moviles-2026-10-21.md`. No cierra PDF multipágina, otros tipos ni compartición nativa.

- [x] Componer barra de usuario, selector, presentación, periodo y tabla de Reportes con originales Figma; revisar 1440 × 1061 y 360 × 800, consulta/validación/recuperación y una descarga Excel real. Evidencia: `docs/sdd/verificacion-composicion-reportes-2026-10-21.md`.
- [ ] Completar gates restantes de Android, TalkBack, texto ampliado nativo, archivos multipágina, Excel visual y compartición nativa. La revisión web no sustituye estos gates.

- [x] Implementar cuatro descargas agregadas aprobadas, snapshot consistente, permisos Mayorista, PDF/XLSX real y acciones frontend. QA solo lectura, HTTP y pruebas verificadas; `docs/sdd/verificacion-descargas-reportes-2026-10-19.md`.
- [ ] Verificar descarga/compartición desde UI real, Excel visual, PDF multipágina y convergencia completa de Reportes con Figma; no sustituir estos pasos por pruebas unitarias.

**Estado:** activo para implementación secuencial

- [x] Implementar consulta PDF de resumen y contraparte usando visor existente, limpieza de recursos, descarte tras cambio de periodo/sesión e invalidación ante 401. 528 pruebas/73 suites y tipos/lint; `docs/sdd/verificacion-consulta-pdf-reportes-2026-10-19.md`.
- [x] Implementar consulta paginada de detalle/variedad desde PostgreSQL, manteniendo exportación completa. 135 filas y QA real/HTTP verificados; `docs/sdd/verificacion-consulta-paginada-reportes-2026-10-19.md`.
- [ ] Verificar consultas/visor de reportes en UI real, foco y accesibilidad.

- [x] Implementar resumen por operación/periodo con agregados independientes, sacos/peso, saldo actual acotado y devoluciones separadas. Verificado con PostgreSQL READ ONLY y consulta de producción; `docs/sdd/verificacion-resumen-operacion-2026-10-17.md`.
- [x] Verificar HTTP del resumen e integrar indicadores por Compra/Venta, con saldo del periodo diferenciado e invalidación de respuestas anteriores. 519 pruebas/71 suites, tipos/lint; `docs/sdd/verificacion-integracion-indicadores-2026-10-17.md`.
- [ ] Completar composición Figma y validación UI real de indicadores/periodos/descargas. Detalle, agrupaciones y exportadores ya implementados el 19 de octubre.

- [x] Recuperar contexto completo Reportes98:304, conservar siete activos originales y registrar aprobación del saldo por periodo/descargas agregadas. Plan `reports-figma-convergence-plan.md`; no equivale a implementación visual.
- [x] Implementar periodos rápidos/restablecimiento sin consulta automática ni pérdida de filtros, con calendario correcto y edición personalizada. Tipos/lint y 516 pruebas/71 suites; `docs/sdd/verificacion-periodos-reportes-2026-10-17.md`.
- [x] Implementar proyección consistente por operación/periodo, indicadores de sacos/peso/cuentas y cuatro descargas PDF/Excel aprobadas. La composición Figma y verificación de UI permanecen en tareas separadas abiertas.

- [x] Presentar detalle de cuotas alertadas con cuenta, vencimiento, estado al corte y saldo de cuota; contador semántico y vacío explícito. Tipos/lint y 513 pruebas/70 suites fuera del sandbox aprobados; evidencia y fallo de entorno conservados en `docs/sdd/verificacion-detalle-alertas-2026-10-17.md`.
- [ ] Converger alertas positivas en UI/dispositivos, contraparte descriptiva y Figma; no cerrar HU14 solo por detalle y regresiones.

- [x] Mostrar periodo y actualización del resumen central en Lima; validar fechas civiles reales antes de consultar. Tipos/lint y 511 pruebas/70 suites aprobados; `docs/sdd/verificacion-periodo-actualizacion-reportes-2026-10-16.md` conserva también los intentos fallidos.
- [ ] Verificar marca de actualización y validación de fechas en la interfaz real de Reportes; no cerrar convergencia visual por pruebas de componentes.

- [x] Extender historial de precios a calidad/procedencia con opciones históricas, ausencia explícita y etiquetas originales; conservar observaciones identificables/tarifas y medianoche Lima. Tipos/lint, 491 pruebas frontend / 209 backend, PostgreSQL y HTTP real aprobados; `docs/sdd/verificacion-referencias-en-operaciones-2026-10-14.md`.
- [ ] Verificar nuevos filtros/observaciones de Reportes por UI/dispositivos y converger con diseño; consultas HTTP y export no cierran ese gate.

## Definición y diseño

- [x] T601 Definir formato, campos, medios de compartición y datos excluidos de cada comprobante. **PDF interno aprobado; compartición delegada a Android.**
- [x] T602 Definir retención, regeneración, invalidación y auditoría de comprobantes. **Resuelto por CL-10.**
- [x] T603 Definir fórmulas e indicadores de costos y alertas. **CL-11 aprobó el margen comercial estimado, su desglose y periodo de reconocimiento.**
- [x] T604 Definir permisos de consulta, exportación y compartición por tipo de reporte. **Mayorista para reportes; usuarios operativos autorizados para comprobantes.**
- [x] T605 Diseñar DS-042 y DS-043: filtros, alertas, vista previa y compartición. **Periodo y filtros de operación, variedad, proveedor y comprador, resumen, margen, alertas, historial de precios, vista previa embebida y compartición están implementados; Reportes se verificó a 1440 × 1024 y la convergencia nativa se completa en T612–T613.**

## Implementación vertical, después de decisiones

- [x] T606 Crear consultas filtradas y autorizadas de operaciones, stock, cuentas y alertas. **Implementado en la API.**
- [x] T607 Crear proyecciones versionadas de compra, venta y despacho a comprobante. **Implementado.**
- [x] T608 Implementar generación, recuperación e invalidación de archivos autorizados. **Implementado con hash, versión y retención mínima.**
- [x] T608A Implementar valoración por lote, costo de venta, reducciones por devolución y consulta del margen conforme a CL-11. **Verificado en PostgreSQL con descuentos, devolución y fecha de corte.**
- [x] T609 Implementar vista previa y compartición Android de documentos autorizados. **La descarga autenticada alimenta un visor PDF nativo con zoom en el cliente de desarrollo y el panel seguro de compartición de Android; web usa vista previa embebida.**

## Verificación y convergencia

- [x] T610 Probar filtros, aislamiento por negocio, permisos y datos de alerta. **PostgreSQL y HTTP verifican resumen, historial, alertas, fechas de corte, aislamiento y acceso exclusivo del Mayorista; el frontend prueba el contrato de filtros y validó visualmente la selección en Expo Web.**
- [x] T611 Probar contenido, trazabilidad, regeneración e invalidación de comprobantes. **Los PDF de compra y venta están aprobados en PostgreSQL para contenido, hash, retención, reutilización e invalidación después de anulaciones compensatorias.**
- [ ] T612 Probar lectura y compartición en tablet. **Android API 36 a 1280 × 800 abrió el PDF real de compra de S/255, amplió mediante doble toque y entregó el archivo al panel de compartición del sistema. Se canceló sin transmitir a otra aplicación. Se añadió error recuperable del visor con prueba. Quedan pellizco, tamaños adicionales, venta/despacho y validación completa; evidencia en `docs/sdd/frontend-native-verification.md`.**
- [ ] T613 Comparar requisito, Figma, implementación y evidencias; corregir divergencias. **Depende de T610–T612.**




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU10: PDF interno de compra/venta confirmada y compartición autorizada.
- [ ] Verificar HU11: Búsqueda comercial por fecha/participante sin consultar acciones auditadas.
- [ ] Verificar HU14: Aviso de vencimiento financiero; canal externo requiere aclaración previa.

## Convergencia al alcance sin inventario

- [x] Retirar inventario/bajo stock del resumen y alertas, dejar de solicitar margen por lote y responder 410 en su ruta histórica sin ejecutar valoración; verificar dinero, fechas, aislamiento y rechazo del umbral antiguo. **12 pruebas de reportes y API real verifican ausencia de campos de stock, umbral 400, margen 410 y autenticación 401. Suite completa: 102 pruebas/36 suites; frontend: 194/34.**
- [x] Invalidar resultados al cambiar filtros y descartar respuestas tardías, conservando centavos exactos en cifras confirmadas. **Pruebas de frontend y periodo real editado en navegador verificadas.**
- [ ] Adaptar precios y comprobantes a compras/ventas por variedad sin dependencia obligatoria de lotes; verificar el escenario nuevo de compras y ventas independientes. **Depende de SI-03–SI-06; no lo acreditan las lecturas de operaciones históricas.**
## Catálogos compartidos completos

- [x] Reiniciar Reportes por sesión y descartar resumen tardío de la anterior, sin reutilizar periodo/filtros/diálogos ni resultados. Tipos/lint y pruebas enfocadas aprobados; evidencia `docs/sdd/verificacion-aislamiento-reportes-sesion-2026-10-13.md`. No acredita fidelidad Figma ni recorrido nativo/HTTP real del cambio de sesión.

- [x] Retirar el corte silencioso en 100 proveedores/compradores/variedades y conservar error ante página incompleta; prueba de 101 por colección.
- [x] Ofrecer recuperación de filtros independiente de generación del reporte, con progreso y selectores bloqueados mientras no están disponibles. Evidencia: `docs/sdd/verificacion-catalogos-compartidos-2026-10-10.md`; 291 pruebas frontend aprobadas.
- [ ] Validar recorridos de colecciones amplias con backend real y Android, participantes históricos y Figma; las regresiones de servicio/componente no cierran toda la convergencia.


## Ciclo de comprobantes por sesión — 12 de octubre de 2026

Implementados aislamiento por token, descarte/liberación de descarga tardía, guard de operación, reintento del documento original y comprobación de sesión antes del panel de compartición. Alternativa Descargar PDF en web y filas móviles en columna. Tipos/lint y seis pruebas aprobados; navegador real confirmó estados autorizado/invalidado y enlace, pero iframe vacío y timeout del evento impidieron verificar descarga positiva. Evidencia en `docs/sdd/verificacion-sesion-comprobantes-2026-10-12.md`. Historial >100, PDF positivo y Android siguen pendientes; no cerrar T612/T613.


## Historial de comprobantes sin corte en cien — 12 de octubre de 2026

Nueva consulta central paginada por liquidaciones/ventas y frontend con páginas independientes de veinte. Sin lecturas N+1 de recepciones ni dependencia de inventario. Cinco pruebas backend, siete frontend y páginas 20/20/20/20/20/1 en PostgreSQL temporal verificadas; recorrido web real 20/6 mantiene Compras en página 1. Evidencia `docs/sdd/verificacion-paginacion-comprobantes-2026-10-12.md`. Sustituye el historial >100 pendiente de cortes anteriores; negativos HTTP, Android, PDF positivo y Figma permanecen pendientes.


## HTTP y archivo de compra real — 12 de octubre de 2026

Historial 200, ausencia de sesión 401 y tipo/paginación inválidos 400 comprobados en API real; guard de Encargado denegado/auditado con identidad simulada sin usuarios nuevos. PDF de compra QA recuperado por HTTP, hash coincide y render de una página legible verificado. Evidencia `docs/sdd/verificacion-http-pdf-comprobantes-2026-10-12.md`. Sustituye negativos HTTP pendientes del historial y acredita archivo de compra; descarga/visor web positivos, Android de venta/despacho, accesibilidad y Figma siguen pendientes.

## Visor PDF web visible — 13 de octubre de 2026

PDF.js local 6.4.299 sustituye el iframe vacío, con navegación, zoom, texto expandible, error/reintento y cancelación al cerrar/reemplazar. PDF real de compra visible en tablet y teléfono; versión final a 360 × 800 sin desbordamiento horizontal a escala de ajuste. Exportación web final aprobada con recursos locales y worker coincidente. Evidencia y límites: `docs/sdd/verificacion-visor-pdf-web-2026-10-13.md`. Se supera el visor web vacío; siguen pendientes descarga por navegador, documento real multipágina, runtime de producción, Android, lectores de pantalla y convergencia Figma. No cerrar T612/T613.

## Export servido en QA y fecha de venta — 13 de octubre de 2026

- [x] Exigir configuración API en la exportación, servir rutas/MIME correctos y verificar login/historial/PDF reales de compra y venta desde el build. Corregir carga del worker local versionado con liberación de blob; frontend tipos/lint y 17 pruebas de comprobantes aprobados.
- [x] Reconciliar fecha de PDF de venta/devolución con America/Lima mediante nueva versión de proyección, conservando documentos anteriores; diez pruebas backend, compilación/lint y venta PDF/SQL real verifican fecha, hash/retención y operación inalterada.
- [ ] Verificar devolución/despacho PDF reales, multipágina, descarga del navegador, Android, accesibilidad y Figma. No cerrar T612/T613 por este corte. Evidencia: `docs/sdd/verificacion-export-comprobantes-2026-10-13.md`.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Estado de cuenta del comprador (HU16 / RF27) — 29 de octubre de 2026

Decisión: [módulos y estado de cuenta](../../docs/sdd/decision-modulos-y-estado-de-cuenta-2026-10-29.md). Especificación en curso: [009 Estado de cuenta del comprador](../009-buyer-account-statement/spec.md).

- [x] `specify`: historia, reglas y criterios de aceptación en la spec 009 (borrador del 30 de octubre de 2026).
- [x] `clarify`: CL-EC01 a CL-EC06 resueltas el 30 de octubre de 2026 ([registro](../../docs/sdd/aclaraciones-estado-de-cuenta-2026-10-30.md)); Figma (CL-EC07) pendiente.
- [x] `plan`: [plan 009](../009-buyer-account-statement/plan.md) con contrato de la API, origen de los datos, conservación, imagen SVG → PNG en el servidor, permisos y pruebas (30 de octubre de 2026).
- [x] `tasks`: [tareas 009](../009-buyer-account-statement/tasks.md) T900–T951 (30 de octubre de 2026).
- [ ] `implement` y `converge` en backend y Android, con envío por Mensajería (spec 008). Backend completo y fusionado en `main` el 30 de octubre de 2026 (T910–T934, [verificación](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md)); faltan Android (T940–T944) y Figma (T950–T951).
