> **Cambio de alcance aprobado — 7 de octubre de 2026:** el usuario retira el control de existencias. Se conservan compras, pesajes, ventas y despachos como registros, y los saldos financieros. Las referencias anteriores a inventario, disponibilidad y valoración por lote están sustituidas por `docs/sdd/cambio-alcance-sin-inventario.md`; la implementación previa requiere adaptación.

# Registro de decisiones bloqueantes

**Estado:** CL-03 a CL-13 resueltas; la secuencia e interpretación de CL-13 se conserva en su propuesta. La aprobación de criterios no acredita su implementación ni la convergencia del proyecto.

## Uso

Para cerrar una decisión se debe registrar la opción elegida, justificación, responsable, fecha, artefactos afectados y evidencia de validación. Luego se actualizan la propuesta documental, especificaciones, Figma y planes o tareas relacionados.

| ID | Decisión requerida | Impacto documental | Impacto de diseño | Impacto técnico |
|---|---|---|---|---|
| CL-03 | Plataforma, navegación y tecnología base. **Resuelta:** Expo, React Native, TypeScript estricto y Expo Router. | Registrar decisión coherente con restricciones. | Define navegación nativa, tamaños y componentes. | Permite crear el proyecto y comandos de verificación. |
| CL-04 | **Resuelta:** UUID por orden, resultado idempotente, versión de agregado y conflicto `409` sin sobrescritura. | Reglas aprobadas para operaciones offline. | Estados pendiente, confirmado, rechazado y revisión. | Contratos, cola, reintentos y pruebas habilitados. |
| CL-05 | **Resuelta:** reemplazo autorizado por el Mayorista, máximo 24 horas, revocable y revalidado en servidor. | Matriz final de permisos aprobada. | Navegación y acciones visibles por rol. | Autorización de rutas y recursos habilitada. |
| CL-06 | **Resuelta:** sesión en almacenamiento seguro y pendientes cifrados por usuario y negocio, bloqueados al cerrar sesión. | Recuperación aprobada. | Recuperación y mensajes de estado. | Almacenamiento protegido y borrado explícito habilitados. |
| CL-07 | **Resuelta:** kg con tres decimales, dinero en céntimos, estados aprobados, disponibilidad tras liquidación y correcciones compensatorias. | Reglas comerciales aprobadas. | Pesaje, cierre, inventario, ventas y correcciones. | Dominio de pesos, lotes, stock y pruebas habilitado. |
| CL-08 | **Resuelta:** propuesta analítica aprobada; 26 semanas completas, cinco ventas válidas por semana, evaluación progresiva de ocho semanas, mejora MAE mínima del 10 % y cobertura mínima 7/8. | Alcance real de IA progresiva. | Datos insuficientes, rango y cobertura observada. | Guardas, evaluación y versionado de estimaciones; aprobación no equivale a suficiencia real. |
| CL-09 | **Resuelta:** tablet 10″ 1280 × 800 horizontal, verificaciones 360 × 800 y 1440 × 1024, volúmenes y continuidad definidos. | Criterios medibles aprobados. | Tamaños y orientación definidos. | Entorno de pruebas y carga definido. |
| CL-10 | **Resuelta:** aislamiento y cifrado, auditoría inmutable, consulta del Mayorista y retención mínima de 5 años. | Reglas de conservación aprobadas. | Consulta y recuperación autorizada. | Acceso, auditoría y archivos habilitados. |
| CL-11 | **Resuelta:** margen comercial estimado reconocido por confirmación, costo por lote, descuentos prorrateados y costos liquidados del periodo. | Completa RF-038 y los criterios verificables de la especificación 006. | Determina cifras, desglose, operaciones sin costo y fecha de corte. | Habilita valoración por lote y reporte trazable. |
| CL-12 | **Resuelta:** devolución comercial idempotente, separada de la devolución física, con efecto compensatorio en cuenta o caja y comprobante. | Completa las reglas de devolución de la especificación 003. | Distingue reposición física de autorización monetaria. | Habilita compensación, invalidación del PDF y auditoría sin borrar hechos. |
| CL-13 | **Resuelta:** calidad y procedencia por saco de compra y línea de venta; listas administradas por Mayorista, opción explícita no informada e historial conservado. Confirmación «eso esta bien» e interpretación comunicada constan en la propuesta. | Completar RF04 y dimensiones descriptivas sin cambiar criterios predictivos. | Captura visible/repetible, administración y filtros independientes. | Contratos, conservación de etiquetas, cola antigua y agrupaciones por características; sin inventario. Referencia: `propuesta-calidad-procedencia-2026-10-14.md`. |

## Orden recomendado

1. CL-09 para fijar el entorno de validación sobre la plataforma seleccionada.
2. CL-11 y CL-12 mediante `backend-remaining-decisions.md` para cerrar el efecto financiero de reportes y devoluciones.
3. CL-08 para iniciar la etapa predictiva después de contar con datos confirmados.

## Decisiones registradas

### CL-03 — plataforma móvil

