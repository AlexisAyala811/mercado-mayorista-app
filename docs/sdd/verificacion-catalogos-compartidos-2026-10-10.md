# Catálogos completos y recuperación de filtros

Fecha: 10 de octubre de 2026. Alcance: datos maestros y selectores de reportes/analítica; referencias 006 y 007. No cambia permisos, reglas comerciales ni datos persistidos.

La consulta compartida `loadCatalogs` devolvía únicamente la primera página de 100 proveedores, compradores y variedades. Las capturas de compra/venta ya tenían un cargador completo separado. Se corrigió el servicio compartido para utilizar el mismo cargador paginado existente en los tres catálogos. Cada petición sigue enviando el token central; un error o página ausente impide devolver el resultado parcial como completo.

Reportes tiene ahora progreso, bloqueo de selectores dependientes y aviso/reintento de filtros separado del error de generación. Generar un reporte no borra el aviso de catálogo no disponible. Al reintentar, se solicita de nuevo la colección completa; éxito habilita los filtros y retira el aviso. Cambiar periodo y descartar respuestas tardías de reportes conserva su protección existente. Revalidar una sesión con el mismo token no vuelve a iniciar consultas de catálogo innecesariamente.

## Evidencia

- Prueba del servicio compartido con 101 registros por catálogo: seis peticiones, presencia del registro 101 de proveedor/comprador/variedad y token correcto en cada segunda página.
- Prueba de fallo en segunda página de variedades: el servicio rechaza la consulta, sin presentar las primeras 100 como colección completa.
- Prueba del componente Reportes: filtros bloqueados ante fallo, generación independiente conserva el aviso y reintento exitoso habilita filtros.
- Tipos y lint aprobados. Suite completa: 291 pruebas en 43 suites aprobadas.

El primer chequeo detectó una referencia de estilo inexistente y lint detectó actualizaciones síncronas de estado dentro del efecto. Se corrigieron usando el estilo existente y cambiando el estado de reintento desde su acción; la ejecución final pasó.

Estas pruebas usan contratos y servicios simulados; no acreditan un ensayo nuevo de 101 registros persistidos en PostgreSQL ni Android. No se creó ni modificó ningún registro para esta corrección. La visualización de grandes catálogos, los participantes históricos desactivados en filtros y la convergencia Figma siguen requiriendo revisión. Las consultas de cuentas/caja/flete/estiba conservan otros límites iniciales de 100 que deberán resolverse en sus propios cortes de 004; no se declara completo el acceso a todos los historiales financieros por este cambio.
