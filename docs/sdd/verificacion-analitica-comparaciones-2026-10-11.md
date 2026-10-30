# Verificación del tablero analítico — 11 de octubre de 2026

## Alcance y decisiones vigentes

Se mantiene la aprobación íntegra de `analytics-decision-proposal.md`, ratificada por el usuario en esta tarea. No se modifica CL-08, el acceso exclusivo del Mayorista ni la conservación mínima de cinco años. Este corte avanza T707/T708: comparaciones descriptivas y explicación trazable de exclusiones. No implementa T709/T710 ni acredita una estimación publicada.

## Implementación

El dominio del frontend compara precios únicamente entre semanas completas consecutivas de la misma variedad y tipo de operación. Ordena una copia de los puntos y conserva la respuesta original. Semanas parciales o vacíos muestran un motivo, sin ocultar los precios realmente observados ni calcular un porcentaje entre periodos no equivalentes. La aritmética porcentual continúa usando enteros BigInt.

Las exclusiones del historial predictivo y descriptivo muestran referencia de operación, variedad, semana y motivo. Se distinguen fecha inválida, cantidad totalmente compensada y cantidad/importe inválidos; un motivo nuevo del backend conserva una explicación neutral de validación central. No se imputan valores ni se amplían permisos.

El contrato descriptivo se reconcilió con el cambio de alcance ya aprobado: compras usan sacos activos y tarifas de liquidación, sin lotes ni valoración de existencias. La implementación SQL ya seguía esa regla; la corrección elimina una instrucción documental anterior contradictoria.

## Verificación local

- TypeScript y lint del frontend: aprobados mediante `npm run check`.
- Primera ejecución de Jest: 328 casos aprobados y dos fallos relacionados con el tiempo de arranque del recorrido del menú; el primer caso excedió cinco segundos y continuó afectando al siguiente. No se cambió el código del menú ni sus pruebas.
- Repetición completa `npm run test -- --runInBand --testTimeout=15000`: **330 casos en 49 suites aprobados**. Incluye cuatro pruebas de dominio nuevas y dos recorridos de pantalla para referencias de exclusión y discontinuidad semanal. El margen de tiempo se aplicó solo al comando, sin cambiar la configuración permanente.
- La restricción EPERM de resolución del directorio temporal de Jest se resolvió ejecutando las comprobaciones locales fuera del sandbox; no se alteró Jest ni dependencias.

## Verificación HTTP real

Se restauró la API compilada en el puerto local 3000 sobre la base aislada `mercado_ui_test_*` existente, con PostgreSQL local 55437. Se utilizó únicamente la cuenta ficticia Mayorista existente; no se crearon usuarios, reemplazos ni operaciones comerciales. La sesión de comprobación se revocó al finalizar.

`mercado-api/test/verify-analytics-readiness-http.mjs` recibió credenciales mediante variables del proceso y no las guardó en el archivo ni en la evidencia. Verificó:

- Disponibilidad con Mayorista: HTTP 200, 26 semanas completas, mínimo de cinco ventas por semana, ventana 2026-04-06–2026-10-04.
- Historial real de la base de prueba: cero semanas suficientes, `dataSufficient=false` y `predictionAvailable=false`.
- Evaluación y revisión del Mayorista: pendientes; historial no implica publicación.
- Acceso sin sesión: HTTP 401.
- Corte futuro: HTTP 422.
- UUID de variedad inválido: HTTP 400, validación del límite HTTP.

La primera ejecución esperaba erróneamente 422 para un UUID inválido; se corrigió la aserción a 400 y la repetición pasó. La evidencia sin secretos está en `tmp/analytics-readiness-http-2026-10-11.json` (marca UTC del 12 de octubre, correspondiente al 11 de octubre en Lima).

## Pendientes y límites

No se verificó el permiso de Encargado mediante una sesión HTTP en este corte, ni la pantalla en Android, tablet o contra un marco Figma completo. No se evaluó un modelo. T707/T708 continúan parciales; T709/T710 requieren algoritmo/rango reproducibles, evaluación temporal de ocho semanas, criterios MAE/cobertura, persistencia inmutable de cinco años y revisión explícita antes de publicar. La fidelidad visual completa del frontend sigue pendiente.
