# Mensajería: ciclo del adjunto y separación de sesión

**Actualización posterior:** entorno recuperado, suite completa repetida y selección/descarga real comprobadas. `verificacion-descarga-adjunto-web-2026-10-26.md` sustituye los bloqueos operativos inferiores como estado actual. Se conserva el detalle histórico de sus fallos y no se acredita envío externo.

## Implementación conforme al plan 008

Mensajería monta el área de trabajo exclusivamente para el Mayorista y separada por token, también dentro del componente. Una selección de archivo que llega después de salir se libera y no prepara ni comparte nada. Una respuesta de una sesión anterior no altera la pantalla nueva ni la invalida por su rechazo de credenciales: la API conserva su notificación central ligada al token rechazado.

La limpieza nativa se restringe a archivos individuales de `DocumentPicker` bajo `Paths.cache`. Rechaza URI de proveedor, documentos originales, otras áreas de la caché, rutas de escape, directorios y recursos remotos. No borra una copia ya entregada al selector mientras otra aplicación pueda leerla. Cancelar la selección de reemplazo conserva el adjunto anterior. Reintentar un resultado central pendiente conserva el UUID y no abre otra vez el selector externo.

Fuentes verificadas: documentación SDK 57 de [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/) y [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), Context7 y código nativo de `expo-document-picker` instalado (copias en `DocumentPicker` tanto en Android como iOS). Estas referencias explican las APIs; no sustituyen una ejecución nativa.

## Evidencia disponible

- `tmp/messaging-lifecycle-tests-20261026.log`: 24 pruebas en tres suites aprobadas. Cubren dominio, limpieza, ausencia de acceso sin Mayorista, sesión anterior, selección tardía, cancelación de reemplazo y reintento de metadatos sin repetir compartición. Tipos y lint posteriores terminaron con código cero.
- Exportación `web-export-messaging-lifecycle-20261026` y cotejo de 200 recursos PDF.js. Activación con respaldo y 281 archivos verificados, conservando activos anteriores (`tmp/messaging-lifecycle-web-activation-20261026.json`).
- Preparado `tmp/mercado-qa-adjunto-20261026.png`, copia íntegra del icono público del proyecto, 799005 bytes. No se seleccionó ni se envió: la sesión QA dejó de estar disponible antes de abrir el selector.

## Fallos de entorno y límites

La suite completa `tmp/messaging-lifecycle-full-check-20261026.log` terminó con 81 suites que no pudieron inicializarse y cero pruebas ejecutadas por escritura de caché bloqueada. Esto no es una suite aprobada ni prueba de 81 regresiones del producto. La repetición con la caché existente del workspace también falló al persistir el mapa de archivos. Un intento anterior de redirigir el registro al workspace fue rechazado por permisos antes de ejecutar la suite.

La inspección adicional de procesos solicitada fuera del entorno restringido no se ejecutó: la revisión automática falló por límite de uso, sin determinar que la acción fuera insegura. No se eludió mediante otra herramienta ni se reiniciaron servicios por una vía alternativa. Tras renovar el contexto, el navegador conserva LOGIN y muestra fallo de conexión con la API al intentar el acceso QA. No se acredita API disponible, nueva sesión, selección real de adjunto ni resultado positivo de compartición para este paquete.

Quedan pendientes recuperar servicios por la vía autorizada, repetir la suite completa, comprobar el selector real con el archivo de prueba y reconstruir/verificar Android por DocumentPicker. No cerrar la especificación 008 ni la meta global. La devolución comercial reservada al usuario no se reenvió.
