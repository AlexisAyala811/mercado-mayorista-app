# Tareas 009: estado de cuenta del comprador

**Estado:** listas para implementación secuencial · **Fecha:** 30 de octubre de 2026
**Especificación:** [spec.md](spec.md) · **Plan:** [plan.md](plan.md)

Cada tarea se marca `[x]` solo con evidencia enlazable (pruebas, ejecución de CI o archivo de verificación en `docs/sdd/`). Lo no verificado queda abierto, aunque el código exista.

## Fase 0 · Preparación

- [ ] **T900** Incorporar `mercado-app` al monorepo en `app/` conservando su historial, con su `.gitignore` (sin `node_modules`, `dist`, `android` generado ni credenciales). *Verificación:* el árbol `app/` coincide con el proyecto original; `npm ci`, tipos, lint y pruebas de la app pasan desde `app/`.
- [ ] **T901** Crear `app-ci.yml`: en cada PR que toca `app/`, `npm ci`, tipos, lint y pruebas. *Verificación:* ejecución en verde en el PR.

## Fase 1 · Cálculo (backend, sin base de datos)

- [x] **T910** Función pura `buildBuyerStatement` (`backend/src/receipts/buyer-statement/buyer-statement.ts`) que recibe cuentas, abonos, reversos, devoluciones y cuotas, y devuelve el modelo del resumen JSON del plan. *Verificación:* pruebas unitarias del ejemplo de la spec (S/ 800,00 − 300,00 − 100,00 = S/ 400,00) y de comprador sin deuda (total 0 y lista vacía). **Evidencia:** `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` (10 pruebas; suite completa 274/274, tipos y lint sin errores, 30 de octubre de 2026).
- [x] **T911** Reglas de inclusión y cálculo: solo cuentas abiertas con saldo; abonos netos de reversos; devoluciones desde `account_credit_cents`; cuotas abiertas ordenadas por vencimiento. *Verificación:* pruebas de reverso, cuenta pagada excluida, cuenta anulada excluida y orden de cuotas. **Evidencia:** `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` (10 pruebas; suite completa 274/274, tipos y lint sin errores, 30 de octubre de 2026).
- [x] **T912** Fecha de corte y vencidas en `America/Lima`, incluido el borde de medianoche (corte 23:59 y 00:01). *Verificación:* pruebas con relojes fijos. **Evidencia:** `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` (10 pruebas; suite completa 274/274, tipos y lint sin errores, 30 de octubre de 2026).
- [x] **T913** Invariante `inicial − abonos − devoluciones = saldo`; si falla, error `statement-inconsistent`. *Verificación:* prueba con datos descuadrados. **Evidencia:** `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` (10 pruebas; suite completa 274/274, tipos y lint sin errores, 30 de octubre de 2026).
- [x] **T914** Número `EC-<AAAAMMDD>-<huella>` y `source_version` (`statement-v1:<fecha>:<sha256 de cuentas, versiones y saldos>`), y `imageAvailable` con límite de 10 ventas. *Verificación:* misma entrada → mismo número; un abono nuevo → número distinto; 10 ventas con imagen y 11 sin ella. **Evidencia:** `backend/src/receipts/buyer-statement/buyer-statement.spec.ts` (10 pruebas; suite completa 274/274, tipos y lint sin errores, 30 de octubre de 2026).

## Fase 2 · Documentos (backend)

- [x] **T920** Render PDF con PDFKit: encabezado, resumen, ventas con cuotas, marcas de vencida y aviso de documento interno. *Verificación:* prueba de extracción de texto con número, comprador, totales y aviso legal; sin límite de crédito. **Evidencia:** `buyer-statement.view.ts` y `buyer-statement.pdf.ts`; `buyer-statement.documents.spec.ts` verifica número, comprador, totales, cuotas vencidas, aviso legal y ausencia de límite de crédito sobre la vista que comparten PDF e imagen, y que el PDF es válido; muestra revisada con extracción de texto (30 de octubre de 2026).
- [x] **T921** Añadir `@resvg/resvg-js` y la fuente Noto Sans con su licencia OFL en `backend/assets/fonts/`; incluirla en la imagen Docker. *Verificación:* `npm audit` sin vulnerabilidades altas; la CI construye la imagen. **Evidencia:** `@resvg/resvg-js` 2.6.2 (incluye binario musl), Noto Sans Regular y Bold con `OFL.txt` en `backend/assets/fonts/`, copiadas en la etapa final del `Dockerfile`; `npm audit --audit-level=high` sin vulnerabilidades. La CI construyó la imagen Docker y el paso «Render de imagen dentro del contenedor» pasó (run 41119590109, commit 22fa228).
- [x] **T922** Render imagen: SVG de 1080 px de ancho con texto de al menos 28 px, convertido a PNG. *Verificación:* PNG válido de 1080 px de ancho; el alto crece con las ventas; prueba de humo del render dentro del contenedor Docker en la CI. **Evidencia:** SVG de 1080 px con texto de 28 a 40 px renderizado a PNG; pruebas de ancho, crecimiento del alto y escape de texto, y muestra revisada a ojo. Prueba de humo dentro del contenedor Alpine aprobada en la CI (run 41119590109, commit 22fa228).

