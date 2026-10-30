# Historial de ventas y despachos: corte funcional HU11

Fecha: 7 de octubre de 2026. Consume la especificación y el plan de 003 y el cambio de alcance sin inventario. Este corte no completa el frontend ni certifica fidelidad visual con Figma.

## Comportamiento implementado

Consulta central por fecha inicial/final, nombre literal de participante, identificador de comprador y estado. Las fechas delimitan días civiles de America/Lima; el límite final incluye el día completo. Se mantiene el aislamiento por negocio. Los compradores desactivados conservan sus operaciones y nombre visible; no se proyectan sus datos de contacto.

La pantalla consulta páginas de 20 y conserva los filtros aplicados al avanzar o abrir y cerrar el detalle. Editar un criterio retira resultados anteriores. Las respuestas tardías no reemplazan criterios nuevos. Fechas imposibles y rangos invertidos se rechazan; error con reintento y búsqueda vacía tienen estados distintos. Actualizar aplica los criterios actuales y vuelve al inicio. Si una página posterior queda vacía por cambios concurrentes, se consulta una sola vez la primera página con los mismos criterios.

Los permisos de las rutas existentes se conservan. El contrato no consulta existencias, disponibilidad ni costes por lote, y no cambia la lógica financiera de anulación o devolución.

## Evidencia ejecutada

- Frontend: tipos y lint sin errores; 234 pruebas en 37 suites aprobadas. Incluye filtros, petición central, paginación, respuesta tardía, fecha imposible, recuperación de página vacía y regresiones de cola financiera.
- Backend: tipos, lint y compilación aprobados; 126 pruebas en 40 suites. El DTO valida fechas civiles, UUID, estado, tamaño de página y campos desconocidos.
- PostgreSQL aislado: diez pruebas E2E aprobadas. La prueba del historial verifica 101 resultados, acceso a la página posterior al límite antiguo de 100, límites nocturnos de Lima, comprador desactivado, búsqueda literal con `%` y `_`, estados, rango invertido y aislamiento entre negocios.
- Navegador local: con sesión normal del Mayorista, búsqueda del 7 de octubre por `QA Historial Paginación 20261007` y estado Anuladas devuelve 21 operaciones. Primera página: 20. Segunda: una, resumen `21–21 de 21`, avance deshabilitado. El detalle conserva comprador, destino Lima, fecha, total S/ 15.00, estado Anulada y versión 1. Volver conserva la página y filtros. Cambiar participante elimina resultados; una búsqueda distinta muestra Sin resultados; `2026-02-30` muestra validación sin resultados viejos.

Las 21 operaciones son ficticias y pertenecen exclusivamente a la base local aislada, con confirmación y anulación mediante API. Comprobación PostgreSQL en transacción READ ONLY: 21 ventas anuladas, 42 movimientos de caja, saldo neto cero, 21 auditorías de confirmación y 21 de anulación, cero movimientos de inventario, comprador desactivado y 21 fechas civiles del 7 de octubre. No se utiliza este conjunto como evidencia de precisión analítica.

Artefactos: `tmp/sales-history-page-two-2026-10-07.png`, `tmp/sales-history-financial-verification-2026-10-07.json`, `tmp/sales-history-ui-fixture-2026-10-07.json`. Los scripts de preparación y consulta están en `mercado-api/test/prepare-sales-history-ui.mjs` y `verify-sales-history-ui.mjs`; no guardan credenciales ni tokens. La preparación registra UUID antes de enviar y conserva reversos; no debe reutilizarse como carga de datos de producción.

## Pendientes de convergencia

HU11 tiene evidencia funcional web/API/PostgreSQL, pero permanece abierta su verificación nativa y comparación con el marco específico de Figma. No se dispone del contexto completo de ese marco por el límite del conector; los colores/componentes actuales no acreditan igualdad visual. Las exportaciones anteriores no contienen este corte y deben regenerarse antes de entrega. No cambia el estado pendiente del modelo predictivo 007: la aprobación de criterios no sustituye implementación, evaluación ni revisión del Mayorista.
