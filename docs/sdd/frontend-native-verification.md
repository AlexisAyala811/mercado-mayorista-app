# Validación Android del frontend

## Corte vigente — 26 de octubre de 2026

`verificacion-adjunto-android-2026-10-26.md` acredita APK nuevo con DocumentPicker, reemplazo sin borrado de datos, acceso nativo autenticado y recorrido PNG público hasta apertura/cancelación del selector de compartir en tablet 1280 × 800. Un intento solicitado, sin entrega, catorce tablas comerciales/PDF intactas. Driver oficial 0.21.32 aislado y registro antiguo conservado. Los bloqueos descritos en cortes anteriores no son el estado actual. Siguen pendientes receptores WhatsApp/correo reales, demás formatos, teléfono, TalkBack y recorridos/gates globales.

## Corte vigente — 14 de octubre de 2026

`verificacion-arranque-android-2026-10-14.md` acredita AVD arrancado mediante SDK, Metro local con código actual y pantalla de acceso nativa 1280 × 800 con sesión conservada rechazada. El ANR inicial desapareció antes de conectar el bundle. Captura vigente `tmp/android-login-current-20261014.png`. No se compiló un APK nuevo ni se acreditan módulos autenticados: la conexión HTTP explícita impide armar la grabación parametrizada de credenciales y el descubrimiento local del SDK falla. Contraseña no introducida; texto no secreto de Usuario retirado. Teclado visual, TalkBack y recorridos completos continúan pendientes. Los cortes siguientes son históricos.

## Revalidación de entorno y código actual — 6 de octubre de 2026

El emulador anterior no estaba activo. Se inició el AVD existente `Mercado_Tablet_API36`, y ADB confirmó `emulator-5554`, arranque completo y APK `com.mercado.gestion` instalado. Metro 8088 cargó el código actual con API de pruebas `http://10.0.2.2:3000/api/v1`; generó el bundle Android de 1592 módulos. Un inicio en frío del enlace de desarrollo abrió MainActivity con resultado `Status: ok` y 6655 ms. La captura de la aplicación muestra LOGIN y el rechazo de la sesión guardada ya vencida. Evidencia: `tmp/android-current-code-2026-10-06.png` y su árbol `tmp/android-current-code-2026-10-06.xml`. Esto acredita arranque y bloqueo de sesión vencida; no acredita login nuevo, teclado ni recuperación offline del corte actual.

Se revisó el driver de pruebas Android recomendado por Callstack, `agent-device` 0.21.22, paquete oficial `callstack/agent-device`, integridad npm `sha512-ndUh5b+lZ2fRzzY80TTl/KmxR4bh+3FezSH0UGCjPCpN//1trSqtzzNUWunc4woY/vW3DEiPx5xYIwG+fBOXWA==`. La copia inicial falló al registrar su servicio con `EPERM: ftruncate`. Un archivo de prueba local reprodujo que abrir con `a` falla al truncar en Windows, mientras `r+` funciona. Se preparó una copia exclusivamente de pruebas en `tmp/agent-device-tool` y se cambió esa apertura del registro, conservando controles de propiedad. Hash del archivo corregido: `B6657BB3E6D459094CD988F14175C620015B373CB431C32C354DD9BA3568D1AA`.

La corrección superó el truncado, pero no dejó un servicio operativo: el registro conservaba PID 27704 y puerto 58975; la consulta explícita posterior confirmó proceso ausente y ningún listener. Se conservaron registro, lock y diagnóstico, sin borrado manual ni desactivación de sus comprobaciones. El problema del driver no se atribuye al frontend. La inspección de escritorio del emulador produjo capturas ajenas al objetivo al cambiar el foco, por lo que se interrumpieron las acciones por esa superficie y se tomó evidencia solo del dispositivo Android. No se registran esas capturas del escritorio como evidencia del proyecto.

