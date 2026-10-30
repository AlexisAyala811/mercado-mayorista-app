# Drivers arquitectónicos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

| Driver y origen | Decisión que orienta | Evidencia requerida |
| --- | --- | --- |
| DA01 Continuidad — RF21, AC02, R01 | Persistencia local cifrada y cola de sincronización: la captura de pesos continúa aunque falle Internet. | Captura de 2 h sin red y recuperación aislada por usuario y negocio. |
| DA02 Integridad — RF06, RF06B, AC03 | Identificador único por operación, versión del registro, transacciones y compensaciones: repetir un envío no duplica pesos ni modifica dos veces un saldo. | Cinco reintentos y escrituras concurrentes sin duplicar registros ni dinero. |
| DA03 Aislamiento — RF01, RF22, AC04, R05 | Autenticación, autorización por rol y negocio y auditoría en el backend; la interfaz no es el único control. | Intentos entre negocios y de rol restringido denegados. |
| DA04 Crecimiento — AC01, AC06, R07 | Backend sin estado que admite varias instancias; ninguna caché es fuente oficial de saldos. | Objetivo de AC01 con 20 y 40 usuarios. |
| DA05 IA progresiva — RF19, R04 | Analítica separada de la confirmación de operaciones; la predicción solo se habilita al cumplir CL-08. | Evaluación aprobada antes de mostrar estimaciones. |
| DA06 Evolución — AC07, R06 | Monolito modular, API versionada y adaptadores de integración; los servicios externos futuros no acceden a la base. | Cambio de regla localizado en un módulo y regresión aprobada. |
| DA07 Recuperación — AC08, R03 | Respaldos automáticos y restauración probada; una réplica no sustituye la copia de seguridad. | RPO y RTO medidos en simulacro. |

Cada tecnología del proyecto se justifica por al menos uno de estos drivers.
