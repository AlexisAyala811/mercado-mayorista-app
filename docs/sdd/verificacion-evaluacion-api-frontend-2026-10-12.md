# Evaluación analítica: servicio HTTP y panel — 12 de octubre de 2026

## Corte implementado

T709/T710 según contratos 007. Servicio exclusivo del Mayorista para crear y consultar evaluaciones. Recupera una petición ya conservada antes de reconstruir entradas; reutilizar UUID con otro corte o variedad devuelve conflicto. Reconstrucción histórica, validación de la ventana final, cálculo y guardado/auditoría usan el EntityManager de REPEATABLE READ. Errores de calidad/continuidad son 422; no se convierten fallos SQL desconocidos en datos insuficientes. Reintenta como máximo tres transacciones ante serialización/deadlock o unicidad de la petición y devuelve 503 al agotar intentos. No reintenta otras restricciones de unicidad.

POST admite solo variedad, corte y UUID; no acepta precios, resultados ni entradas calculadas por el cliente. GET por UUID delimita negocio y devuelve metadatos, ventana, MAEs, criterios y ocho comparaciones, sin observaciones crudas. Todos los resultados mantienen publicación no disponible y revisión requerida.

El frontend incluye el panel de evaluación únicamente para variedad específica cuya disponibilidad central indique historial suficiente. Usa la misma petición al reintentar, bloquea envíos dobles y descarta una respuesta de una vista/sesión desmontada. Muestra versión, corte, conservación, MAEs, mejora, cobertura y comparaciones como evaluación histórica, sin precio futuro publicado. Crear otra evaluación usa otro UUID. La consulta de versiones anteriores desde una lista todavía falta; GET está disponible en el servicio API cliente, pero no se declara una navegación de recuperación terminada.

## Verificación

Tipos, lint y compilación de la API aprobaron; 29 pruebas analíticas en ocho archivos. Cubren servicio, motor, reconstrucción y autorización. Los nuevos ensayos del servicio reconstruyen ocho prefijos con datos sintéticos, verifican el manager transaccional, recuperación antes de consultar fuentes, conflicto, reintentos acotados y rechazo de Encargado/corte futuro/historial insuficiente. La carrera concurrente real y el guardado HTTP exitoso con historial real siguen pendientes; las pruebas simuladas no los acreditan.

Frontend: tipos y lint aprobaron; 21 pruebas analíticas en cuatro suites. El panel comprueba recuperación de respuesta perdida con el mismo UUID, otra versión con UUID nuevo, protección de doble pulsación y descarte de respuesta de sesión anterior. La vista de éxito está probada en renderizador con respuesta sintética, sin presentar esas cifras en el tablero conectado a datos reales.

La migración 021 se aplicó en el esquema público de la base UI aislada, después de comprobar que era la única pendiente y que las veinte anteriores estaban aplicadas. No se ejecutaron migraciones de otro entorno ni se modificaron tablas comerciales. Este estado sustituye la limitación de aplicación pendiente de la evidencia anterior de conservación.

HTTP real con la cuenta ficticia Mayorista existente: 401 anónimo; 400 UUID de petición inválido; 422 corte futuro; 422 historial insuficiente; 404 versión inexistente. Se comprobó que el número de evaluaciones no cambió y se cerró la sesión del script. Evidencia: `tmp/evaluation-http-2026-10-12.json`. Sin operaciones comerciales ni publicaciones.

## Pendientes para convergencia

Lista y consulta recuperable de versiones en frontend, prueba concurrente real, integración positiva con PostgreSQL/HTTP y una fuente histórica aislada suficiente, revisión/revalidación y publicación versionada, evaluación posterior de publicaciones y DS-045 en Figma/Android/TalkBack. La API real conserva sus guardas: no se fabricó historial para habilitar cifras en el entorno UI. El objetivo general permanece abierto.