## Fase 3 · API (backend)

- [x] **T930** `BuyerStatementService`: lectura en transacción `REPEATABLE READ` filtrada por negocio, construcción del estado y conservación con `getOrCreateDocument` (`buyer-statement` y `buyer-statement-image`). *Verificación:* pruebas unitarias con repositorios simulados; segunda generación sin cambios reutiliza el documento. **Evidencia:** `buyer-statement.service.ts`; `buyer-statement.api.spec.ts` (lectura REPEATABLE READ por negocio, 404, 409 statement-inconsistent, PDF y PNG conservados con su tipo y versión, 422 sin guardar nada). E2E de reutilización del documento. [verificación del backend del estado de cuenta](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md).
- [x] **T931** Controlador con las tres rutas, rol Mayorista, `Cache-Control: private, no-store`, `auditForeignAccess` sobre el comprador y `422 statement-image-too-long`. *Verificación:* pruebas de `403` para Encargado, `422` con 11 ventas y cabeceras. **Evidencia:** `buyer-statement.controller.ts` con rol Mayorista, auditForeignAccess sobre el comprador y cabeceras sin caché; pruebas de 403 auditado, cabeceras y resumen sin sourceVersion; descarga real desde la API local. [verificación del backend del estado de cuenta](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md).
- [x] **T932** E2E en PostgreSQL: venta a crédito + abono + devolución con los valores exactos de la spec; reutilización del documento el mismo día; comprador de otro negocio → `404` con evento `authorization.cross-business-denied`; Encargado → `403`. *Verificación:* suite e2e local y en la CI. **Evidencia:** `backend/test/buyer-statement.e2e-spec.ts`: 4 escenarios por HTTP sobre PostgreSQL 17, suite e2e 39/39; corrigió la restricción de tipo de archivo con la migración 028. [verificación del backend del estado de cuenta](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md).
- [x] **T933** Documentar el contrato en OpenAPI y en la documentación de componentes (Documentos) y del modelo de datos si cambia. *Verificación:* CI de documentación en verde. **Evidencia:** rutas documentadas en OpenAPI por los decoradores de Nest (`@ApiTags`, `@ApiProduces`); modelo de datos actualizado (tipos de documento y migración 028); cambios de implementación registrados en el plan. [verificación del backend del estado de cuenta](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md).
- [x] **T934** Medir la respuesta con 50 ventas abiertas (requisito de calidad: menos de 3 segundos, AC01). *Verificación:* e2e en PostgreSQL con aserción de tiempo. **Evidencia:** escenario «answers in under 3 seconds for a buyer with 50 open sales» de `backend/test/buyer-statement.e2e-spec.ts`; tres ejecuciones locales: resumen 12–22 ms, primer PDF 63–80 ms. [verificación del backend del estado de cuenta](../../docs/sdd/verificacion-estado-de-cuenta-backend-2026-10-30.md).

## Fase 4 · Android

- [ ] **T940** Servicio de API para el resumen, el PDF y la imagen, con tipos del resumen JSON y manejo de `404`, `422` y `409 statement-inconsistent`. *Verificación:* pruebas del servicio.
- [ ] **T941** Pantalla de vista previa: totales, ventas, cuotas, marca de vencida; estados de carga, error con reintento, sin deuda y sin conexión. *Verificación:* pruebas de componentes de cada estado.
- [ ] **T942** Accesos «Estado de cuenta» en el detalle del comprador y de la cuenta por cobrar, solo para el Mayorista. *Verificación:* pruebas de permisos por rol.
- [ ] **T943** «Enviar PDF» y «Enviar imagen» con el flujo de Mensajería (intento preparado → compartición solicitada, destinatario comprador); imagen deshabilitada con explicación si no está disponible. *Verificación:* pruebas del flujo y del registro del intento.
- [ ] **T944** Verificación en Android: tablet 1280 × 800 y teléfono, envío real a WhatsApp y correo, imagen legible sin ampliar, texto ampliado al 200 % y lector de pantalla. *Verificación:* archivo `docs/sdd/verificacion-estado-de-cuenta-android-<fecha>.md` con capturas.

## Fase 5 · Convergencia

- [ ] **T950** Diseño en Figma (CL-EC07) y comparación con la implementación; registrar diferencias.
- [ ] **T951** Completar la [lista de convergencia](../convergence-checklist.md) para 009 con evidencia; actualizar el estado de la spec, el índice de specs y las tareas de 006 y 008.

## Orden y dependencias

```text
T900 → T901 ─────────────────────────────┐
T910 → T911 → T912 → T913 → T914         │
   └→ T920, T921 → T922                  │
          └→ T930 → T931 → T932 → T933 → T934   │
                         └──────→ T940 → T941 → T942 → T943 → T944
                                                         └→ T950 → T951
```

El backend (fases 1 a 3) puede avanzar mientras se incorpora la app (fase 0). La fase 4 necesita la API (T931) y la app en el monorepo (T900).
