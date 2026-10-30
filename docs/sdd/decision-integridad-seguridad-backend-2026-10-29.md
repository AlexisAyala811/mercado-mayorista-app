# Integridad y seguridad del backend: decisiones del 29 de octubre de 2026

Estado: **aprobadas e implementadas en backend; convergencia Android pendiente**. Este registro regulariza en SDD cambios que se implementaron el mismo día a partir de una revisión exhaustiva del backend, antes de actualizar las especificaciones. La constitución exige reflejar todo cambio en los artefactos SDD antes de avanzar; este documento y las secciones fechadas de las especificaciones 001, 004 y 005 cumplen ese paso.

## Origen

Revisión exhaustiva de `mercado-api` (hoy `backend/`) solicitada por el usuario. Hallazgos priorizados y aprobados:

| Hallazgo | Aprobación del usuario |
| --- | --- |
| La idempotencia devolvía el registro guardado sin comprobar que el reintento fuera la misma operación | «Sí, corrígela» |
| Vulnerabilidades altas en `body-parser` y `multer` | «esta bien empieza» (plan: git, `npm audit fix`, …) |
| Cuotas de operaciones anuladas marcadas como `paid` | «si continua» (correcciones de prioridad media) |
| Intento sobre datos de otro negocio sin auditoría (AC04) | «si continua» |
| Límite de inicio de sesión por IP sin `trust proxy`; OpenAPI activo en producción | «si continua» |
| Monorepo con entrega y despliegue continuos | «si, además debe cumplir el principio de entrega continua y despliegue continuo» |

## Decisiones

### D1 · Reintento con datos distintos (amplía CL-04)

Un `clientOperationId` ya registrado solo devuelve el resultado original si el reintento describe la misma operación (recurso de destino e importes, pesos, líneas o registros que determinan el efecto). Si difiere, la API responde `409` con `code: operation-id-conflict` y no aplica efectos. La aplicación no debe reintentar esa orden: genera un UUID nuevo previa revisión del usuario.

Aplica a recepciones, sacos (alta, corrección, retiro y corrección tras cierre), liquidación de compra, venta, devolución comercial, abono, reverso, registro y liquidación de estiba, y liquidación de flete.

### D2 · Cuotas de operaciones anuladas (completa T402)

Al anular una compra o venta a crédito sin abonos vigentes, la cuenta pasa a `voided` y sus cuotas a un nuevo estado `voided` con saldo cero. `paid` queda reservado para cuotas efectivamente canceladas. Las cuotas de cuentas ya anuladas se reclasifican por migración.

### D3 · Auditoría de intentos entre negocios (completa CL-10 y AC04)

Cuando una consulta de detalle (venta, cuenta, recepción, liquidación de compra o comprobante PDF) no encuentra el recurso en el negocio del usuario pero sí existe en otro, se registra `authorization.cross-business-denied` en la auditoría del negocio que consulta. La respuesta sigue siendo `404`, sin revelar la existencia del recurso.

### D4 · Límite de inicio de sesión detrás de un proxy y documentación de la API

`TRUST_PROXY` define cuántos saltos o qué direcciones de proxy se aceptan para obtener la IP real; el límite de 5 intentos por minuto se aplica por cliente. OpenAPI queda desactivado por defecto cuando `NODE_ENV=production`.

### D5 · Monorepo y entrega continua (ADR-05)

Documentación, especificaciones, decisiones y código conviven en el repositorio `mercado-mayorista-app`. Todo cambio entra por pull request con integración continua; cada commit en `main` publica una imagen versionada y, con el entorno de producción configurado, se despliega con migración, comprobación de salud y reversión.

## Impacto en especificaciones

| Decisión | Especificación | Sección |
| --- | --- | --- |
| D1 | 005 | «Integridad de reintentos — 29 de octubre de 2026» |
| D2 | 004 | «Cuotas de operaciones anuladas — 29 de octubre de 2026» |
| D3, D4 | 001 | «Aislamiento auditado y límite de acceso — 29 de octubre de 2026» |
| D5 | `specs/architecture/implementation-baseline.md` | «Monorepo y entrega continua — 29 de octubre de 2026» |

Evidencia: [verificacion-backend-2026-10-29.md](verificacion-backend-2026-10-29.md).

## Pendiente

- La aplicación Android debe tratar `409 operation-id-conflict` en la cola sin conexión (D1) y mostrar `voided` como «Anulada» en las cuotas (D2). Sin esa convergencia, las tareas correspondientes siguen abiertas.
- Configurar el entorno `production` y el proxy HTTPS (D4, D5).
