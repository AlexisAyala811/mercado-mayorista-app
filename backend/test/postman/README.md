# Escenarios de calidad con Postman

Colección de Postman para los atributos de calidad del Sprint 1: AC01, AC03, AC04, roles del Encargado con reemplazo y límite de intentos. Corresponde a la spec 017, tarea T1708. La evidencia está en [la verificación del 21 de noviembre de 2026](../../../docs/sdd/verificacion-postman-escenarios-2026-11-21.md).

| Archivo | Qué es |
| --- | --- |
| `build-collection.mjs` | Genera la colección y el entorno. Edita este archivo, no los JSON. |
| `escenarios-calidad.postman_collection.json` | Colección v2.1: se puede importar en Postman o ejecutar con Postman CLI. |
| `local.postman_environment.json` | Entorno con `baseUrl` local. Usuarios y contraseñas van vacíos. |
| `resultados/` | Salida y resumen de cada corrida, sin secretos. |

Requisitos:

- La API corre en `http://127.0.0.1:3100`, contra una base de prueba con dos negocios y un Mayorista en cada uno.
- Las credenciales se pasan con `--env-var` y nunca se guardan aquí.

```powershell
node test/postman/build-collection.mjs
postman collection run test/postman/escenarios-calidad.postman_collection.json -e test/postman/local.postman_environment.json --env-var userA=... --env-var passwordA=... --env-var userB=... --env-var passwordB=...
```

Entre dos corridas hay que esperar un minuto: la API admite cinco inicios de sesión por minuto y la colección hace seis. El sexto comprueba justamente que responde `429`.
