# RF04 / CL-13: captura, historial y comprobantes

Continúa `verificacion-catalogos-caracteristicas-2026-10-14.md`; aquel registro describe el corte anterior. Fuente de decisión y secuencia de respuestas en `propuesta-calidad-procedencia-2026-10-14.md`. Contratos en `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`.

## Implementación

- Calidad/procedencia por saco de compra y línea de venta, con No informada. Compra conserva selecciones visibles para el siguiente saco. Corrección muestra etiquetas originales aunque el catálogo cambie; otra selección exige opción activa. Salir con características no guardadas activa el aviso de borrador.
- API recibe IDs UUID/null, valida negocio/dimensión/actividad y conserva etiquetas del servidor. En creación, omisión equivale a desconocido; en corrección, conserva original; null explícito limpia solo la versión corregida. Nombres del cliente no son autoridad. Una variedad admite varias combinaciones en la venta. Sin cambios monetarios ni inventario.
- Migración 025 agrega pares ID/nombre nulos sin rellenar hechos antiguos y unicidad variedad/calidad/procedencia con NULLS NOT DISTINCT. Down rechaza características conocidas. FK por ID y validación de negocio/dimensión por servicio; no existe FK compuesta de esas dimensiones.
- Catálogos cifrados v2; lector v1 mantiene compatibilidad con listas vacías y aviso. Cola guarda IDs en cuerpo e instantáneas de presentación separadas; recuperación valida correspondencia y no inventa etiquetas. Historial de compras/ventas muestra los datos congelados.
- PDF de compra agrupa por variedad, IDs y etiquetas históricas, sumando peso con enteros. Venta muestra etiquetas originales y devolución las hereda de la línea de venta. Nueva proyección `:characteristics-v1`, sin sobrescribir contenido ni retención anteriores. Infraestructura existente de versiones/auditoría; no cambia caja/cuentas. Medición antes de salto mantiene juntos nombre, importe y etiquetas; Context7 `/foliojs/pdfkit` consultado sin cambiar dependencia.

## Evidencia

- Frontend: `npm run check`, tipos/lint y **470 pruebas / 68 suites** aprobados; `tmp/capture-characteristics-frontend-check-20261014.log`. Selección/ausencia, catálogo histórico, cuerpo versus metadatos, repetición entre sacos, borrador, dos líneas de la misma variedad, caché antigua/corrupta, recuperación e historial con etiquetas diferentes.
- Backend: `npm run check`, tipos/lint/compilación y **206 pruebas / 56 archivos** aprobados; `tmp/receipt-characteristics-backend-check-20261014.log`. Resolver central, IDs ajenos/dimensión, etiquetas congeladas, null/omisión, duplicados y seis pruebas de proyección/servicio PDF. Conservación de bytes/retención y reuso de nueva versión probados con repositorio simulado, no PostgreSQL de comprobantes reales.
- PostgreSQL real: `mercado-api/test/operation-characteristics.pg.mjs`; migraciones 004/024/025 y resolver/servicio reales sobre esquema mínimo dentro de transacción. Filas antiguas desconocidas, combinaciones válidas/duplicadas, pares incompletos, negocio/dimensión y renombrado/desactivación comprobados. Rollback raíz y ausencia posterior del esquema. `tmp/operation-characteristics-pg-20261014.json`, 2026-10-14T15:22:13.904Z. Sin efectos financieros ni esquema comercial completo.
- Export aislado presente: `tmp/web-export-capture-characteristics-20261014`, entry `entry-73dfc4ab059a9bcdd89ba65159bfcb05.js`, SHA-256 `14A7FBBE8CD15B00EDED069109BEF54D2FDF7334AF12CC16F67DBC1C6BBB97C4`. Salida de consola original perdida en compactación: verificados artefactos terminados y ausencia de export activo, sin repetirlo ni atribuir código de salida recuperado. PDF.js 6.4.299: 200 archivos por raíz con hashes idénticos, 2026-10-14T15:31:24.945Z.
- PDF sintético: `mercado-api/test/receipt-characteristics-visual.mjs`, sin API/base ni envío financiero. Compra de tres grupos, venta de 24 líneas y devolución solo proyectada, con etiquetas largas y ausencia. Tres PDF/cuatro PNG en `tmp/pdfs/characteristics-20261014`, inspeccionados visualmente tras corregir separación de la línea 14 y sus características. Poppler avisó falta de fuentes de sustitución Symbol/ArialUnicode; no se observaron glifos faltantes. La primera muestra excedía 120 caracteres y fue rechazada antes de generar; corregida al límite aprobado.

## Límites

Actualización posterior: filtros descriptivos y activación QA completados en código/entorno según `verificacion-filtros-caracteristicas-2026-10-14.md`. Sustituye las referencias siguientes a migraciones no aplicadas, API/web sin actualizar y filtros sin implementar; estas describen el estado anterior. No sustituye los gates de operación UI completa, Android/Figma/accesibilidad y DOCX.

Comprobación textual posterior de los PDF con pypdf: compra 1 página/3 grupos, venta 2 páginas/13 y 11 líneas con igual cantidad de etiquetas por página, devolución 1 página/1 línea. `tmp/pdfs/characteristics-20261014/verification.json`, 2026-10-14T15:38:45Z; complementa la inspección visual, no la sustituye.

Migraciones 024/025 no aplicadas a la base UI compartida; API no reiniciada y web servida no sustituida. Requiere activar ambos lados de forma coherente. No se reenvió la devolución financiera pendiente ni se eludieron bloqueos de UI.

Pendientes: filtros descriptivos calidad/procedencia y opciones históricas, operaciones completas HTTP/PostgreSQL, recorrido UI/Android/offline actual, lector de pantalla, Figma y regeneración/QA del DOCX. Predicciones por variedad sin cambios. No cerrar RF04/T707 ni el frontend completo.
