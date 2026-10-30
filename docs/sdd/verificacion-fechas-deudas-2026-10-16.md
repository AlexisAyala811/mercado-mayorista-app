# Fechas del listado de Deudas — verificación parcial

Implementado conforme a `specs/004-accounts-cash-freight-and-stowage/account-overview-dates-plan.md`: próxima cuota abierta con saldo, último cambio confirmado de saldo/estado posterior al origen y presentación civil/Lima. Las filas crecen para conservar la legibilidad. La ausencia confirmada se distingue de una API anterior que todavía no entrega los campos.

La proyección comprueba la versión de la cuenta y devuelve conflicto ante lectura inconsistente. No incorpora comandos financieros ni migraciones.

## Evidencia inspeccionada

- Frontend: tipos, lint y 508 pruebas en 70 suites aprobados (`tmp/account-dates-app-check-20261016.log`).
- Backend: tipos, lint, 211 pruebas en 56 archivos y compilación aprobados (`tmp/account-dates-api-check-outside-20261016.log`). El intento previo dentro del sandbox falló por permisos de caché; no se contabiliza como aprobación.
- PostgreSQL, 2026-10-16T22:14:36Z: SELECT de producción con fixtures CTE y transacción de solo lectura. Verifica primera cuota abierta positiva, ausencia de vencimiento para cuenta cerrada, aislamiento de contraparte, ausencia de cambio posterior para versión cero y conflicto 409 para versión desfasada. Cero escrituras comerciales. `tmp/account-dates-readonly-pg-20261016.json`.

## Pendiente

El reinicio de la API de QA no se ejecutó: la revisión automática informó límite de uso y no pudo evaluar la acción. No fue una determinación de inseguridad. No se detuvo el proceso anterior ni se inició otro. La compilación en disco no prueba que la API en ejecución sirva estos campos.

Faltan activación de esa API y recorrido nativo de fechas. No se cierra convergencia visual completa, dispositivos, accesibilidad ni la meta global.

## Paquete web actualizado

Exportación concluida con código 0: `tmp/web-export-account-dates-20261016.log`. Recursos PDF.js 6.4.299 verificados, 200 archivos por raíz. Activación local a las 2026-10-17T01:12:04Z (16 de octubre, Lima): 270 archivos cotejados por hash, activos anteriores conservados y respaldo `tmp/web-before-account-dates-20261016`. Evidencia `tmp/account-dates-web-activation-20261016.json`. Sustituye el paquete anterior en `mercado-app/dist`, sin navegación de navegador ni reinicio de API. Ante la proyección antigua la interfaz informa fecha no disponible; no inventa fechas.

## Recuperación posterior y HTTP real

A las 2026-10-17T01:14:36Z (16 de octubre, Lima) quedó superado el impedimento operativo de activación. La consulta autorizada fuera del sandbox confirmó ausencia de los procesos previos y de sus puertos; se recuperaron PostgreSQL y API con el iniciador del QA existente, sin detener procesos ajenos. PostgreSQL informó recuperación y disponibilidad; API Node 7436 confirmó arranque en `tmp/account-dates-recovered-api-20261016.log`.

`mercado-api/test/verify-account-dates-live-http.mjs` pasó contra la API real: salud 200, cuentas sin sesión 401, sesión QA, listado/detalle 200 y proyecciones coherentes. Cuenta existente `a2739d1a-dc81-43bf-8023-9ca55cb64bbb`, anulada, versión 1: `nextDueOn=null`, `lastMovementAt=2026-10-12T00:58:22.290Z`, igual a updatedAt. La sesión de prueba fue cerrada (204); no se ejecutaron mutaciones comerciales. Evidencia guardada sin sobrescribir: `tmp/account-dates-live-http-20261016.json`.

La vista previa local volvió a informar disponibilidad en localhost8087. No se navegó el navegador ni se acreditó el render nativo de estas fechas. Ese recorrido y los demás gates globales siguen abiertos; el bloqueo anterior no describe el estado actual de la API.

## Verificación Android posterior

Emulador Mercado_Tablet_API36, 1280×800, con API real y bundle actual de Metro. Arranque confirmado por SDK, apertura grabada y login QA correcto. La captura normal `tmp/android-account-dates-normal-20261016.png` y su árbol JSON muestran «Sin vencimiento pendiente · Último cambio de saldo/estado: 11/10/2026, 19:58», consistente con la fecha UTC de la API y la hora de Lima. Fecha completa, sin solaparse con saldo ni botón de detalle.

Texto ampliado a 2.0, entrada desde menú y captura `tmp/android-account-dates-200-20261016.png` con árbol JSON: información de cuenta en bloque superior, saldo en bloque independiente y detalle visible. La fecha ocupa x33/y521, ancho1214/alto34; el bloque de saldo comienza después. Capturas inspeccionadas visualmente. No se ejecutaron operaciones de origen ni pagos.

Escala registrada/restaurada y releída 1.0 (`android-account-dates-scale-baseline-20261016.json`, `android-account-dates-scale-200-20261016.json`, `android-account-dates-scale-readback-20261016.json`). Grabación `tmp/android-account-dates-review-20261016.ad`, 18 acciones, publicada sin replay; sesión SDK propia cerrada tras comprobar menú. El log de esta API muestra solo dos POST de sesión y un DELETE de sesión como métodos de escritura durante las comprobaciones HTTP/nativa, sin comandos comerciales.

SHA256: captura normal `32613F72E41DA81403E49B80D79F3827F238757EA18B489EFE291D3753EAF032`; captura 200 % `E3FBE65D39734827F6038FC43390834069AF2F1B1BE8A47DD081AF0A28DFE44F`; grabación `452DC8AA9756C9D8C26792149CEE2660DCDFBE877E17A661473F06F16335C546`.

Este recorrido acredita fechas reales y adaptación en la tablet indicada; no teléfono, TalkBack, teclado de software, cuenta con vencimiento abierto real ni fidelidad de todos los marcos. La cuota abierta se verifica en PostgreSQL con fixtures, no mediante esta cuenta anulada. La meta global sigue abierta.
