# Inicio de sesión y salida inicial de compra en Android — 12 de octubre de 2026

## Entorno observado

Emulador existente `Mercado_Tablet_API36`, Android API 36, 1280 × 800, serial `emulator-5554`. Se reutilizó el APK de desarrollo existente `com.mercado.gestion` y se cargó el frontend actual desde Metro nativo local 8081, con API local 3000 sobre la base aislada de pruebas existente. No se reconstruyó el APK ni se cambiaron dependencias.

Automatización mediante el SDK oficial Callstack agent-device instalado, versión 0.21.22. Se consultó su documentación actual mediante Context7. No existía emulador activo al comenzar; el SDK arrancó únicamente el AVD de Mercado sin ventana.

## Restauración del entorno

El primer daemon HTTP local llegó a escuchar, aunque el CLI informó un fallo de asociación de propietario en Windows. Se comprobaron PID, comando y puerto antes de usar la conexión remota soportada por el SDK. El inventario reveló que faltaba adb en su entorno. Se detuvo únicamente ese daemon propio y se creó un directorio de estado nuevo con las rutas verificadas del SDK Android instalado.

El segundo daemon quedó en PID 24080 y puerto 57824, vinculado solo a 127.0.0.1; la consulta SDK confirmó el AVD no arrancado y posteriormente su arranque. No se forzaron locks, borraron estados previos ni modificaron archivos del paquete. El error del CLI no se tomó como prueba de que el proceso había terminado; se verificó su estado real.

El enlace adb reverse se limitó al emulador propio y al puerto Metro 8081. Las interacciones de interfaz se realizaron mediante referencias observadas y generaciones frescas del SDK; adb se utilizó solo para ese enlace de red. Se conservaron enmascaramiento de contraseña, errores redactados y ausencia de grabación de scripts. La comprobación del único archivo NDJSON de la sesión no encontró la contraseña ficticia en texto plano; no se declara una auditoría exhaustiva de todos los archivos del runtime.

## Recorrido nativo real

1. El cliente de desarrollo se conectó desde su campo visible a Metro. El bundler cargó 1647 módulos de Android.
2. La aplicación detectó la sesión guardada vencida y mostró el login actualizado. Con la cuenta ficticia Mayorista existente, llegó al menú central.
3. Compras abrió el formulario inicial. Se escribió únicamente `QA salida nativa 20261012` en Conductor y se cerró el teclado.
4. El control Atrás del sistema Android mostró «¿Salir de los datos de compra?». Los botones Cancelar y Salir sin guardar tenían 52 px de alto.
5. Cancelar devolvió el formulario con el conductor idéntico, sin iniciar pesaje.
6. Atrás volvió a solicitar confirmación. Descartar regresó al menú. Abrir Compras de nuevo mostró el campo vacío con su placeholder original.
7. Se salió del formulario intacto y se cerró la sesión ficticia. La aplicación quedó en el login, con campos vacíos.

No se pulsó Continuar al pesaje, no se encoló una recepción ni se registraron efectos comerciales. El backend no recibió una creación por este recorrido. La verificación del día anterior en web acreditó recuperación al volver de un retroceso externo; en este corte Android sí mostró la confirmación antes de abandonar.

## Evidencia y límites

Capturas nativas: `tmp/android-purchase-exit-dialog-2026-10-12.png` y `tmp/android-login-current-2026-10-12.png`, inspeccionadas visualmente. Snapshots: `android-purchase-exit-dialog-2026-10-12.json`, `android-purchase-exit-cancel-2026-10-12.json`, `android-purchase-exit-home-2026-10-12.json`, `android-purchase-after-discard-2026-10-12.json` y `android-login-current-2026-10-12.json`.

No hubo cambios de código de producción en este corte: se verificó la implementación que ya tenía 371 pruebas, tipos y lint aprobados. Esta evidencia cubre login, sesión vencida, navegación inicial y salida/cancelación/descarte de compra en este AVD. No acredita TalkBack, teléfono físico u otros tamaños, pesaje/liquidación nuevos, ventas, cuentas, PDFs, analítica completa o igualdad visual de todas las pantallas con Figma. El objetivo general permanece abierto.
