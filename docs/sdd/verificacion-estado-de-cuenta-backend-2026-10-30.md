# Verificación del backend del estado de cuenta del comprador

**Fecha:** 30 de octubre de 2026 · **Especificación:** [009](../../specs/009-buyer-account-statement/spec.md) · **Plan:** [plan 009](../../specs/009-buyer-account-statement/plan.md) · **Rama:** `feat/hu16-backend`

## Alcance

Tareas T910–T914 (cálculo), T920–T922 (PDF e imagen) y T930–T934 (servicio, API, e2e, documentación y tiempo de respuesta). La parte Android (T940–T944) y la convergencia con Figma (T950–T951) no forman parte de esta verificación.

## Pruebas

| Nivel | Archivo | Resultado |
| --- | --- | --- |
| Unitarias del cálculo | `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` | 10 aprobadas |
| Vista, PDF e imagen | `backend/src/receipts/buyer-statement/buyer-statement.documents.spec.ts` | 5 aprobadas |
| Servicio y controlador | `backend/src/receipts/buyer-statement/buyer-statement.api.spec.ts` | 8 aprobadas |
| Suite unitaria completa | `npm test` | 287/287 en 67 archivos |
| Tipos, lint y build | `tsc`, `oxlint`, `nest build` | Sin errores |
| E2E en PostgreSQL 17 portable | `backend/test/buyer-statement.e2e-spec.ts` y el resto de la suite | 39/39 en 4 archivos; 40/40 con la medición de T934 |
| CI de la rama (push) | Backend · CI, run 41119590109, commit `22fa228` | Tipos/lint/pruebas/build, e2e e imagen Docker aprobados; render PNG dentro del contenedor Alpine aprobado |

La e2e reproduce por HTTP el ejemplo de la spec: venta a crédito de S/ 800,00 en dos cuotas, abono de S/ 300,00 y devolución comercial de S/ 100,00. Comprueba:

- importes de la venta (800,00 · 300,00 · 100,00 · 400,00) y total adeudado S/ 400,00;
- el abono cancela primero la cuota más antigua y la devolución acredita la más lejana: cuota vencida S/ 100,00 y siguiente S/ 300,00;
- un solo documento PDF y uno PNG por versión, reutilizados en la segunda descarga del día;
- un comprador consultado desde otro negocio recibe `404` y el evento `authorization.cross-business-denied` queda solo en la auditoría del negocio que consulta;
- el Encargado recibe `403`.

## Hallazgo corregido

La primera ejecución e2e falló con `500 QueryFailedError` al guardar la imagen: `receipt_documents` solo admitía `application/pdf`. Se añadió la migración `ReceiptDocumentsPng1793318400028` y se registró en el plan («Cambios durante la implementación»).

## Prueba manual con la API local

Base PostgreSQL de demostración, Mayorista de prueba creado con `bootstrap:wholesaler`, API en `http://127.0.0.1:3100` y el mismo flujo por HTTP:

- `GET /api/v1/receipts/buyer-statements/{id}` → total `40000`, documento `EC-20261030-9BCFA5`.
- `.pdf` → `application/pdf`, `attachment; filename="EC-20261030-9BCFA5.pdf"`.
- `.png` → `image/png`, `attachment; filename="EC-20261030-9BCFA5.png"`.
- Imagen revisada a ojo: legible a 1080 px, cuota vencida en rojo, aviso de documento interno y sin límite de crédito.

## No verificado

- Envío por WhatsApp o correo desde Android (T943–T944).
- Diseño en Figma (CL-EC07).

## Tiempo de respuesta con 50 ventas abiertas (T934)

Un comprador con 50 ventas a crédito, cada una con una cuota vencida y otra por vencer, en PostgreSQL 17 portable y por HTTP. El escenario falla si cualquiera de las dos respuestas tarda 3 segundos o más.

| Ejecución | Resumen (`GET …/buyer-statements/{id}`) | Primer PDF (`.pdf`, generado y conservado) |
| --- | --- | --- |
| 1 | 22 ms | 63 ms |
| 2 | 17 ms | 80 ms |
| 3 | 12 ms | 78 ms |

La imagen no se mide con 50 ventas: por diseño solo se genera hasta el límite de ventas de la imagen (`422 statement-image-too-long`). Medido en el equipo de desarrollo, no en el servidor de producción.

## Observación ajena a este cambio

Con `NODE_ENV=development`, TypeORM registra las consultas con sus parámetros; `bootstrap:wholesaler` imprime así el hash scrypt de la contraseña del Mayorista. No es la contraseña en claro, pero conviene no registrar parámetros de la tabla `users`. Queda como mejora pendiente.
