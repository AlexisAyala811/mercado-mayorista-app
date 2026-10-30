# Escenarios verificables de calidad

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

| ID | Fuente y estímulo | Entorno y artefacto | Respuesta | Medida | Estado de la evidencia |
| --- | --- | --- | --- | --- | --- |
| AC01 | El operador ingresa un peso; los usuarios consultan | Descarga en piloto; tablet y API | Guardar localmente y responder consultas | Peso < 1 s; p95 central < 3 s con 20 usuarios | Pendiente: medición en dispositivo y prueba de carga |
| AC02 | La red se interrumpe 2 h | Tablet sin Internet | Mantener la captura y recuperar pendientes | Continuidad de 2 h; servicio 99,5 % mensual | Cola cifrada implementada; falta validación prolongada y monitoreo |
| AC03 | El cliente reenvía la misma operación cinco veces o reutiliza su UUID con otros datos | API y PostgreSQL | Devolver el resultado previo; rechazar el UUID reutilizado con `409` | Un registro y un efecto financiero | Pruebas unitarias de idempotencia en compras, ventas, cuentas, pesaje, flete y estiba; falta prueba concurrente sobre PostgreSQL |
| AC04 | Un usuario consulta datos de otro negocio | Endpoints protegidos y archivos | Denegar y registrar el intento | Cero datos expuestos | Todas las consultas filtran por negocio y se audita la denegación por rol; falta registrar en auditoría el intento entre negocios |
| AC05 | Un usuario capacitado registra un cargamento | Tablet 1280 × 800 | Captura y cierre claros | ≥ 90 % sin asistencia ni pérdida | Pendiente: evaluación con usuarios |
| AC06 | La carga sube de 20 a 40 usuarios | Despliegue central | Añadir una instancia del backend | Mantener AC01 | Pendiente: prueba de carga |
| AC07 | El equipo modifica una regla de estiba | Módulo Costos logísticos y regresión | Cambio localizado | Sin cambios en pesaje ni cuentas | Verificable por revisión de dependencias y pruebas del módulo |
| AC08 | Falla la base central | Respaldo y restauración | Recuperar la operación | RPO 24 h / RTO 4 h | Scripts de respaldo y restauración probados sobre base de prueba; falta simulacro con tiempos medidos |

## Verificación de historias complementarias

| Calidad | Historias | Comprobación |
| --- | --- | --- |
| Seguridad | HU07, HU10–HU16 | Cerrar sesión invalida el acceso; el Encargado no obtiene documentos, mensajería, historial ni administración; aislamiento por negocio. |
| Integridad | HU08, HU09, HU15 | Repetir una orden no duplica abonos, liquidaciones ni intentos de envío. |
| Trazabilidad | HU11, HU13, HU16 | Operación, acción auditada y documento enviado muestran origen, responsable y fecha coherentes. |
| Usabilidad | HU10, HU11, HU14–HU16 | Estados vacío, error, reintento y de generación de PDF visibles en tablet. |