Se solicitó inicio de sesión manual en la cuenta QA para continuar la verificación nativa. Los recorridos de recuperación y teclado siguen pendientes hasta observarlos en la aplicación. Las pruebas unitarias y web anteriores no se usan para cerrar esa brecha.

La inspección del árbol Android verificó etiquetas `Usuario` y `Contraseña`, tipo EditText y enmascaramiento `password=true` en la contraseña. Ambos campos miden 430 × 52 px en este dispositivo de 160 dpi; la acción Iniciar sesión también mide 430 × 52 px y permanece deshabilitada con ambos campos vacíos. No se declara validación de lector de pantalla ni de teclado por estas observaciones.

El paquete Android actualizado se exportó con éxito: `tmp/android-export-2026-10-06/_expo/static/js/android/entry-97ac56e859c4cc16889b5ad64d12687a.hbc`, 3,288,164 bytes, SHA-256 `E592EE02FF752BA90102F0925E66D9EDCD658102B963628F840501E0F468779F`. La exportación web produjo 19 rutas y `entry-f77dc5613f969f793b39005fdb8415f4.js`, 1,396,590 bytes. Son artefactos de pruebas contra API local; no representan publicación ni APK de producción.

## Preparación — 5 de octubre de 2026

La configuración Expo identifica la aplicación como `com.mercado.gestion`. `expo prebuild --platform android --no-install` generó el proyecto Android desde los plugins configurados, incluidos SecureStore, Sharing, Blob Util y PDF. Los directorios nativos permanecen generados e ignorados; las reglas de negocio no cambiaron.

El SDK instalado usa `C:/Users/ASUS/AppData/Local/Android/Sdk`. La comprobación del emulador confirmó WHPX disponible. Gradle instaló NDK 27.1.12297006, plataforma Android 36, Build Tools 35 y CMake 3.22.1 usando licencias ya aceptadas en el equipo.

El primer `assembleDebug`, ejecutado con el JBR Java 25 de Android Studio, terminó con error en `configureCMakeDebug` de Screens y Worklets. La excepción de `GeneratePrefabPackagesKt.reportErrors` trató como error una advertencia sobre acceso nativo restringido de Java. El diagnóstico está en `tmp/android-cmake-diagnostic.log`; no acredita un APK terminado.

Se descargó Temurin Java 21 LTS desde la API oficial de Adoptium, verificando el SHA-256 publicado, y se extrajo dentro de `tmp/jdk21`. La recompilación usa ese `JAVA_HOME` únicamente en su proceso y limita el APK de prueba a `x86_64`. La nueva ejecución superó la configuración CMake y comenzó a compilar las bibliotecas nativas. El resultado final debe incorporarse cuando termine.

Las herramientas oficiales Android `15859902` se descargaron desde la página oficial y se verificaron con SHA-256 `90ae805d20434428bffcb699c290860f19bb5f66a67e6b330067e3de801fb04a`. La imagen `system-images;android-36;default;x86_64` se instaló sin aceptar licencias nuevas automáticamente. El AVD aislado `Mercado_Tablet_API36` está en `tmp/android-avd`. El emulador aparece en ADB como `emulator-5554`; `wm size` y `wm density` confirmaron 1280 × 800 y 160 dpi. Estas comprobaciones prueban el entorno, no la ejecución del frontend.

## Criterios de cierre pendientes

1. Terminar la compilación y verificar el APK generado.
2. Instalarlo, iniciar el cliente de desarrollo y comprobar Metro y el backend con la URL alcanzable desde el emulador.
3. Ejecutar los recorridos nativos previstos en las tareas 001–006, incluyendo teclado, reinicio, persistencia segura, cola offline, PDF y compartición.
4. Guardar evidencia de resultados y limitaciones, corregir los fallos observados y completar la convergencia con requisito y diseño.

