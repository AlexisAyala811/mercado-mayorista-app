# Adjuntos: recorrido nativo Android

## Compilación y entorno

Cliente de desarrollo recompilado con DocumentPicker: `BUILD SUCCESSFUL`, 495 tareas, APK x86_64 de 102886819 bytes. SHA-256 `ED5373FED3B3B1F16A2955B553D406FEAE8C79C87463F64B6D01803CF065D7FC`. El módulo aparece en el DEX real; instalación oficial por reemplazo sobre `com.mercado.gestion`, sin desinstalar ni borrar datos. Evidencias: `tmp/android-documentpicker-apk-20261026.json`, `tmp/android-documentpicker-install-20261026.json` y `tmp/android-document-picker-build-20261026.log`.

El registro antiguo del driver se conserva. Tras comprobar su proceso ausente y ausencia de clientes/propietarios activos, se usó una instalación aislada oficial de agent-device 0.21.32 y una sesión nueva con sus controles normales de propiedad. Arranque del AVD existente `Mercado_Tablet_API36`, 1280 × 800, teclado real conservado mediante `--no-test-ime`. No se modificaron dependencias del producto para recuperar el driver.

Metro local y API QA permiten acceso nativo autenticado. Las credenciales se introdujeron por entrada privada y con variables de grabación. No se incluyen contraseñas en artefactos de evidencia.

## Recorrido observado

1. Acceso real, menú y entrada a Mensajería del Mayorista.
2. Apertura del selector DocumentPicker del sistema y cancelación: regreso al formulario sin archivo ni intento central.
3. Copia pública del icono del proyecto colocada en Download mediante transferencia de archivo, con SHA-256 cotejado. No se seleccionó ningún documento privado. El nombre es `mercado-native-qa-20261026.png`, 799005 bytes.
4. Selección mediante el selector del sistema: el formulario muestra el nombre y 0.76 MiB. Una consulta PostgreSQL de solo lectura confirma cero intentos antes de preparar la compartición.
5. Elección de Comprador QA y canal previsto WhatsApp. El aviso exige confirmar el contacto en la aplicación externa.
6. Apertura real del selector Android (`com.android.intentresolver`), con vista previa de imagen. Cancelado mediante Atrás sin elegir aplicación ni destinatario y sin enviar el archivo. Este emulador ofrece Bluetooth, Messaging e impresión; no acredita WhatsApp/correo instalados.
7. Regreso e historial: un solo intento en estado `sharing_requested`. Significa que se solicitó el selector; no significa enviado, entregado o leído. La API de compartición nativa no permite distinguir el cierre del selector de una entrega, y la interfaz no afirma entrega.

Evidencias de UI: `tmp/android-documentpicker-native-picker-20261026.png`, `tmp/android-documentpicker-attachment-accepted-20261026.json`, `tmp/android-documentpicker-pre-share-20261026.png`, `tmp/android-documentpicker-external-selector-20261026.json`, `tmp/android-documentpicker-sharesheet-visible-20261026.png` y `tmp/android-documentpicker-history-lower-20261026.json`.

Verificador de solo lectura: `mercado-api/test/messaging-native-attachment-qa.mjs`. Resultado antes/después `tmp/messaging-native-attachment-qa-20261026.json`: exactamente un intento, solo columnas de metadatos, catorce tablas comerciales/PDF con huellas idénticas. No se confirmó ninguna operación financiera ni la devolución reservada al usuario.

Las pulsaciones instantáneas del driver no activaban algunas tarjetas de DocumentsUI. Una pulsación de 100 ms mediante el SDK oficial permitió navegar y seleccionar. No se cambió el código del producto ni se usaron comandos ADB de interfaz para resolverlo.

## Corrección detectada y límites

El historial mostraba el instante UTC sin formato. Se corrigió a fecha/hora de Lima explícita; una prueba cubre el cambio de día después de medianoche UTC. 31 pruebas de Mensajería, tipos y lint aprobados. La última suite completa anterior conserva 590 pruebas/82 suites; no se presenta como una nueva suite completa posterior. Exportación web instalada con respaldo y 281 archivos cotejados: `tmp/messaging-native-date-web-activation-20261026.json`; recursos PDF.js verificados.

La selección PNG y apertura/cancelación del selector están acreditadas. No se acredita envío externo, WhatsApp/correo reales, todos los formatos admitidos, TalkBack, teléfono ni el cierre de todos los módulos. El proyecto sigue en convergencia; este recorrido sustituye el bloqueo previo del driver como estado actual.

## Comprobación final de la corrección

La recarga HTTP del SDK agotó 30 segundos; no se repitió la compartición. Se identificó y reinició únicamente el Metro QA propio, conservando API y datos, y se recargó desde el control visible del cliente Android. Bundle actual de 1708 módulos, acceso conservado y reentrada a Mensajería correctos. El historial muestra `26/10/2026, 19:16 (Lima)` para el instante `2026-10-27T00:16:40.371Z`. Captura inspeccionada: `tmp/android-documentpicker-final-lima-history-20261026.png`; árbol `tmp/android-documentpicker-lima-attempt-visible-20261026.json`.

La sesión propia del SDK se cerró sin apagar el emulador. Archivo de grabación publicado `tmp/android-documentpicker-qa-20261026.ad`, 80 líneas, variables de usuario/contraseña y sin contraseña literal. Comprobación `tmp/android-documentpicker-recording-check-20261026.json`. No se ejecutó replay: repetirlo podría crear otro intento de compartición y no es necesario para acreditar el recorrido observado.

La activación web conserva los recursos anteriores y tiene respaldo completo. Tras corregir dos invocaciones erróneas del verificador PDF.js (argumento y ruta relativa), la invocación correcta verificó 200 recursos por raíz con SHA-256 coincidente. El bundle exportado contiene el formato de Lima corregido. Esas invocaciones fallidas no se presentan como verificaciones aprobadas.
