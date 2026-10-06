# Decisiones arquitectónicas

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Las decisiones adoptadas se consolidan desde el registro SDD; las versiones son las registradas en el proyecto, no una recomendación de actualización.

| Decisión | Estado y justificación | Trazabilidad |
| --- | --- | --- |
| Tablet Android; Expo, React Native, TypeScript estricto y Expo Router | Aprobada CL-03; captura táctil y separación de interfaz y dominio | R01, DA01; decisión móvil 001 |
| Monolito modular; NestJS y PostgreSQL; REST `/api/v1` | Aprobada plataforma backend; transacciones y menor costo operativo inicial | R03, R07, DA02, DA06; decisión backend 002 |
| Migraciones explícitas y `synchronize: false` | Aprobada; cambios de esquema revisables | AC03, AC08 |
| UUID por orden, resultado idempotente, versión y conflicto 409 | Aprobada CL-04; reintentos sin duplicación ni sobrescritura silenciosa | RF21, AC03, DA02 |
| Encargado con reemplazo autorizado, revocable y máximo 24 h | Aprobada CL-05; se revalida cada orden central | RF02, AC04 |
| Sesión segura y pendientes cifrados por usuario y negocio | Aprobada CL-06; pendientes bloqueados al cerrar sesión | RF01, RF21, R05 |
| Peso con tres decimales y dinero en céntimos | Aprobada CL-07; redondeo y cálculos verificables | RF06B, RF07, AC03 |
| Lote disponible tras liquidación; correcciones compensatorias | Aprobada CL-07; conservar hechos e inventario trazable | RF08, RF22 |
| Tablet 1280 × 800 horizontal; revisión 360 × 800 y 1440 × 1024 | Aprobada CL-09; recorridos nativos todavía pendientes de cierre | AC01, AC05 |
| Auditoría inmutable y conservación comercial mínima de 5 años | Aprobada CL-10; aislamiento también en archivos | RF22, AC04 |
| Margen estimado por lote y devolución comercial separada de la física | Aprobadas CL-11 y CL-12 | RF08, RF17 |
| Predicción de precios | Pendiente CL-08; no habilitar sin criterios aprobados | RF19, RF20, R04, DA05 |

Consecuencias: un despliegue central simplifica operación, pero exige módulos bien delimitados; la cola local agrega estados y resolución de conflictos; el escalamiento horizontal requiere medir concurrencia y mantener la autoridad transaccional central.

Registro completo: decisiones y aprobaciones (documentación compartida del proyecto).

## Alternativas y consecuencias

| Elección | Alternativa considerada | Motivo y costo asumido |
| --- | --- | --- |
| Monolito modular | Microservicios | Equipo y operación inicial acotados; despliegue conjunto y acoplamientos deben vigilarse |
| Persistencia local temporal | Cliente dependiente permanentemente de Internet | La descarga debe continuar; agrega cifrado, reintentos y revisión de conflictos |
| PostgreSQL transaccional | Almacenes separados por cada dominio | Stock, cuentas y caja necesitan confirmar efectos coordinados |
| Token opaco y sesión central | Dar permisos solo desde el menú | Revocación y reemplazos exigen autoridad central por operación |
| Cálculo decimal determinista | Aritmética monetaria binaria en la pantalla | Evitar diferencias de redondeo y resultados no reproducibles |
| REST versionada | Acceso SQL desde dispositivo | Mantener autorización y reglas en una frontera controlada |

No se declara Clean Architecture completa: el backend actual tiene servicios que utilizan el ORM y entidades de varios dominios. La evolución hacia puertos más aislados requiere plan y verificación de atomicidad, sin alterar reglas comerciales aprobadas.
