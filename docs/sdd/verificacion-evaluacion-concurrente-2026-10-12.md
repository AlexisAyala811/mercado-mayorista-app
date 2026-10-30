# Guardado completo y concurrencia de evaluación — 12 de octubre de 2026

## Entorno y alcance

`mercado-api/test/analytics-evaluation-race.mjs` ejecutó el servicio, repositorio, motor, lector histórico y controlador compilados con PostgreSQL real. Usó un esquema desechable de la base UI aislada, con 26 semanas y 130 ventas sintéticas. Los datos fuente, versiones y auditorías pertenecieron únicamente a ese esquema. Reutilizó las referencias de la cuenta ficticia Mayorista y su variedad existentes, sin crear usuarios, credenciales, roles, negocios o delegaciones.

Para permitir una carrera real, los fixtures del esquema se confirmaron antes de abrir conexiones independientes. Cada transacción del servicio usó una conexión pg propia, REPEATABLE READ y search_path local exclusivo al esquema de pruebas con public como respaldo de referencias. El adaptador implementó la interfaz transaccional del DataSource; no se declara prueba del pool TypeORM en este ensayo. Los métodos de negocio son los compilados de producción.

## Concurrencia y versiones

Una barrera esperó que dos snapshots PostgreSQL observaran ausencia de la misma petición antes de permitir el guardado. PostgreSQL produjo una violación real de unicidad 23505. El servicio reintentó y ambas peticiones devolvieron el mismo UUID de versión y la misma huella. Se verificó una sola evaluación y una sola auditoría para esa carrera, no solo igualdad de respuesta.

Se recuperaron ocho comparaciones conservadas; una repetición posterior volvió a la versión original. Reutilizar el UUID con otra variedad fue conflicto. Cambiar una entrada sintética y solicitar otro UUID produjo versión y huella nuevas; la lectura de la primera siguió siendo idéntica. Ambas aparecieron en el listado central del esquema. Ninguna autorizó publicación.

## HTTP positivo aislado

Se consultó la documentación oficial de NestJS TestingModule mediante Context7. El controlador real se probó con DTO/ValidationPipe y el RolesGuard de producción. Solo SessionAuthGuard fue sustituido por una entrada de identidad de prueba protegida por un bearer aleatorio efímero; ese valor permaneció en memoria. El servidor escuchó en 127.0.0.1 y puerto efímero y se cerró al terminar. No se cambiaron la aplicación de integración del puerto 3000, sus sesiones o permisos.

POST devolvió 201 con la versión original; GET detalle y listado devolvieron 200 y conservaron contenido, fechas y huella. El listado no incluyó evidencia cruda. Sin bearer se obtuvo 401; una identidad de prueba Encargado recibió 403 del guard de rol real; UUID inválido obtuvo 400. Esta prueba no sustituye la comprobación del login/SessionAuthGuard reales del ensayo HTTP previo.

## Limpieza y límites

Se comprobó que ninguno de los 130 IDs de venta ni de los UUIDs de petición usados apareció en las tablas públicas. No se publicaron estimaciones. El esquema desechable completo se retiró y el servidor se cerró, también con limpieza prevista ante error. Evidencia: `tmp/analytics-evaluation-race-2026-10-12.json`.

El ensayo resuelve la integración positiva del controlador/servicio con PostgreSQL aislado y la carrera concurrente pendientes de los cortes anteriores, con las limitaciones explícitas del adaptador y la entrada de sesión de prueba. No acredita precisión con datos reales del negocio, éxito del formulario de evaluación en navegador/Android, revisión del Mayorista, publicación o Figma. Esos cortes permanecen abiertos.
