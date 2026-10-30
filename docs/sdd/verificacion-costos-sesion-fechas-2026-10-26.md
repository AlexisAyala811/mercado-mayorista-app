# Costos: sesión, fechas e integración QA

## Requisito y cambio

Planes 004/005, HU09/HU13 y reglas de privacidad/validación. Flete y estiba monta su estado solo para el Mayorista y por token, retira el formulario anterior al cambiar sesión y descarta respuestas tardías. Una operación guardada en cola conserva su identidad cuando la pantalla se cierra; no inicia un envío después de ese cierre ni navega desde una respuesta de envío vieja. Las consultas manuales aplican solo el resultado más reciente.

Se valida fecha civil antes de registrar una estiba. La utilidad compartida rechaza año cero y se reutiliza en la revisión de liquidaciones; Auditoría también lo rechaza ahora antes de consultar el servidor. Se mantienen importes positivos y centavos exactos. Las opciones de venta muestran fecha de Lima. Creación de grupos protegida frente a doble pulsación; campos y selección bloqueados durante confirmación/envío. El campo Nuevo grupo respeta el ancho interior de la tarjeta y los grupos permiten salto de línea.

## Pruebas

- `tmp/cost-session-final-focused-20261026.log`: 61 pruebas en nueve suites aprobadas. Incluyen ausencia de consultas sin Mayorista, limpieza del borrador por sesión, lectura tardía, orden inverso de consultas, cierre entre guardado/envío, envío viejo sin navegación, doble alta, fechas inválidas y fecha de Lima. Lint focalizado aprobado.
- `tmp/cost-session-all-tests-20261026.log`: 566 pruebas en ochenta suites aprobadas, antes del ajuste final del efecto inicial de Mensajería. Después de ese ajuste, tipos/lint y seis pruebas de Mensajería aprobados (`tmp/cost-messaging-integration-check-20261026.log`).
- Comprobación completa posterior al ajuste final: 569 pruebas en 81 suites aprobadas (`tmp/cost-session-release-tests-20261026.log`), incluyendo pruebas compartidas nuevas del módulo 008. No equivale a recorridos Android.
- Backend integrado: `tmp/cost-messaging-backend-final-20261026.log`, 243 pruebas en 61 archivos, tipos, lint y compilación aprobados. Lint conserva advertencias registradas; no presentarlo como cero advertencias. Se corrigió el orden explícito de la migración 026 y se amplió la comprobación histórica de registro, conservando las 25 anteriores.

## Instalación y navegador

Exportación `web-export-cost-session-20261026`, 200 recursos PDF.js cotejados. Activación con respaldo, 281 archivos verificados y activos anteriores conservados (`tmp/cost-session-web-activation-20261026.json`). Incluye el módulo 008 que desarrolla la tarea documental/técnica compartida.

Costos en API QA real: fletes/grupos/estibas vacíos, dos compras y cuatro ventas confirmadas disponibles como referencia. Fecha `0000-01-01` muestra validación local, sin guardar operación. Actualizar retira el mensaje; no se registró estiba, grupo ni liquidación. A 360 × 800 el campo Nuevo grupo pasó de ancho 260 a 247,2 dentro del margen de la tarjeta; documento de ancho 360 y controles medidos de al menos 44. A 1440 × 1000 no hay desbordamiento. Captura `tmp/cost-session-phone-20261026.png`.

Auditoría con año cero muestra «Ingresa fechas válidas en formato AAAA-MM-DD» sin ofrecer reintento de consulta remota; sustituye la limitación local pendiente del corte anterior.

## Integración del nuevo módulo 008

El frontend exportado ya incluye Mensajería. Para evitar una ruta sin respaldo central se verificó su integración: solo migración 026 pendiente, transacción de migraciones, una inscripción de la migración y tabla disponible, sin modificar las huellas de las catorce tablas comerciales/PDF. `tmp/messaging-ui-qa-migration-20261026.json`. Contraseña DPAPI solo en variables del proceso y restaurada al salir. No se aplicó nada a producción.

Navegador: destinatarios e historial responden 200; aparecen tres proveedores y un comprador activos, se selecciona Comprador QA y la consulta de avisos del 26/10 responde 200 sin cuotas abiertas. Historial vacío y botón de compartir deshabilitado sin adjunto. A 360 no hay desbordamiento ni botones menores a 44. Capturas `tmp/messaging-readonly-phone-top-20261026.png` y `tmp/messaging-readonly-phone-20261026.png`. Sin archivos seleccionados, metadatos de intento creados ni envíos externos. Esta comprobación acredita lecturas e integración, no compartir en Android/WhatsApp/correo ni entrega.

## Gates abiertos

Liquidación positiva y registro real de estiba, rechazos concurrentes, Android/teclado normal/TalkBack y convergencia Figma. La nueva Mensajería mantiene los gates de su especificación 008. No cerrar T413/T414, T515 ni la meta completa por estas pruebas.
