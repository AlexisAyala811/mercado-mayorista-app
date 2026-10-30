# Auditoría: paginación, fechas y aislamiento

## Alcance

HU13 y CL-10; implementación conforme al plan 005. La consulta anterior se limitaba a cien eventos sin navegación y convertía los filtros de día a medianoche UTC. Se incorporan páginas de veinte, orden estable fecha/UUID descendente y fechas civiles de Lima. No cambia la retención ni los permisos aprobados.

La pantalla valida fechas reales y rangos, elimina resultados al editar criterios y ofrece reintento de la petición fallida. Descarta respuestas tardías al cambiar criterios o sesión. Solo monta el área de consulta para el Mayorista. La API conserva filtros anteriores por instante, añade `fromDay`/`toDay`, restringe por negocio y responde con `private, no-store`.

## Evidencia comprobada

- Frontend: 548 pruebas en 78 suites (`tmp/audit-frontend-check-20261026.log`). Lint detectó después una inicialización sincrónica en el efecto; corregida sin desactivar la regla. Las trece pruebas focalizadas volvieron a pasar (`tmp/audit-frontend-focused-20261026.log`); TypeScript y lint posteriores finalizaron con código cero.
- Backend: 235 pruebas en 60 archivos, tipos, lint y compilación aprobados (`tmp/audit-backend-check-retry-20261026.log`). Primer intento bloqueado por permisos de caché, conservado en el registro original. Compilación posterior de cabecera HTTP aprobada; tres advertencias previas de Reportes permanecen.
- PostgreSQL: transacción de solo lectura, 44 eventos sintéticos admitidos en páginas 20/20/4, orden estable entre fechas iguales, exclusión de otro negocio, inclusión del inicio y último microsegundo del día y exclusión del siguiente día (`tmp/audit-days-readonly-20261026.json`). Se ejecutan los predicados del servicio de producción sobre una CTE tipada; esta prueba no sustituye HTTP con el repositorio real.
- Patrón de limpieza de efectos contrastado mediante Context7 con la documentación oficial de React: <https://react.dev/learn/synchronizing-with-effects>.
- Exportación `web-export-audit-query-20261026` y 200 recursos PDF.js verificados. Activación con respaldo, 280 archivos cotejados y activos previos conservados (`tmp/audit-query-web-activation-20261026.json`).

## Navegador con API/TypeORM y datos QA reales

Acceso correcto desde el menú del Mayorista y recarga de la compilación instalada. Consulta de 266 eventos; navegación comprobada consecutivamente en 1–20, 21–40, 41–60, 61–80, 81–100 y 101–120. Así se verifica acceso posterior al anterior límite de cien contra el repositorio real.

Fecha imposible `2026-02-30`: mensaje de validación y resultados anteriores retirados. Periodo `2099-01-01` a `2099-01-02`: cero eventos y ambas acciones de página deshabilitadas. Día local `2026-10-26`: un evento de sesión a las 11:17:47, retención visible hasta 26/10/2031. Limpiar filtros recupera 1–20 de 266.

Tamaños observados: 360 × 800 y 1440 × 1000. En teléfono, ancho de documento 360, los cuatro campos dentro del ancho disponible y ningún botón con dimensiones menores a 44. En escritorio los cuatro campos aparecen alineados en una fila y no hay desplazamiento horizontal. Capturas: `tmp/audit-phone-top-20261026.png`, `tmp/audit-phone-20261026.png` y `tmp/audit-wide-20261026.png`. Vista temporal restaurada después de la revisión. Sin nuevas operaciones comerciales; únicamente acceso y lecturas.

La revisión automática rechazó un script HTTP que iba a guardar credenciales QA en texto plano; no se creó. Las consultas autenticadas se verificaron desde la sesión del navegador. No se acredita inspección directa de cabeceras HTTP autenticadas ni rechazo central de fechas inválidas mediante ese script.

## Verificación pendiente

Revisión adicional de límites: año cero rechazado explícitamente en ambos extremos del DTO, ocho pruebas focalizadas, tipos/lint y compilación aprobados (`tmp/audit-year-zero-api-20261026.log`, `tmp/audit-year-zero-final-20261026.log`). Navegador con `0000-01-01` recibió HTTP 400, confirmado por el log de la API QA, sin error PostgreSQL. Se sustituyeron mensajes genéricos por instrucciones en español; tras activar la API, el navegador muestra «La fecha inicial debe existir. Usa AAAA-MM-DD con año entre 0001 y 9999 para la fecha inicial». Limpiar filtros vuelve a 1–20 de 266. La validación local compartida de fecha aún admite año cero: el servidor lo rechaza, pero debe alinearse en un próximo corte de frontend para evitar una solicitud innecesaria y ofrecer corrección local.

Accesibilidad con lector y validación nativa Android; aislamiento integral entre negocios y recorrido real de intentos denegados. No cerrar T513/T515 ni la meta completa por este corte.
