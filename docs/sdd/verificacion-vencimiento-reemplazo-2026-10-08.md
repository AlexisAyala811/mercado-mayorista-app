# Verificación del vencimiento de sesión del Encargado

Fecha: 8 de octubre de 2026. Alcance: HU07/HU12 y captura RF02 durante reemplazo autorizado.

La inspección durante QA Android encontró que el backend comprobaba el reemplazo activo, pero devolvía el TTL de la sesión aunque fuera posterior al fin del reemplazo. Se concretó la regla aprobada en especificación y plan de 001 antes de corregir creación y lectura de identidad.

La creación persiste y devuelve el menor vencimiento entre sesión y reemplazo. La revalidación devuelve ese mismo límite para registros anteriores sin reescribirlos. La comprobación central de autorización/revocación sigue ejecutándose. El cliente conserva el límite conocido; una revocación posterior no puede descubrirse sin conexión y requiere rechazo/revalidación central al reconectar.

Verificación: tipos y lint del backend sin errores; 141 pruebas en 42 suites aprobadas y compilación completada. Se añadieron seis casos para reemplazo más corto, TTL más corto, lectura de sesiones anteriores, denegación auditada y conservación del vencimiento Mayorista. No se crearon usuarios ni reemplazos persistentes y no se modificó el esquema de datos.

La primera ejecución de Vitest en el sandbox falló antes de cargar las suites por EPERM al renombrar su caché temporal. La ejecución fuera del sandbox, autorizada para esta verificación, terminó correctamente. La prueba no acredita todavía el recorrido completo de un Encargado en Android ni sustituye E2E de PostgreSQL.
