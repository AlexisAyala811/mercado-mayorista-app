# Fuentes visuales incluidas en Android

## Hallazgo y decisión técnica

Al retomar Analítica en el cliente Android actual, la sesión vencida se rechaza correctamente, pero después de conectar al bundle vigente el acceso queda en «Preparando acceso». La pantalla espera `useFonts` antes de presentar el formulario. No se han introducido credenciales en esa pantalla bloqueada. Captura `tmp/android-analytics-current-loading-20261028.png`.

Se conserva el aspecto aprobado: mismos archivos Inter, Raleway, Bentham y Bevan y mismos doce nombres de familia ya usados por acceso, menú, compras, logística, cuentas y reportes. Se incluyen mediante el plugin oficial `expo-font` en la configuración Android para que estén disponibles desde el arranque, sin depender de una descarga asíncrona de Metro. No se sustituye la tipografía ni se elimina la espera a ciegas. El código web conserva su carga de fuentes actual.

Esto es convergencia técnica con los principios vigentes de disponibilidad, uso offline y fidelidad visual; no añade funcionalidad, actores ni reglas comerciales. Configuración fuente: `mercado-app/app.json`. Generar mediante el prebuild oficial, compilar e instalar por reemplazo; no editar fuentes Android generadas a mano ni borrar datos del dispositivo.

La invocación `prebuild --platform android --no-install` no incluyó `--clean`, pero la salida de esta versión informó «Clearing android» y regeneró el directorio nativo. Se registra el efecto real, no se afirma conservación de aquel directorio generado. `package.json` no cambió; la base QA y los datos instalados del emulador se conservan. Log `tmp/android-embedded-fonts-prebuild-20261028.log`. La compilación posterior debe producir un APK nuevo antes de instalarlo.

## Verificación requerida

1. Cotejar que todos los alias usados por la interfaz estén incluidos y apunten a los mismos archivos existentes.
2. Verificar recursos y registros generados por el plugin; compilar APK y cotejar que contenga las fuentes.
3. Instalar por reemplazo y comprobar acceso nativo, teclado y lectura de Analítica con el código actual. No declarar resuelto el hallazgo solo por cambiar app.json.
4. Ejecutar tipos/lint y pruebas aplicables; registrar resultados, límites y cualquier fallo previo. Mantener abierta la convergencia global.

## Fuentes consultadas

Documentación oficial SDK 57 de [expo-font](https://docs.expo.dev/versions/v57.0.0/sdk/font/), guía oficial de [fuentes](https://docs.expo.dev/develop/user-interface/fonts/) y código instalado del plugin y del cargador nativo. Context7 se resolvió primero a `/expo/expo` y se consultaron inclusión nativa, alias y disponibilidad inicial. El módulo reconoce las familias registradas por el plugin; la carga web sigue siendo asíncrona.
