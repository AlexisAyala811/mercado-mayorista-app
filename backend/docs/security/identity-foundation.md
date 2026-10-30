# Fundamentos de seguridad de identidad

## Implementado

- Las contraseñas se derivan con `scrypt`, sal aleatoria individual y parámetros incluidos en el valor almacenado.
- La comparación usa `timingSafeEqual` y rechaza formatos o parámetros fuera de límites.
- La columna `password_hash` tiene `select: false`; solo la consulta específica de credenciales la incluye.
- Los nombres de usuario se consultan mediante un parámetro y comparación exacta sin distinguir mayúsculas.
- Usuario inexistente y contraseña incorrecta producen el mismo resultado vacío; el caso inexistente también realiza trabajo de derivación.
- Los tokens de sesión contienen 256 bits aleatorios. La base conserva únicamente su hash SHA-256.
- Las sesiones admiten vencimiento y revocación explícitos.
- La API aplica un límite global de 100 solicitudes por minuto y reduce el inicio de sesión a 5 intentos por minuto por origen.
- La creación y revocación de sesiones escriben auditoría dentro de la misma transacción; la tabla de eventos rechaza actualizaciones y eliminaciones mediante un trigger.
- Las mutaciones de proveedores, compradores, variedades, transportistas, vehículos y recepciones escriben su auditoría en la misma transacción.
- Cada respuesta incluye `X-Request-Id`; los registros HTTP omiten cuerpos, credenciales y parámetros de consulta.
- Los errores inesperados se registran por tipo e identificador de solicitud y responden sin revelar mensajes internos.
- Se aplican cabeceras HTTP seguras, límite de cuerpo de 100 KiB y apagado ordenado.

## Pendiente antes de exponer el endpoint

- Duración de sesión, revalidación offline y tratamiento de pendientes según CL-06.
- Inicio, vencimiento y revocación del reemplazo del Encargado según CL-05.
- Retención y consulta de auditoría según CL-10.
- Almacenamiento distribuido del limitador cuando existan múltiples instancias del backend.

No existe usuario, contraseña ni token predeterminado en el repositorio.