Fuentes técnicas: [configuración Java de Android](https://developer.android.com/build/jdks), [herramientas oficiales](https://developer.android.com/studio), [SDK Manager](https://developer.android.com/tools/sdkmanager), [AVD Manager](https://developer.android.com/tools/avdmanager). Consultadas el 5 de octubre de 2026. La recuperación documental de Context7 no encontró una coincidencia válida para «Android SDK»; «Android Developers» resolvió a `/websites/developer_android` y se contrastó con las páginas oficiales.

## APK instalado y primer arranque

La compilación con Java 21 terminó con `BUILD SUCCESSFUL` en 8 min 57 s (690 tareas). El APK `mercado-app/android/app/build/outputs/apk/debug/app-debug.apk` tiene 98 366 341 bytes y SHA-256 `B4ED32391358196E6005C83F9D3A32FCDF4F97D4C4845E7A7D6E64ED312C599F`. Es un cliente de desarrollo para emulador x86_64; no es una distribución de producción ni acredita ejecución en ARM.

ADB confirmó `install -r` con `Success`. El enlace `mercado://expo-development-client/?url=http%3A%2F%2F10.0.2.2%3A8088` inició `com.mercado.gestion/.MainActivity` con estado `ok`. Metro, configurado con `EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api/v1`, entregó el bundle Android de 1587 módulos en 24 777 ms. La pantalla mostró la composición de acceso de Mercado y la bienvenida del cliente de desarrollo; se guardó `tmp/android-first-launch-2026-10-05.png`.

La API de prueba anterior ya no tenía handle vigente ni puerto de escucha. Se reinició la misma base aislada mediante `tmp/start-ui-api.ps1`, sin recrearla. `/api/v1/health/ready` confirmó estado `ok` y base de datos `up`. La ruta `/api/v1/health` no existe y respondió 404; no se interpretó como indisponibilidad de la API.

Los puntos 1 y 2 de preparación están acreditados. El login autenticado, la sesión segura, los recorridos de operación, PDF y compartición todavía requieren evidencia nativa adicional.

## Corrección de sesión y primeras consultas nativas

El primer login abrió el menú, pero la app volvió al acceso después del cierre forzado. La causa quedó reproducida en pruebas: `POST /auth/sessions` devuelve `VerifiedIdentity` (negocio, rol, usuario y nombre), mientras que la restauración requiere también nombre del negocio, ID de sesión y expiración central. La implementación asumía incorrectamente que el POST devolvía `SessionIdentity` completa. Se corrigió `createSession` para consultar `GET /auth/session` con el token recién emitido antes de devolver una sesión persistible. La credencial no forma parte del resultado guardado. Una segunda prueba impide devolver una sesión restaurable si falla esa consulta central. Ambas fallaron con el cliente anterior y pasan con la corrección.

También se corrigió la banda global de sincronización para respetar los insets superior y laterales, proporcionados por Expo Router. La prueba de la banda ahora incluye un contexto de área segura como la aplicación real. El check completo confirmó 116 pruebas en 22 suites, TypeScript y ESLint.

La repetición real en Android produjo POST de sesión 201 y GET de identidad 200. Después de `am force-stop` y nuevo arranque, la app recuperó la sesión desde SecureStore, volvió a consultar la identidad y mostró el menú del Mayorista sin pedir credenciales. La cabecera, acción de cierre y primeras operaciones están visibles; la banda ya no se superpone a la barra de estado. Evidencias: `tmp/android-menu-login-fixed-2026-10-05.png` y `tmp/android-session-restored-fixed-2026-10-05.png`. El nombre previo `android-session-restored-2026-10-05.png` corresponde al intento fallido y no prueba restauración.

La ruta directa `mercado:///purchase-history` consultó recepciones con 200 y mostró las dos compras de prueba. La apertura del primer detalle consultó recepción, sacos y liquidación con tres respuestas 200 y representó 2 sacos, 102 kg y S/255. Evidencia: `tmp/android-purchase-detail-2026-10-05.png`. Antes de la ruta directa, el intento desde el menú produjo consultas de catálogos y una pantalla de menú desplazada; esa secuencia de navegación necesita repetición y no se considera cerrada. No se acreditó aún teclado virtual: el foco y la entrada ADB funcionaron, pero la captura no mostró el teclado LatinIME.

## Historial desde menú y comprobante PDF

La repetición del historial desde la tarjeta visible del menú sí consultó `/receptions` y mostró ambas compras. Evidencia `tmp/android-history-from-menu-2026-10-05.png`. El primer intento anómalo se mantiene registrado; no se extendió una repetición correcta a toda la navegación.

La vista Comprobantes consultó ventas, recepciones y liquidaciones. La primera compra descargó `/receipts/purchases/cf30ab70-13c2-4697-b21b-5010d7c901fd.pdf` con 200 y abrió el visor nativo sin errores React Native ni Android Runtime registrados. La imagen `tmp/android-pdf-preview-2026-10-05.png` muestra el documento interno de compra, 2 sacos, 102 kg y S/255. No es un comprobante tributario.

Compartir volvió a descargar el archivo autorizado y abrió el panel Android con el PDF correcto; evidencia `tmp/android-share-panel-2026-10-05.png`. Se canceló con Atrás, sin seleccionar Bluetooth, imprimir ni transmitir el archivo a un destinatario. Se acredita el traspaso al panel del sistema, no recepción por una aplicación externa.

La revisión detectó que `onError` del visor ignoraba los fallos. Se reemplazó por mensaje no revelador y Reintentar, que vuelve a montar el lector. Cada documento reinicia su estado por clave, sin efectos que produzcan renders adicionales. El modal ahora usa área segura. La prueba simula fallo del lector, comprueba mensaje visible sin ruta interna y vuelve a leer al reintentar. El primer arranque de esa prueba excedió 5 s; el diagnóstico acotado pasó en 378 ms y la suite normal repetida pasó sin aumentar el timeout del proyecto: 117 pruebas, 23 suites. TypeScript y lint también pasaron después de la corrección.

La última versión se recargó en el mismo cliente instalado y volvió a abrir el PDF con 200. La captura `tmp/android-pdf-preview-safe-area-2026-10-05.png` acredita cabecera por debajo de la barra de estado y documento por encima de la navegación del sistema. Exportaciones vigentes: Android `entry-6713ecc25c3f27e391ca471fbfd1aff6.hbc` y web `entry-eea9aa935929294cfd5b64338103e398.js` (19 rutas). Ambas usan direcciones del backend de prueba local; no son una configuración de despliegue productivo.

La ampliación mediante doble toque respondió en el lector nativo y permitió leer los pesos e importes a mayor tamaño; evidencia `tmp/android-pdf-zoom-2026-10-05.png`. El gesto de pellizco con dos contactos y tamaños adicionales siguen pendientes.
# Visibilidad de campos con teclado — evidencia del 5 de octubre de 2026

Se comprobó el teclado virtual en la tablet Android de pruebas. Con el teclado visible, la ventana mantenía su tamaño y ocultaba campos inferiores. La corrección mide el área cubierta, añade espacio desplazable y revela el campo enfocado. El contexto compartido conecta `FormField` con `AppScreen`; al abrir una selección se descarta el teclado. `WeighingScreen` integra el mismo mecanismo conservando `FlatList` y su virtualización.

Los campos Teléfono y Conductor quedaron visibles en los límites `[105,297][532,349]`, por encima del teclado que comenzaba en y=365. Evidencia válida: `tmp/android-reception-keyboard-visible-2026-10-05.png` y `tmp/android-driver-keyboard-visible-2026-10-05.png`. La captura `android-reception-keyboard-fixed-2026-10-05.png` pertenece a un intento anterior insuficiente y no demuestra resolución.

Esta evidencia corresponde a recepción. El mecanismo extraído y su integración final con la lista de pesaje pasaron comprobaciones estáticas y pruebas, pero aún requieren prueba nativa de pesaje. La modificación visual del 6 de octubre tampoco se declara verificada en Android. No se generó una recepción comercial nueva durante la comprobación de teclado.
