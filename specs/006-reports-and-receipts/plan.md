# Plan técnico 006: reportes y comprobantes

**Estado:** aprobado para implementación

## Objetivo del corte

Ofrecer consultas autorizadas por negocio y producir comprobantes internos trazables de compras, ventas y despachos, con datos mínimos para lectura y compartición.

## Diseño técnico propuesto

### Adaptación vigente sin inventario

El resumen comercial deja de consultar/proyectar `inventory_lots`; conserva compras, ventas, caja, cuentas y costos registrados. Alertas conserva vencimientos financieros y elimina consultas/campos/umbrales de bajo stock. La ruta histórica `commercial-margin` responde como indicador retirado sin ejecutar la valoración por lote; se preserva el código histórico y los datos, sin inventar otra fórmula. El frontend no solicita ese indicador ni muestra existencias. Las consultas de precios y sus relaciones históricas se adaptarán junto con los nuevos contratos de venta por variedad; este corte no las acredita para ventas sin lotes todavía.

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Consulta | Construir vistas filtradas de operaciones, stock, cuentas, costos y alertas. | Siempre aplica negocio, rol y autorización en origen. |
| Documento | Proyectar datos confirmados de una operación en un comprobante versionado. | No recalcula ni modifica la operación de origen. |
| Archivo | Generar, almacenar, recuperar o invalidar evidencia según política aprobada. | El acceso al archivo se valida igual que el reporte. |
| Compartición | Invocar medios aprobados por Android sobre un documento autorizado. | No expone datos adicionales al destinatario. |
| Interfaz | Mostrar filtros, fecha de actualización, vista previa, estados y alertas. | Distingue datos confirmados de pendientes. |
| Valoración | Fijar costo por línea desde el lote y registrar reducciones por devolución comercial. | No reconstruye el costo desde precios posteriores ni capitaliza flete o estiba. |

## Invariantes que se deberán probar

1. Toda consulta y archivo se limita al negocio y permisos del usuario actual.
2. Un comprobante identifica la operación confirmada y la versión o estado que representa.
3. La regeneración o anulación conserva referencia a la causa y no altera el historial de la operación.
4. Los filtros activos y la fecha de actualización se muestran junto al resultado consultado.
5. La compartición usa solo medios autorizados y datos aprobados para el tipo de comprobante.
6. El margen conserva por separado ingreso, costo de mercadería, flete de venta liquidado, estiba liquidada y operaciones sin costo determinable.

## Contratos y decisiones previas

1. Formato final, campos obligatorios y medios de compartición Android.
2. Retención, regeneración, invalidación y acceso a comprobantes.
3. CL-11: margen comercial estimado reconocido por fecha de confirmación, costo del lote, descuentos proporcionales y costos liquidados del periodo.
4. Permisos de consulta, exportación y compartición para cada rol y tipo de evidencia.

## Estrategia de verificación

- Pruebas de autorización y aislamiento de consultas, archivos y filtros.
- Pruebas de proyección de compra y venta a comprobante con datos trazables.
- Pruebas de regeneración e invalidación tras ajustes de origen aprobados.
- Validación de DS-042 y DS-043 en tablet, incluida legibilidad y estados de generación.
- Convergencia con 002, 003, 004 y 005 por datos, saldos, pendiente y auditoría.




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU10: PDF interno de compra/venta confirmada y compartición autorizada.
- [ ] Verificar HU11: Búsqueda comercial por fecha/participante sin consultar acciones auditadas.
- [ ] Verificar HU14: Aviso de vencimiento financiero; canal externo requiere aclaración previa.




## Historial de precios con características comerciales — 14 de octubre

Para RF04/RF17/RF18, GET `/reports/price-history` admite calidad/procedencia por UUID, `unreported` o ausencia, como el análisis descriptivo. Ambas se combinan y filtran sacos/líneas originales. Cada observación incluye IDs y etiquetas históricas; compras colapsan solo sacos con la misma variedad/características/tarifa de una liquidación; ventas conservan su línea identificable. Mostrar tarifa pactada por kg/saco, sin convertirla en promedio neto por devolución ni alterar resumen/caja/cuentas. Los filtros de características afectan al historial de precios, no a indicadores generales del periodo.

Compartir la carga paginada de opciones históricas ya autorizada para Mayorista, incluyendo inactivas, sin usar el catálogo activo de captura. Interfaz distingue Todas y No informada, muestra etiquetas originales y nombres actuales de selección con explicación, permite limpiar y descarta respuestas tardías. Confirmar separación de observaciones de una variedad, saco anulado, aislamiento, parámetros inválidos y fechas Lima con PostgreSQL; verificar estados/limpieza/reintento/sesión y claves estables para varias líneas antes de activar el paquete.

### Calendario comercial y compras sin lotes

El historial de precios de compras confirmadas obtiene las variedades de `reception_sacks` activos, agrupando por operación/variedad y, desde CL-13, por los IDs y etiquetas históricas de características para no duplicarla por saco. Conserva la tarifa global de la liquidación y su base; no deriva márgenes. Todos los enlaces de compra delimitan el negocio. Los rangos diarios de resumen e historial se interpretan en `America/Lima`, igual que 007: inicio inclusivo a medianoche local y fin exclusivo a medianoche local del día siguiente. Las fechas de vencimiento siguen siendo fechas civiles sin conversión. Referencia técnica: https://www.postgresql.org/docs/17/functions-datetime.html.

