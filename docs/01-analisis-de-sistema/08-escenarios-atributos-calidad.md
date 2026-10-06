# Escenarios verificables de calidad

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Los objetivos provienen de la propuesta. La existencia de mecanismos o pruebas previas no acredita por sí sola el cumplimiento operativo.

| ID | Fuente y estímulo | Entorno y artefacto | Respuesta | Medida y verificación |
| --- | --- | --- | --- | --- |
| AC01 | Operador ingresa peso; usuarios consultan | Descarga y piloto, tablet/API | Guardar localmente y responder consultas | Peso <1 s; p95 central <3 s con 20 usuarios; medir en dispositivo y carga |
| AC02 | Red se interrumpe 2 h | Tablet sin Internet | Mantener captura y recuperar pendientes | Continuidad 2 h; servicio 99,5 % mensual por monitoreo; validación prolongada pendiente |
| AC03 | Cliente reenvía cinco veces | API y PostgreSQL | Devolver resultado previo | Un registro y un efecto financiero/stock; prueba idempotente y concurrente |
| AC04 | Usuario consulta otro negocio | Endpoint protegido/archivo | Denegar y auditar | Cero datos expuestos en todos los endpoints; pruebas de autorización |
| AC05 | Usuario capacitado registra cargamento | Tablet 1280 × 800 | Captura y cierre claros | ≥90 % sin asistencia ni pérdida; evaluación con usuarios pendiente |
| AC06 | Carga aumenta de 20 a 40 usuarios | Despliegue central | Añadir instancia backend | Conservar AC01; ensayo de carga y despliegue pendiente |
| AC07 | Equipo modifica regla de estiba | Módulo costos y regresión | Cambio localizado | No alterar pesaje ni cuentas; revisión de dependencias y pruebas |
| AC08 | Falla la base central | Respaldo y restauración | Recuperar operación | RPO 24 h / RTO 4 h; simulacro medido; respaldo restaurado previamente, SLA no acreditado |

Evidencia histórica: backend (documentación compartida del proyecto) y frontend (documentación compartida del proyecto).

## EQ-01 · AC01

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Operador ingresa peso; usuarios consultan |
| Condición y artefacto | Descarga y piloto, tablet/API |
| Respuesta esperada | Guardar localmente y responder consultas |
| Medida y verificación | Peso <1 s; p95 central <3 s con 20 usuarios; medir en dispositivo y carga |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-02 · AC02

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Red se interrumpe 2 h |
| Condición y artefacto | Tablet sin Internet |
| Respuesta esperada | Mantener captura y recuperar pendientes |
| Medida y verificación | Continuidad 2 h; servicio 99,5 % mensual por monitoreo; validación prolongada pendiente |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-03 · AC03

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Cliente reenvía cinco veces |
| Condición y artefacto | API y PostgreSQL |
| Respuesta esperada | Devolver resultado previo |
| Medida y verificación | Un registro y un efecto financiero/stock; prueba idempotente y concurrente |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-04 · AC04

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Usuario consulta otro negocio |
| Condición y artefacto | Endpoint protegido/archivo |
| Respuesta esperada | Denegar y auditar |
| Medida y verificación | Cero datos expuestos en todos los endpoints; pruebas de autorización |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-05 · AC05

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Usuario capacitado registra cargamento |
| Condición y artefacto | Tablet 1280 × 800 |
| Respuesta esperada | Captura y cierre claros |
| Medida y verificación | ≥90 % sin asistencia ni pérdida; evaluación con usuarios pendiente |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-06 · AC06

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Carga aumenta de 20 a 40 usuarios |
| Condición y artefacto | Despliegue central |
| Respuesta esperada | Añadir instancia backend |
| Medida y verificación | Conservar AC01; ensayo de carga y despliegue pendiente |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-07 · AC07

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Equipo modifica regla de estiba |
| Condición y artefacto | Módulo costos y regresión |
| Respuesta esperada | Cambio localizado |
| Medida y verificación | No alterar pesaje ni cuentas; revisión de dependencias y pruebas |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |

## EQ-08 · AC08

| Elemento | Descripción |
| --- | --- |
| Fuente y estímulo | Falla la base central |
| Condición y artefacto | Respaldo y restauración |
| Respuesta esperada | Recuperar operación |
| Medida y verificación | RPO 24 h / RTO 4 h; simulacro medido; respaldo restaurado previamente, SLA no acreditado |
| Estado | Objetivo de la propuesta vigente; cumplimiento integral pendiente de evidencia en el entorno acordado. |
