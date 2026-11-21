# Escenarios verificables de calidad

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.2 · **Actualización:** 21 de noviembre de 2026 (resultados del Sprint 2)

| ID | Fuente y estímulo | Entorno y artefacto | Respuesta | Medida | Estado de la evidencia |
| --- | --- | --- | --- | --- | --- |
| AC01 | El operador ingresa un peso; los usuarios consultan | Descarga en piloto; tablet y API | Guardar localmente y responder consultas | Peso < 1 s; p95 central < 3 s con 20 usuarios | **Central: cumple.** Con k6, el p95 se mantiene bajo 3 s hasta 500 usuarios (1647 ms) y lo supera desde 1000 con la API, la base y el generador en un mismo equipo ([k6](../sdd/verificacion-sprint2-2026-11-18.md)). Con Postman, la salud de la API responde en menos de 3 s ([Postman](../sdd/verificacion-postman-escenarios-2026-11-21.md)). **Pendiente:** medir el peso < 1 s en la tablet |
| AC02 | La red se interrumpe 2 h | Tablet sin Internet | Mantener la captura y recuperar pendientes | Continuidad de 2 h; servicio 99,5 % mensual | Cola cifrada implementada; falta validación prolongada y monitoreo |
| AC03 | El cliente reenvía la misma operación cinco veces o reutiliza su UUID con otros datos | API y PostgreSQL | Devolver el resultado previo; rechazar el UUID reutilizado con `409` | Un registro y un efecto financiero | Pruebas unitarias de idempotencia en compras, ventas, cuentas, pesaje, flete y estiba, y 35 pruebas e2e en PostgreSQL 17 (reintentos, concurrencia y respuesta perdida), ejecutadas en cada PR por la CI. **Cumple también por HTTP con Postman:** cinco envíos de la misma recepción devuelven el mismo registro, solo existe uno, y el UUID reutilizado con otros datos responde `409 operation-id-conflict` sin cambiar el original ([Postman](../sdd/verificacion-postman-escenarios-2026-11-21.md)) |
| AC04 | Un usuario consulta datos de otro negocio | Endpoints protegidos y archivos | Denegar y registrar el intento | Cero datos expuestos | Todas las consultas filtran por negocio; se auditan la denegación por rol y los intentos de consultar ventas, cuentas, recepciones, liquidaciones y comprobantes de otro negocio (`authorization.cross-business-denied`), sin revelar que existen. **Cumple también por HTTP con Postman:** el negocio B recibe `404` sin datos de A, cero registros al filtrar por el proveedor de A, y el intento queda en su auditoría ([Postman](../sdd/verificacion-postman-escenarios-2026-11-21.md)) |
| AC05 | Un usuario capacitado registra un cargamento | Tablet 1280 × 800 | Captura y cierre claros | ≥ 90 % sin asistencia ni pérdida | Pendiente: evaluación con usuarios |
| AC06 | La carga sube de 20 a 40 usuarios | Despliegue central | Añadir una instancia del backend | Mantener AC01 | Verificado en el equipo de desarrollo el 17 de noviembre de 2026 ([evidencia](../sdd/verificacion-segunda-instancia-2026-11-17.md)) |
| AC07 | El equipo modifica una regla de estiba | Módulo Costos logísticos y regresión | Cambio localizado | Sin cambios en pesaje ni cuentas | Verificable por revisión de dependencias y pruebas del módulo |
| AC08 | Falla la base central | Respaldo y restauración | Recuperar la operación | RPO 24 h / RTO 4 h | Respaldo y restauración verificados sobre base de prueba (29 oct. 2026); cada versión queda publicada y se puede redesplegar por su etiqueta; falta simulacro con tiempos medidos |

## Verificación de historias complementarias

| Calidad | Historias | Comprobación |
| --- | --- | --- |
| Seguridad | HU07, HU10–HU16 | Cerrar sesión invalida el acceso; el Encargado no obtiene documentos, mensajería, historial ni administración; aislamiento por negocio. Comprobado con Postman el 21 nov 2026: el Encargado no entra sin reemplazo, registra recepciones con él, recibe `403` en administración y auditoría (la denegación queda auditada) y pierde la sesión al revocarse el reemplazo; el sexto inicio de sesión en un minuto responde `429`. |
| Integridad | HU08, HU09, HU15 | Repetir una orden no duplica abonos, liquidaciones ni intentos de envío. |
| Trazabilidad | HU11, HU13, HU16 | Operación, acción auditada y documento enviado muestran origen, responsable y fecha coherentes. |
| Usabilidad | HU10, HU11, HU14–HU16 | Estados vacío, error, reintento y de generación de PDF visibles en tablet. |
