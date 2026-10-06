# Drivers arquitectónicos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Contenido derivado de `build_propuesta.py`, conservando los identificadores de la propuesta vigente. Las reglas detalladas se mantienen en las especificaciones aprobadas del proyecto documental compartido.

| Driver y origen | Decisión e influencia arquitectónica |
| --- | --- |
| DA01 Continuidad — RF21, AC02, R01 | Persistencia local y cola de sincronización: la captura de pesos debe continuar aunque falle Internet. |
| DA02 Integridad — RF06, RF06B, RF08, AC03 | Identificadores únicos, transacciones e idempotencia: repetir un envío no puede duplicar pesos ni modificar dos veces el saldo. |
| DA03 Aislamiento — RF01, RF22, AC04, R05 | Autenticación, autorización por negocio y auditoría en el backend; la interfaz no es el único control de acceso. |
| DA04 Crecimiento — AC01, AC06, R07 | Backend sin estado y balanceo al crecer la carga; caché opcional para catálogos, nunca como fuente oficial de saldos. |
| DA05 IA progresiva — RF19, R04 | Proceso analítico separado de las transacciones: acumular y validar datos, descubrir tendencias y patrones, y habilitar predicciones solo al superar criterios mínimos de calidad e historial. |
| DA06 Evolución — AC07, R06 | Monolito modular inicial, API versionada y adaptadores de integración; los servicios externos futuros no acceden directamente a la base. |
| DA07 Recuperación — AC08, R03 | Respaldos automáticos y restauración probada. Una réplica o caché no sustituye la copia de seguridad. |

## Relación driver → decisión → verificación

| Driver | Decisiones que orienta | Evidencia requerida |
| --- | --- | --- |
| DA01 Continuidad | Cola cifrada y sincronización diferida | Captura 2 h sin red y recuperación por usuario/negocio |
| DA02 Integridad | UUID, versiones, transacciones y compensaciones | Cinco reintentos y concurrencia sin duplicar stock/dinero |
| DA03 Aislamiento | Sesión, guardas, autorización y auditoría | Intentos entre negocios y rol restringido denegados |
| DA04 Crecimiento | Backend escalable y medición de carga | Objetivo AC01 con 20 y 40 usuarios |
| DA05 IA progresiva | Separar análisis de confirmación comercial | CL-08 aprobada y evaluación antes de predicción |
| DA06 Evolución | Capas, módulos y contratos versionados | Cambio de regla localizado y regresión aprobada |
| DA07 Recuperación | Respaldo y simulacro de restauración | RPO/RTO medidos y recuperación íntegra |

Una tecnología se justifica por estos drivers; no se incorpora por aparecer en el repositorio de ejemplo.
