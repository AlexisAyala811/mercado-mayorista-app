# Confirmación y conservación de publicación — 12 de octubre de 2026

## Corte implementado

Migración 022, servicio/controlador exclusivo del Mayorista y revisión frontend contra el contrato aprobado de 007. La vista previa revalida algoritmo, evidencia, ventana y hechos actuales; devuelve periodo/variables/métricas, sin precios de la semana objetivo. La interfaz muestra las ocho comparaciones de la evaluación antes del botón de revisión. El diálogo de confirmación declara expresamente la revisión; cancelar no envía una publicación.

POST acepta únicamente evaluación, UUID y declaración booleana verdadera. El servidor vuelve a preparar el candidato dentro de REPEATABLE READ, guarda publicación/auditoría y firma revisor/instante centrales. La publicación contiene rango, ancho, cobertura, variables, algoritmo, fechas y evidencia original. El UUID repetido recupera su versión incluso si los hechos cambian después; otro UUID requiere nueva revalidación y crea otra versión si cumple. Los criterios cambiados bloquean nuevas publicaciones y no alteran las conservadas.

La migración relaciona negocio/variedad/evaluación mediante clave foránea compuesta, conserva como mínimo cinco años y rechaza UPDATE/DELETE/TRUNCATE. La reversión con publicaciones existentes se bloquea. No modifica precios o transacciones comerciales.

## Frontend

El componente de revisión se integra en la evidencia recién guardada y en una versión recuperada del historial. Bloquea evaluación fallida, consulta vigencia, solicita confirmación y conserva el UUID al reintentar una respuesta perdida. El rango objetivo solo aparece después de la respuesta de publicación confirmada. Muestra UUID, algoritmo, periodo, referencia de evidencia, revisión en America/Lima, rango/ancho, cobertura, variables y conservación.

Tipos y lint aprobaron; 27 pruebas analíticas en seis suites. Las nuevas pruebas comprueban revisión explícita, cancelación sin POST, ausencia de precio objetivo antes de confirmar, guardado visible, reintento con UUID idéntico y rechazo de evaluación/revalidación fallidas. El éxito visual está comprobado en renderizador con respuesta sintética; no se declara recorrido positivo de publicación en navegador o Android.

## PostgreSQL y HTTP

API: tipos, lint y compilación aprobaron; 34 pruebas de Analítica y registro de migraciones en diez archivos. El ensayo aislado `test/analytics-evaluation-race.mjs` aplicó/revirtió/reaplicó 022 antes de datos, creó una publicación sintética revisada y forzó una carrera real de dos conexiones con el mismo UUID. Se conservó una sola versión y una sola auditoría. Revisión falsa, Encargado, otra identidad de negocio y modificación de entradas fueron rechazados. La versión original permaneció idéntica; fallo de auditoría revirtió el guardado. UPDATE/DELETE/TRUNCATE y reversión de migración poblada fallaron.

El controlador HTTP aislado rechazó revisión falsa y precio enviado por cliente (400), recuperó publicación por POST repetido (201) y GET (200), y rechazó petición nueva con entradas cambiadas (409). Se conservan las limitaciones del adaptador pg y de sesión de prueba descritas en la evidencia concurrente. El esquema sintético y servidor de prueba se retiraron; hubo una publicación solo en ese esquema, ninguna pública.

La migración 022 se aplicó después a la base UI existente, comprobando que era la única pendiente. La API de integración real comprobó vista previa/evaluación inexistentes 404 y declaración falsa 400, con cero evaluaciones/publicaciones nuevas. El historial real insuficiente sigue sin habilitar cifras. Evidencias: `tmp/analytics-evaluation-race-2026-10-12.json` y `tmp/evaluation-http-2026-10-12.json`.

## Pendientes

Historial frontend de publicaciones y recuperación después de recarga, evaluación posterior de cada publicación y reconciliación de disponibilidad predictiva con versiones publicadas. Recorrido positivo visual/nativo con datos aislados, Figma y TalkBack siguen pendientes. Retención/cifrado/backups operativos en producción no se acreditan por pruebas locales. El objetivo general permanece abierto.
