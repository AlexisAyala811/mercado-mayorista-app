# Escenarios de calidad con Postman

Colección de Postman para los atributos de calidad del Sprint 1: AC01, AC03, AC04, roles del Encargado con reemplazo y límite de intentos. Corresponde a la spec 017, tarea T1708. La evidencia está en [la verificación del 21 de noviembre de 2026](../../../docs/sdd/verificacion-postman-escenarios-2026-11-21.md).

| Archivo | Qué es |
| --- | --- |
| `build-collection.mjs` | Genera la colección y el entorno. Edita este archivo, no los JSON. |
| `escenarios-calidad.postman_collection.json` | Colección v2.1: se puede importar en Postman o ejecutar con Postman CLI. |
| `local.postman_environment.json` | Entorno con `baseUrl` local. Usuarios y contraseñas van vacíos. |
| `build-admin-collection.mjs` | Genera la colección y el entorno del Administrador de comerciantes (spec 023). |
| `administrador.postman_collection.json` | Alta de comerciante idempotente, primer acceso con contraseña temporal, suspensión y reactivación. |
| `administrador.postman_environment.json` | Entorno del Administrador; usuario y contraseña van vacíos. |
| `resultados/` | Salida y resumen de cada corrida, sin secretos. |

Requisitos:

- La API corre en `http://127.0.0.1:3100`, contra una base de prueba con dos negocios y un Mayorista en cada uno.
- Las credenciales se pasan con `--env-var` y nunca se guardan aquí.

```powershell
node test/postman/build-collection.mjs
postman collection run test/postman/escenarios-calidad.postman_collection.json -e test/postman/local.postman_environment.json --env-var userA=... --env-var passwordA=... --env-var userB=... --env-var passwordB=...
```

Entre dos corridas hay que esperar un minuto: la API admite cinco inicios de sesión por minuto y la colección hace seis. El sexto comprueba justamente que responde `429`.

## Administrador de comerciantes (spec 023)

Va en una colección aparte porque la de calidad ya usa los cinco inicios de sesión por minuto. Necesita un Administrador creado con `npm run bootstrap:admin`; las contraseñas del comerciante se generan al azar en cada corrida.

```powershell
node test/postman/build-admin-collection.mjs
postman collection run test/postman/administrador.postman_collection.json -e test/postman/administrador.postman_environment.json --env-var adminUser=... --env-var adminPassword=...
```

Corrida del 26 de noviembre de 2026: 14 peticiones y 23 aserciones sin fallos ([resultados/2026-11-26-administrador.txt](resultados/2026-11-26-administrador.txt)).
