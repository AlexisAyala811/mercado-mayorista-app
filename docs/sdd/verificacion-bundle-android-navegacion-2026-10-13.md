# Bundle Android y recuperación de herramientas — 13 de octubre de 2026

El código del corte compartido de navegación (443 pruebas / 65 suites, tipos/lint/web acreditados en `verificacion-atras-formularios-2026-10-13.md`) se exportó para Android con Expo instalado 57.0.26, sin actualizar dependencias. Context7 resolvió Expo y consultó `/websites/expo_dev`; la ayuda del CLI instalado confirmó --platform android y --output-dir.

La carpeta de destino se resolvió y comprobó dentro de tmp, y se exigió que no existiera antes de exportar. URL pública explícita para QA del emulador: `http://10.0.2.2:3000/api/v1`, restaurada al terminar. No se incluyeron credenciales ni se publicó un entorno productivo.

## Resultado del export

Comando equivalente: `node node_modules/expo/bin/cli export --platform android --output-dir <carpeta QA verificada>`. Terminó con código cero, 1468 módulos, 44 recursos y metadata.json.

- Bundle: `tmp/android-export-navigation-2026-10-13/_expo/static/js/android/entry-f10e4502e976d16fd1c7369b7c396bd0.hbc`.
- Tamaño real: 3 528 550 bytes.
- SHA-256: `8B733678023A6DA27B430E4CCAEAA4975C55ED5B4F13966846C638ED5064A992`.

Esto acredita empaquetado Android del código actual y sustituye los bundles históricos para el siguiente ensayo. No acredita APK nuevo, instalación, arranque, Atrás nativo, teclado, PDF nativo, TalkBack ni fidelidad Figma.

## Estado real de herramientas

ADB fuera del sandbox no encontró dispositivos conectados; no había Metro 8081 ni daemon anterior 53398 escuchando, y no se localizaron procesos emulator/qemu del proyecto. La API/PostgreSQL/web QA existentes sí conservaban listeners. No se trató el ANR del 12 de octubre como un proceso todavía vivo.

Se revisó agent-device 0.21.22 instalado, su contrato local y Context7 `/callstack/agent-device`, sin instalar/actualizar herramientas. Un estado propio `tmp/agent-device-state-android-20261013` generó daemon HTTP autenticado PID 6436, puerto 52305. La conexión automática del cliente falló, pero CIM y listener confirmaron el proceso/puerto de ese daemon. La conexión explícita autenticada llegó al servidor y devolvió TOOL_MISSING: adb no estaba en su PATH.

Para recuperar el entorno con la ruta del SDK se utilizó el cierre oficial `daemon stop --state-dir ...`, sin --clean. No confirmó retirada. Se inspeccionaron de nuevo proceso y puerto: PID 6436 seguía vivo, HTTP ya no escuchaba. El reintento oficial con --debug indicó `terminationReason: missing-start-time`, `processStartTime: null`, estado retained y datos de daemon conservados. Su token se redactó en memoria antes de mostrar el diagnóstico.

Se conserva ese estado; no se terminaron procesos por fuerza ni se borraron locks/identidades. No se arrancó un segundo daemon para esquivar esa comprobación. El auxiliar `tmp/android-qa-20261013.mjs` fija la identidad observada y debe revalidarse antes de usarlo de nuevo; no constituye un servidor funcional confirmado tras el cierre parcial. No se lanzó el emulador ni Metro, ni se inició sesión Android, durante este corte.

## Pendientes

Resolver la retirada/recuperación verificable del SDK en Windows con ANDROID_HOME/PATH correctos, comprobar AVD y cliente, cargar código actual y ejecutar los recorridos nativos completos. El bundle nuevo no cierra los gates Android de 001–007 ni la meta global.