- Decisión: usar Expo, React Native, TypeScript estricto y Expo Router para la aplicación de tablet Android.
- Justificación: satisface la restricción Android, la separación modular requerida y la prioridad permanente del proyecto por Expo Skills y TypeScript estricto.
- Responsable y fecha: dirección técnica del proyecto, 23 de septiembre de 2026.
- Artefactos actualizados: `specs/architecture/decision-001-mobile-platform.md` y `specs/architecture/expo-bootstrap-contract.md`.
- Evidencia de validación: documentación oficial vigente de Expo consultada mediante Context7; Expo Router viene integrado en proyectos nuevos y permite mantener rutas separadas de dominio y datos.

### Plataforma backend y base central

- Decisión: usar NestJS 12 con TypeScript estricto y PostgreSQL 17; API REST versionada y TypeORM con migraciones explícitas.
- Justificación: mantiene el monolito modular definido por la propuesta, soporta transacciones y separa la tablet de la base central.
- Responsable y fecha: dirección técnica del proyecto con aprobación del usuario, 24 de septiembre de 2026.
- Artefactos actualizados: `specs/architecture/decision-002-backend-platform.md`, `mercado-api` y línea base técnica.
- Evidencia de validación: documentación oficial de NestJS consultada mediante Context7; lint, prueba, compilación y auditoría de dependencias aprobados.

### CL-04 a CL-07, CL-09 y CL-10 — operación comercial

- Decisión: se aprueba íntegramente `backend-decision-proposal.md`, incluidos reemplazos de máximo 24 horas y retención mínima de 5 años.
- Justificación: convierte las ambigüedades de autorización, sincronización, peso, dinero, inventario, cuentas y auditoría en reglas verificables antes de codificarlas.
- Responsable y fecha: dirección del proyecto, 25 de septiembre de 2026.
- Artefactos actualizados: registro de decisiones, especificaciones 001 a 006, planes, tareas y backend.
- Evidencia de validación: aprobación explícita del usuario en la tarea técnica.

### CL-11 y CL-12 — margen y devolución comercial

- Decisión: se aprueban íntegramente las propuestas recomendadas de `backend-remaining-decisions.md`.
- Justificación: definen el reconocimiento del margen, la valoración por lote y el efecto financiero compensatorio de una devolución sin modificar hechos originales.
- Responsable y fecha: dirección del proyecto, 28 de septiembre de 2026.
- Artefactos actualizados: registro de decisiones, especificaciones 003 y 006, planes, tareas y backend.
- Evidencia de validación: aprobación explícita del usuario «Apruebo CL-11 y CL-12 recomendadas» en la tarea técnica.

## Formato de cierre

```md
### CL-XX — título

- Decisión:
- Justificación:
- Responsable y fecha:
- Artefactos actualizados:
- Evidencia de validación:
```

### CL-08 y conservación/permisos de 007 — analítica progresiva

- Decisión: aprobar íntegramente `analytics-decision-proposal.md`, con sus umbrales, evaluación, acceso exclusivo del Mayorista y conservación mínima de cinco años de estimaciones y evaluaciones.
- Responsable y fecha: dirección del proyecto, 6 de octubre de 2026.
- Evidencia: respuesta humana explícita «Apruebo la propuesta analítica completa» en esta tarea técnica.
- Ratificación: el 12 de octubre de 2026 el usuario respondió nuevamente «Apruebo la propuesta analítica completa» a la consulta sobre acceso exclusivo del Mayorista, 26 semanas con cinco ventas válidas por semana, evaluación de ocho semanas, mejora mínima del 10 %, cobertura 7/8 y conservación de cinco años. Se mantiene íntegro el paquete aprobado, sin solicitar otra aprobación de estos criterios.
- Impacto: habilita planificación e implementación de 007. No acredita que el historial real ya cumpla las guardas ni autoriza datos ficticios, publicación automática o envío de historial a terceros.
- Artefactos: propuesta de decisiones, especificación/plan/tareas 007 y fuente documental `build_propuesta.py`. La regeneración y verificación del DOCX deben completarse antes de afirmar convergencia documental.

## Historias complementarias aprobadas

HU01–HU14 están consolidadas en `specs/user-stories.md` y `build_propuesta.py`; la renumeración de offline/analítica es explícita. Mantener seis historias comerciales y ocho complementarias sin duplicación; RF24 corresponde a búsqueda comercial y RF08/RF09 continúan retirados. El canal externo de HU14 requiere su aclaración. Los criterios de producto de HU06 están aprobados; su predicción requiere completar el algoritmo, rango, persistencia y verificación definidos en el plan 007.

## Decisión 26 de octubre de 2026 Mensajería y notificaciones

El usuario confirma compartir PDF, DOC/DOCX e imágenes con clientes/proveedores por WhatsApp o correo, mediante envío manual y con implementación completa. CL-MN01/02/03 resueltas. No se aprueba chat, envío automático ni acceso del Encargado. Especificación 008; HU15 y RF25/RF26. Las referencias históricas a canal pendiente no bloquean esta compartición manual.
