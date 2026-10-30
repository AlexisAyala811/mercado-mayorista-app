# Recuperación de evaluaciones conservadas — 12 de octubre de 2026

## Corte implementado

Historial central por variedad, exclusivo del Mayorista. La API pagina por fecha de creación e ID descendentes y obtiene conteo/página dentro de REPEATABLE READ. Los resúmenes contienen metadatos, sin observaciones crudas ni evidencia completa. Abrir una versión consulta su UUID dentro del negocio y muestra la evidencia conservada mediante el mismo componente de detalle que usa el guardado.

El historial se presenta al seleccionar variedad, independientemente del periodo descriptivo y de la suficiencia predictiva. Guarda la página al abrir/cerrar una versión, distingue error y vacío y permite reintentar lista o detalle por separado. Una evaluación recién guardada refresca la lista. Cambiar variedad o sesión desmonta la vista anterior; una respuesta 401 tardía de su detalle no invalida la identidad nueva. No recalcula versiones al abrirlas.

## Verificación

- Frontend: tipos y lint sin errores ni advertencias; 24 pruebas analíticas en cinco suites. Incluyen 20/1 filas, apertura desde segunda página, fallo/reintento de detalle sin repetir listado, retorno a la página original, lista fallida frente a vacío real y 401 tardío de otra sesión.
- API: tipos, lint y compilación aprobados; 29 pruebas analíticas en ocho archivos. Se conservan los guards Mayorista y delimitación central del negocio.
- PostgreSQL real: `test/analytics-evaluation-store.mjs` guardó 21 versiones sintéticas dentro del esquema de rollback y comprobó páginas 20/1, 21 IDs distintos, resúmenes sin evidencia, cero versiones para otro negocio y cero para otra variedad. La prueba conservó también las verificaciones anteriores de inmutabilidad, retención, huella y auditoría. No persistió versiones ficticias en el esquema público.
- HTTP real: listado 200 con total cero en la base UI existente; variedad malformada 400. La prueba volvió a verificar los rechazos de creación y confirmó cero versiones nuevas. Evidencia: `tmp/evaluation-http-2026-10-12.json`.
- Web real a 1280 × 800: seleccionar Canchán QA presentó «Evaluaciones conservadas», su descripción independiente de suficiencia y el vacío central con total cero. Captura inspeccionada: `tmp/evaluation-history-empty-tablet-2026-10-12.png`. Se restauró el tamaño del navegador. No se mostraron cifras sintéticas ni se creó historial para llenar la pantalla.

La evidencia PostgreSQL está en `tmp/analytics-evaluation-store-2026-10-12.json`. Las fechas, precios y versiones de las pruebas del renderizador son sintéticos, no evidencia de precisión ni de una versión guardada por el recorrido web real.

## Pendientes

Integración positiva completa de creación/lectura HTTP con entradas suficientes y carrera concurrente real, revisión/revalidación del Mayorista, publicación versionada y seguimiento posterior. Figma DS-045, Android y TalkBack siguen abiertos. Este corte resuelve la recuperación frontend pendiente en la evidencia anterior del servicio; no declara concluido 007 ni el objetivo general.
