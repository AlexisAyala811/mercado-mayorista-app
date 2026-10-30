# Filtros históricos de Analítica — 12 de octubre de 2026

## Corte contra la especificación

Continuación de T707 y del requisito funcional 1 de 007. La desactivación comercial no elimina operaciones confirmadas ni debe impedir filtrarlas. Se definió el contrato de filtros históricos antes de implementarlo. Analítica ahora consulta proveedores, compradores y variedades activos y desactivados dentro del negocio del Mayorista. Las rutas del módulo mantienen los guards de sesión y rol; devuelven únicamente ID, nombre y estado. La selección y el resultado identifican desactivados, sin reactivarlos.

Los endpoints comerciales y los formularios de nuevas operaciones conservan su comportamiento. Carga histórica paginada de máximo 100 por petición, orden SQL por nombre e ID, detección de páginas incompletas/repetidas y total cambiante mediante el lector existente. Los selectores permanecen bloqueados durante carga o error, con progreso y reintento; el error no se presenta como un catálogo vacío.

## Evidencia ejecutada

- Frontend: tipos y lint aprobados; 21 pruebas en cuatro suites de Analítica y catálogos comerciales. Comprueban desactivados seleccionables e identificados, carga/reintento, participante independiente, respuestas tardías y carga de más de 100 filtros sin resultados parciales.
- API: tipos, lint y compilación aprobados; 17 pruebas en seis archivos de Analítica y CatalogService. Incluyen el guard Mayorista existente y el mantenimiento del catálogo comercial limitado a activos. No se creó un Encargado persistente ni se declara prueba HTTP con ese rol.
- PostgreSQL real: servicio compilado contra tablas temporales en la base aislada UI, con rollback. Compras y ventas confirmadas siguieron apareciendo después de desactivar proveedor, comprador y variedad. Se verificaron los tres tipos de opción desactivada, aislamiento de otro negocio, campos mínimos y 102 proveedores repartidos en dos páginas sin duplicados. Sin escrituras comerciales persistentes.
- Web real: el selector recuperó compradores ficticios desactivados de la API. Se seleccionó QA Historial Paginación 20261007 y se consultó el tablero. El nombre efectivo apareció con «desactivado». No devolvió ventas de ese comprador: sus 21 ventas de la fixture previa están anuladas y no aportan precios al conjunto vigente. Las compras se conservaron según el filtro independiente. No se inventaron ventas ni precios para llenar esa ausencia.
- Teléfono web 360 × 800: nombres largos y «desactivado» se inspeccionaron completos tanto en el diálogo como en el campo seleccionado. Se canceló el selector y se restableció el tamaño del navegador. Capturas: `tmp/analytics-inactive-buyer-selector-2026-10-12.png` y `tmp/analytics-inactive-selector-phone-2026-10-12.png`.

## Límites

No acredita Android nativo, TalkBack, filtros de calidad/procedencia, todos los indicadores o fidelidad Figma DS-044/DS-045. Estimación, evaluación y publicación versionadas permanecen pendientes. Este corte sustituye únicamente la limitación de participantes desactivados registrada en la evidencia previa del mismo día; no declara 007 completo. El objetivo general continúa abierto.