Verificación PostgreSQL con tablas temporales y rollback: compras a las 04:59:59Z y 05:00:00Z a ambos extremos del día; solo dos incluidas, sin lotes, sin duplicar observaciones por saco, con aislamiento por negocio. El script reproducible es `mercado-api/test/purchase-report-no-inventory.mjs`. La rama de ventas aún requiere SI-04/SI-05; este corte no la declara reconciliada.
## Convergencia de catálogos completos

Los selectores de proveedor, comprador y variedad deben consultar todas las páginas del catálogo central autorizado, usando el cargador compartido existente. No interpretar `limit=100` como el tamaño total del negocio. Un fallo o página faltante impide presentar un catálogo parcial como completo; mantener error y reintento de filtros separados de la generación del reporte. Esta corrección no cambia permisos, operaciones ni aislamiento y beneficia también a datos maestros y 007, que consumen la misma consulta.


## Ciclo de documentos por sesión

El espacio de reportes también se reinicia por token: resultados, filtros, diálogos y catálogos de una sesión no se reutilizan en la siguiente. Las respuestas de consultas de reportes descartadas o desmontadas no cambian la presentación. En el límite de autenticación compartido, una respuesta 401 identifica el token de la petición; solo invalida la sesión vigente si corresponde a ese mismo token. Un rechazo tardío del token anterior no cierra la nueva sesión.

Cada sesión monta un espacio propio de comprobantes. Una descarga tardía no abre vista previa ni dispara compartición tras desmontar/cambiar sesión. Consultas 401 invalidan sesión; errores de historial se distinguen de colecciones vacías y de errores de documento. Reintentar documento repite la operación y acción originales, sin volver a cargar el historial. Una sola descarga/compartición por espacio simultáneamente. Las URL blob creadas para vista previa web se liberan al cerrar/reemplazar/desmontar; no borrar archivos nativos compartidos que otros recorridos puedan usar. No ampliar permisos ni afirmar historial completo por la primera página de 100 registros.


## Historial paginado de comprobantes

GET `/receipts/history/purchases|sales` devuelve `{items,total,limit,offset}` por negocio, solo Mayorista, con máximo 100 y orden creación/UUID descendente. Página y conteo comparten REPEATABLE READ. Filas: ID del origen utilizado para PDF, fecha civil Lima, importe exacto en centavos, estado, referencia y nombre de contraparte histórica; incluir anuladas con acciones deshabilitadas. Compras se consultan desde liquidaciones, sin descargar detalles de cada recepción ni depender de lotes. Frontend recorre páginas de 20 de cada tipo con offsets independientes, carga/error/reintento y descartando respuestas tardías. Listar no genera documentos ni escribe datos comerciales. Este contrato sustituye el corte silencioso en 100.


## Visor web independiente del plugin PDF del navegador

El navegador integrado abrió el PDF autenticado pero mostró iframe vacío. Sustituir el iframe por PDF.js 6.4.299 en el componente exclusivamente web: importar después de montar, worker y fuentes/mapas/wasm de la misma versión servidos localmente en `/pdfjs/`, una página renderizada por vez, navegación, zoom, carga/error/reintento y texto extraído expandible para lector de pantalla. Mantener enlace de descarga del archivo original. Cancelar render y destruir documento/worker al cerrar o reemplazar. No cambiar formatos, importes, permisos ni el visor nativo. Verificar PDF real en navegador, URI/sesión tardías y ausencia de dependencias remotas para el documento.

Comprobación del empaquetado: `mercado-app/scripts/verify-pdfjs-assets.mjs` debe comparar por SHA-256 los recursos esperados y validar versión/manifiesto tanto en `public` como en `dist`, después de copiar/exportar. Evidencia de lectura, pruebas y límites en `docs/sdd/verificacion-visor-pdf-web-2026-10-13.md`; no acreditar accesibilidad completa ni runtime de producción solo con exportación o extracción de texto.

La exportación web requiere dirección pública explícita del backend en el entorno de construcción; Expo la incorpora al bundle. Usar `npm run export:web` para rechazar configuración ausente antes de exportar y comprobar el resultado servido mediante login/consultas/PDF reales. La URL QA local no es una dirección productiva ni contiene secretos. No certificar integración porque el build terminó si no se probó su configuración efectiva.

En el navegador integrado, el import directo del worker falló; el navegador recibía text/plain para el URL anterior aunque el servidor QA corregido respondía JavaScript en la consulta HTTP directa. El adaptador solicita el worker versionado con revisión `?v=6.4.299`, `cache: reload`, sin credenciales y timeout de doce segundos, valida MIME JavaScript y asigna un blob local a workerSrc. El blob se revoca después de destruir la tarea o si falla crearla. No usar CDN, no desactivar políticas del navegador y no sustituir el worker por código inventado. Variante verificada en el export servido para compra/venta en `docs/sdd/verificacion-export-comprobantes-2026-10-13.md`; no atribuir con certeza el fallo a una caché interna no inspeccionada.

El recorrido real detectó que los PDF de venta/devolución usaban fecha UTC mientras historial y reportes usan America/Lima. Formar su fecha civil con America/Lima y distinguir la nueva proyección con sufijo `:date-lima-v1` en sourceVersion. Reutilizar el mecanismo existente de regeneración/invalidation/retención: no sobrescribir bytes/hash de la versión anterior, no modificar la venta ni sus importes. Compras mantienen su fecha civil recibida. Comprobar límite 04:59:59/05:00:00 UTC y fechas del documento recuperado.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
