# Identificación y búsqueda de cuentas

Fecha: 11 de octubre de 2026. Alcance: 004 y HU04/HU08.

La API de listado y detalle agrega counterpartyName a las cuentas autorizadas. La consulta por lote delimita negocio e IDs de cuenta, y enlaza proveedor/comprador usando tipo, ID y negocio coincidente. Incluye nombres de participantes desactivados para el historial; una relación ausente devuelve null. No devuelve contactos ni requiere migración. Los campos previos de cuenta se conservan mediante una proyección explícita; no se extiende una entidad ORM con spread ni se modifica la entidad leída.

El frontend muestra nombre y referencia en listado, detalle y confirmación financiera. Busca nombre/referencia sin distinguir mayúsculas o acentos, combina tipo por pagar/cobrar con estado y permite limpiar filtros. Distingue búsqueda sin resultados de colección vacía. Los filtros no cambian caja y se conservan al consultar y volver del detalle. Cuando falta un nombre se muestra una etiqueta explícita, sin inventar una contraparte.

## Verificación

- Frontend: tipos y lint aprobados; 321 pruebas en 46 suites aprobadas, incluyendo filtros, ausencia de nombres y recorrido de consulta/retorno con caja intacta.
- Backend: tipos y lint sin advertencias, 144 pruebas en 43 suites y compilación aprobadas. Tres regresiones de presentación cubren conservación de datos/página, nombre nulo y cuenta inexistente.
- PostgreSQL real: se ejecutó el AccountsService compilado con un adaptador de consulta SQL y tablas temporales. Proveedor y comprador desactivados del negocio conservan su nombre; una referencia inconsistente a proveedor de otro negocio no devuelve su nombre; una cuenta ajena no aparece en listado y su consulta es rechazada; el negocio propietario sí recibe su propia contraparte. Transacción revertida y conexión cerrada, sin cuentas ni actores persistentes creados. Evidencia: `tmp/account-names-postgres-2026-10-11.json`; reproducción: `mercado-api/test/verify-account-names-postgres.mjs` sobre la base aislada indicada por el runner, con credencial existente solo en memoria.

El arranque de PostgreSQL superó el tiempo de espera de pg_ctl mientras recuperaba su directorio. Se comprobó proceso y log hasta confirmar que aceptaba conexiones; no se reinició por el timeout ni se retiraron bloqueos. La primera regresión del componente contó dos nodos por cada control simulado (componente y host); se corrigió el selector para contar los controles host y el recorrido final pasó.

La prueba SQL verifica proyección y aislamiento de nombres con tablas temporales, no autorización HTTP, rendimiento de listas amplias ni toda la funcionalidad de cuentas. La revisión del controlador confirma que conserva SessionAuthGuard/RolesGuard y Mayorista; el recorrido nuevo de cuentas con token real, Android, teclado, lector de pantalla y Figma sigue pendiente.
