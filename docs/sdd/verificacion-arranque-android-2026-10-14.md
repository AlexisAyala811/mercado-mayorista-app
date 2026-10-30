# Arranque del frontend vigente en Android — 14 de octubre de 2026

## Entorno recuperado

Revalidación inicial: sin procesos agent-device/emulator/qemu activos y sin dispositivos Android conectados. Se mantuvieron intactos los estados anteriores. La copia revisada de agent-device 0.21.22 se inició en `tmp/agent-device-state-android-20261014`, heredando ANDROID_HOME y los directorios platform-tools/emulator en PATH solo para ese proceso. No se instalaron paquetes ni se modificó la configuración global.

El descubrimiento automático informó `Failed to start daemon`, pero el daemon sí quedó activo: PID 2224, HTTP loopback 49693, proceso de esta copia y listener del mismo PID comprobados mediante CIM/TCP. Se registró identidad no secreta en `tmp/agent-device-identity-20261014.json`; el token permaneció en el estado del SDK y en memoria, sin imprimirlo. Conexión HTTP explícita autenticada: `devices.list` identificó el AVD y `devices.boot` concluyó con **booted:true**, `emulator-5554`.

Metro propio PID 19444, listener 127.0.0.1:8081, se inició con API QA `http://10.0.2.2:3000/api/v1`. Logs `tmp/metro-android-20261014.log` y `.err.log`. No se aceptó la actualización de dependencias sugerida por Expo.

## Aplicación observada

La apertura inicial mostró el cliente de desarrollo y un diálogo «Mercado isn't responding». Captura `tmp/android-open-20261014.png`. La primera pulsación de Wait no se ejecutó: el SDK rechazó el formato de referencia sin prefijo @. Tras corregirlo y obtener un snapshot nuevo, el botón ya había desaparecido. No se afirma que la pulsación recuperó la aplicación, ni se operó la UI por ADB o un motor alternativo.

Snapshot sano posterior: launcher de desarrollo, campo de URL y Connect. Se introdujo `http://10.0.2.2:8081` y pulsó el Connect habilitado, con referencias frescas y generación de snapshot. Metro completó **Android Bundled, 1662 módulos, 17990 ms**. La captura inmediatamente posterior `tmp/android-connected-20261014.png` aún estaba vacía: no se consideró prueba de carga completa. El snapshot siguiente y `tmp/android-login-current-20261014.png` sí muestran el frontend vigente, a **1280 × 800**, con identidad, formulario y «Tu sesión venció. Ingresa nuevamente para continuar».

Campos Usuario y Contraseña accesibles como EditText; contraseña `password:true`; dimensiones 432 × 56 px, al igual que la acción Iniciar sesión, deshabilitada con campos vacíos. Se introdujo el texto no secreto `qa_sin_enviar` únicamente en Usuario y después se limpió, sin enviar el formulario. `tmp/android-login-keyboard-20261014.png` muestra ese texto y la acción todavía deshabilitada. A pesar del nombre del archivo, la captura no muestra teclas virtuales y no acredita adaptación al teclado. El SDK posteriormente informó keyboard.visible:true/type:unknown; la discrepancia impide cerrar esa validación visual.

## Límite del acceso automatizado

Antes de usar las credenciales QA existentes se consultó ADR 0017 de agent-device: fill con recordAs parametriza los valores en respuestas, grabaciones y diagnósticos. El SDK rechazó el primer campo por no existir grabación armada; no se llegó a introducir contraseña. Preparar saveScript mediante la conexión HTTP explícita fue rechazado porque el SDK la considera remota. No se suprimió ese control. Se intentó la conexión local oficial por stateDir, con el daemon propio previamente verificado, pero su descubrimiento volvió a fallar y el proceso adicional terminó con `Daemon registration busy; exiting`. No se forzó registro ni identidad. Se recuperó una sesión de observación explícita, sin grabación ni credenciales, para conservar evidencia.

El arranque nativo ya no está bloqueado por ADB ausente o por el ANR inicial. Sigue pendiente resolver la conexión local/grabación segura del SDK o ejecutar el acceso manual por una superficie habilitada. No se considera verificado un inicio de sesión nuevo, los permisos por rol, pesaje/liquidación, logística, cola offline ni los demás módulos. La evidencia del rechazo de sesión conservada tampoco es un ensayo controlado de vencimiento/reemplazo completo.

## Alcance del código

Se cargó el árbol actual por Metro después del corte de 452 pruebas / 66 suites y sus comprobaciones de tipos/lint. Esto incluye la protección nueva de etapas de Compra y referencias analíticas, pero solo se observó la pantalla de acceso. No se compiló ni instaló un APK nuevo; el cliente de desarrollo existente ejecutó JavaScript actual. No se ejecutaron operaciones comerciales ni se reintentó la devolución bloqueada en web. Figma, lector de pantalla, teléfono y recorridos nativos completos siguen abiertos.

Referencias técnicas consultadas mediante Context7: [API oficial de agent-device](https://github.com/callstack/agent-device/blob/main/website/docs/docs/client-api.md) y [entradas parametrizadas ADR 0017](https://github.com/callstack/agent-device/blob/main/docs/adr/0017-parameterized-recorded-inputs.md). Se contrastaron opciones con los tipos y ayuda de la versión instalada.
