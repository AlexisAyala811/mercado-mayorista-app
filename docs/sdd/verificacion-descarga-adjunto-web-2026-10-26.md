# Mensajería: selección real y descarga explícita

## Recuperación y alcance

Sustituye el bloqueo de entorno descrito en `verificacion-ciclo-adjuntos-2026-10-26.md`. Pasado el plazo de la restricción temporal, la revisión de ejecución volvió a estar disponible. Se comprobó ausencia de servicios, se inició el mismo PostgreSQL/API/web QA sin recrear la base y el nuevo acceso respondió 201/200. No se reenviaron operaciones financieras.

La suite completa posterior al ciclo del adjunto pasó 584 pruebas en 81 suites, tipos y lint (`tmp/messaging-lifecycle-full-check-recovered-20261026.log`). La corrección posterior descrita abajo pasó 590 pruebas en 82 suites, tipos y lint (`tmp/messaging-web-copy-full-check-20261026.log`). Los intentos anteriores con cero pruebas ejecutadas se conservan como fallos del entorno, no como regresiones del producto ni como pruebas aprobadas.

## Recorrido real y defecto encontrado

El selector del navegador cargó `mercado-qa-adjunto-20261026.png`, copia del icono público del proyecto, 799005 bytes y 0,76 MiB visibles. Se eligió Comprador QA y canal previsto WhatsApp. El servidor conservó la preparación; el navegador anunció capacidad para compartir, pero rechazó abrir el selector con `Permission denied`. La aplicación registró el intento fallido, sin confirmar entrega.

Ese resultado reveló dos necesidades de interfaz: traducir el rechazo a una instrucción comprensible y ofrecer una descarga explícita aun cuando la comprobación previa de capacidad sea positiva. Se incorporó «Descargar copia» en web. No vuelve a abrir el selector externo ni crea/transiciona intentos. La cancelación sigue siendo cancelación y no inicia descarga automáticamente. Esta decisión concreta el fallback web del plan 008; no habilita envío automático ni elude permisos para compartir.

## Verificación de la corrección

- Paquete `web-export-messaging-web-copy-20261026`, 200 recursos PDF.js cotejados, respaldo y 281 archivos verificados (`tmp/messaging-web-copy-web-activation-20261026.json`).
- Tras recargar, el historial conserva el intento fallido. Se seleccionó nuevamente la imagen pública y se pulsó «Descargar copia», sin volver a solicitar compartición.
- El navegador produjo `C:/Users/ASUS/Downloads/mercado-qa-adjunto-20261026.png`. Tamaño 799005 bytes y SHA-256 `7A667804BB80A6A424A5DAF18A2599C4F32237CF06FE78FC0DE45DBB09E0ECCF`, idéntico al archivo seleccionado. Evidencia `tmp/messaging-web-copy-download-20261026.json`.
- El mensaje visible informa que la descarga no confirma compartición ni cambia el estado. Capturas `tmp/messaging-web-copy-confirmed-20261026.png` y `tmp/messaging-web-copy-result-20261026.png`.
- PostgreSQL en transacción de solo lectura confirma exactamente un intento para la prueba, todavía fallido y con el mismo UUID/metadatos. Las huellas de las catorce tablas comerciales/PDF son idénticas a la base previa. La tabla central tiene únicamente las columnas de metadatos previstas; no almacena URI ni binarios. Evidencia antes/después `tmp/messaging-public-attachment-qa-20261026.json`; verificador `mercado-api/test/messaging-public-attachment-qa.mjs`.

No se eligió una aplicación receptora ni se envió el archivo a WhatsApp o correo. El icono original del proyecto se conserva íntegro. El registro fallido se mantiene como historial; no se borró ni se convirtió en una entrega ficticia.

## Límites pendientes

Actualización posterior: cliente Android reconstruido y recorrido PNG público hasta apertura/cancelación del selector nativo comprobados en `verificacion-adjunto-android-2026-10-26.md`. La reconstrucción y el selector nativo ya no están pendientes; se mantienen los límites de aplicaciones receptoras reales, formatos restantes y accesibilidad descritos allí.

La descarga web está comprobada. La compartición mediante selector nativo y aplicaciones receptoras en Android requiere reconstruir el cliente de desarrollo con DocumentPicker y observar el recorrido correspondiente. También siguen abiertos Word/PDF y demás formatos en dispositivo, teclado/TalkBack, Figma y los gates restantes de 008 y del proyecto. No cerrar la meta global por esta descarga.
