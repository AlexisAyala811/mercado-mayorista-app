# Corte transversal RF04 / CL-13: calidad y procedencia

Fuente: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`, respuesta e interpretación comunicada del usuario. Complementa 002/003/004/006/007; no crea inventario ni cambia permisos predictivos.

## Contrato de administración

GET `/api/v1/catalog/qualities` y `/api/v1/catalog/origins`: páginas centrales limit/offset, `{items,total,limit,offset}`, opciones activas del negocio autenticado. Lectura de catálogo para selección autorizada, sin conceder administración/analítica al Encargado. POST de cada colección recibe `{name}` obligatorio, 1–120 caracteres tras trim. PATCH `/:id` recibe el nuevo nombre obligatorio; DELETE `/:id` desactiva y responde 204. Solo Mayorista puede mutar. UUID válido, recurso del negocio y dimensión correctos o 404; nombre activo duplicado sin distinguir mayúsculas o 409. Desactivación conserva la fila y permite usar el nombre en una nueva opción con otro ID.

Persistencia aditiva en `commercial_characteristics`: identidad UUID, business_id, kind quality/origin, nombre, is_active, fechas. Índice único activo por negocio/dimensión/lower(name); sin valores comerciales precargados. «No informada» se representa como ausencia de ID en el hecho y como opción explícita de la interfaz, no como registro de catálogo. Cambios y desactivaciones con auditoría en la misma transacción. Migración down rechaza filas existentes.

Frontend amplía Datos maestros con ambas listas, conserva proveedores/compradores/variedades, limita campos a Nombre en estas dimensiones, carga todas las páginas, maneja carga/error/reintento/vacío y bloquea doble envío/edición durante escritura. No exponer nuevas capturas antes de conectar contratos y conservación histórica.

## Secuencia completa pendiente

### Contrato de captura e historial

POST/PATCH de sacos y cada línea de POST /sales admiten `qualityId` y `originId`, UUID o null. Omitidos en una creación antigua equivalen a no informada; omitidos en corrección conservan el ID y la etiqueta histórica del original. Null explícito borra la selección solo en la nueva versión corregida. Los nombres no son entrada de la API: el servidor los toma del catálogo del negocio/dimensión y los conserva en `qualityName`/`originName` junto al ID. Al mantener un ID original se conserva también su etiqueta, aunque el catálogo esté renombrado o desactivado; elegir otro ID exige opción activa y lectura bloqueada durante la transacción. Reintento por el mismo UUID devuelve el hecho existente antes de validar de nuevo catálogos.

Migración 025 añade campos nulos sin actualizar hechos existentes. FK de ID conserva referencias; los servicios comprueban negocio/dimensión, pares ID/etiqueta y opciones activas. La unicidad de líneas sin lote pasa de variedad a la combinación variedad/calidad/procedencia, con nulls equivalentes en PostgreSQL 17. No cambia cálculos financieros, trazabilidad ni precio global de liquidación de compra. Una corrección sustituye el saco mediante el mecanismo existente y conserva el anterior.

Catálogos cifrados v2 incluyen ambas listas; lector admite v1 y proyecta listas vacías con aviso, sin atribuir datos conocidos a operaciones antiguas. La cola antigua sin IDs se conserva. Los sacos offline nuevos guardan IDs en el cuerpo y una instantánea de etiquetas solo para presentación en metadatos cifrados; el servidor no acepta esas etiquetas como autoridad. Recuperación valida correspondencia entre cuerpo/metadatos. La interfaz mantiene visibles las selecciones entre sacos, permite No informada y muestra los datos del original al corregir.

1. Administración de listas y prueba de aislamiento/dimensión, duplicados, auditoría, roles y desactivación; UI con selección de lista y nombres accesibles.
2. Datos de saco y línea de venta: IDs y etiquetas históricas, selección no informada, snapshot de valores en la operación; actualización/corrección conforme al estado vigente. Compras guardan características por saco; ventas admiten más de una línea de la misma variedad cuando su combinación cambia.
3. Migración sin relleno de hechos existentes. Cola antigua omite IDs y mantiene ausencia de información; catálogo offline por identidad con hidratación compatible. Devoluciones heredan características sin nuevas existencias.
4. Historial/detalle/PDF y filtros descriptivos calidad/procedencia; agrupación y ponderación exactas, ausencia explícita y hechos compensatorios. Conservar parámetros/filtros históricos; no modificar el motor predictivo por variedad.
5. Convergencia con documento académico y Figma, API/PostgreSQL real, dispositivos, accesibilidad y trazabilidad. El catálogo aislado no cierra RF04 ni T707.

## Verificación

### Filtros descriptivos RF04

GET `/analytics/filters/qualities` y `/analytics/filters/origins` devuelven páginas de opciones del negocio, incluidas desactivadas, sin modificar catálogos ni hechos. La selección identifica un ID estable, agrupando sus etiquetas históricas; el nombre de la lista es el nombre actual del catálogo y no reclasifica los hechos. La interfaz explica esta diferencia.

GET `/analytics/series` admite `qualityId` y `originId`: UUID de opción, `unreported` para ausencia explícita o parámetro omitido para todas. Ambas dimensiones se combinan mediante AND y afectan compras y ventas. Filtrar sacos antes de agrupar la compra; filtrar líneas originales de venta antes de incorporar sus devoluciones. No atribuir características nuevas a una devolución ni consultar el catálogo activo para excluir hechos antiguos. Los IDs de otros negocios nunca aportan hechos. La respuesta conserva los parámetros aplicados; cambiar una selección descarta resultados y respuestas tardías. Sin selección, las sumas y agrupación por semana/variedad siguen iguales. Contar operaciones distintas, no líneas, también con varias combinaciones de una variedad.

Estos filtros son solo descriptivos: disponibilidad, evaluaciones y publicaciones siguen recibiendo variedad y fecha según sus contratos aprobados. Seleccionar No informada no significa todas. Probar filtros conocidos, desconocidos, combinados, desactivados/renombrados, aislamiento, compensaciones al corte y suma exacta en PostgreSQL antes de cerrar el corte.

### Proyección de comprobantes RF04

La compra agrupa por variedad, IDs y etiquetas históricas de calidad/procedencia; dos etiquetas distintas del mismo ID renombrado se conservan separadas. Se suman sacos y milésimas de kilogramo con enteros. Venta y devolución muestran las etiquetas guardadas en la línea original; no consultan los nombres actuales del catálogo. Cada línea indica explícitamente Calidad y Procedencia, con No informada para ausencia histórica. Una devolución no acepta nuevas características.

La proyección añade `:characteristics-v1` a la versión de origen del PDF, después de la versión civil Lima cuando corresponda. Se conserva la infraestructura de nuevas versiones, hash, auditoría y retención; ningún PDF anterior se sobrescribe ni se cambia su contenido o vencimiento. El cambio de proyección solo hace que la nueva versión sea la vigente. No modifica la operación, sus importes, caja o cuentas. Verificar agrupación, herencia, versión, conservación y legibilidad de etiquetas largas antes de activar este corte.

Probar creación y renombrado con audit atómico, duplicados 409, mismo nombre entre negocios/dimensiones, acceso Encargado de solo selección, IDs ajenos 404, desactivación y conservación. En integración posterior, dos calidades/procedencias de una variedad, no informada, devoluciones y sumas sin mezclar segmentos; hechos anteriores sin reclasificación. Pruebas de UI no sustituyen migración real ni Android/Figma.
