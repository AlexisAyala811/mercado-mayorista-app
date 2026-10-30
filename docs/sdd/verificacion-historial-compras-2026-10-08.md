# Historial de compras y pesajes: corte HU11

Implementación iniciada el 7 de octubre y verificada en navegador el 8 de octubre de 2026. Consume la especificación y plan de 002, HU11/RF24 y el cambio aprobado sin inventario. No certifica la terminación del frontend completo ni su igualdad visual con Figma.

## Comportamiento y contrato

GET /receptions admite from/to sobre la fecha civil de recepción (`receivedOn`), search literal del nombre de proveedor, providerId y state, además de limit/offset. Las fechas inicial/final son inclusivas. La fecha de creación central puede ser distinta y no sustituye la fecha registrada. El DTO rechaza fechas inexistentes, UUID/estado inválidos, campos desconocidos y páginas mayores de 100; el servicio rechaza rangos invertidos.

La consulta limita recepción y proveedor al mismo negocio, conserva proveedores desactivados y proyecta su nombre sin añadir el objeto de contacto del catálogo. Mantiene las variedades esperadas y cuenta/pagina recepciones completas, sin multiplicarlas por el número de variedades. Orden: receivedOn/createdAt/id descendentes. No consulta ni calcula existencias.

La pantalla solicita páginas de 20. Distingue filtros editados de aplicados, retira resultados viejos al editar, ignora respuestas tardías, ofrece reintento de errores y separa la consulta vacía. El regreso del detalle conserva filtros y página. Actualizar aplica los criterios actuales desde la primera página. Una página posterior vacía provoca una única consulta de la primera con los mismos criterios. Continuar pesaje/liquidación conserva la recepción existente; las operaciones de corrección y anulación mantienen sus contratos y cola duradera.

## Evidencia ejecutada

- Backend: tipos, lint, compilación y 135 pruebas en 41 suites aprobadas. El nuevo DTO tiene nueve comprobaciones.
- PostgreSQL aislado: once pruebas E2E aprobadas. La nueva comprobación del historial usa 101 recepciones del proveedor objetivo, varias variedades por recepción, fechas de creación distintas de receivedOn, proveedor desactivado, caracteres `%` y `_` literales y un segundo negocio. Comprueba conteo, página posterior al límite antiguo de 100, variedades conservadas, estado y rango invertido.
- Frontend: tipos, lint y 241 pruebas en 38 suites aprobadas en ejecución sin caché. Pantalla: seis nuevas pruebas de filtros centrales, paginación/regreso, respuesta tardía, error/reintento, fecha imposible/limpieza y recuperación de página vacía. Las pruebas anteriores de continuación, corrección, anulación y cola pasan. Una prueba adicional verifica codificación de caracteres especiales en la petición de API.
- API local: 21 recepciones ficticias creadas y anuladas mediante API en la base aislada, proveedor desactivado y consulta filtrada con 20/1 registros por página. Fecha de recepción: 7 de octubre; creación de estos casos: 8 de octubre. Respuestas verificadas: 401 sin sesión, 400 por fecha inexistente y 422 por rango invertido. PostgreSQL READ ONLY verifica 21 anuladas, cero movimientos de caja y cero de inventario.
- Navegador: ingreso normal del Mayorista, acceso desde VER COMPRAS, búsqueda por fecha/proveedor/Anulada, segunda página `21–21 de 21`, avance deshabilitado, detalle con proveedor/fecha/estado/versión y retorno a la misma página. Búsqueda distinta muestra Sin resultados y una fecha imposible muestra validación. A 360×800: documento de ancho 360, campos de aproximadamente 247 px y ningún contenedor con desbordamiento horizontal visible; filtros y controles se distribuyen verticalmente.

Artefactos: `tmp/receptions-history-api-2026-10-07.json`, `tmp/receptions-history-ui-fixture-2026-10-07.json`, `tmp/purchase-history-page-two-2026-10-08.png`, `tmp/purchase-history-compact-2026-10-08.png`, `tmp/purchase-history-compact-filters-2026-10-08.png`. El sufijo 2026-10-07 de los datos corresponde a receivedOn y al inicio del corte; la verificación real ocurrió el 8 de octubre. Script de preparación/verificación: `mercado-api/test/prepare-receptions-history-ui.mjs`; no guarda credenciales ni tokens y restringe el nombre de la base al entorno de pruebas.

## Incidencia de pruebas y límites

Una repetición completa encontró un timeout de cinco segundos al cargar componentes nativos de liquidación en frío; la continuación de esa prueba contaminó el siguiente caso. La prueba aislada pasó (tres casos, 1.494 s). Se prepara FlatList/Modal/ScrollView/Text/View antes de medir interacciones y se desmontan los renderizadores en afterEach asíncrono, incluyendo salidas por fallo. No se amplían timeouts ni se eliminan verificaciones. El ciclo de limpieza sigue la documentación de Jest 29.7: https://github.com/jestjs/jest/blob/v29.7.0/docs/SetupAndTeardown.md. La ejecución completa sin caché aprobó tipos, lint y 241 pruebas en 38 suites (50.358 s), incluidas las tres pruebas de liquidación. No hubo fallos ni avisos de actualizaciones fuera de act en ese corte.

La presentación actual usa los componentes compartidos del proyecto. Falta comparar el marco específico de Figma y ejecutar el recorrido en Android; la comprobación del navegador compacto no sustituye una prueba nativa. Las exportaciones anteriores deben regenerarse para entregar este corte. HU11 permanece abierto hasta esos gates; la meta completa continúa activa.
