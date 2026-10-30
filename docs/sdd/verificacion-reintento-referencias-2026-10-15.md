# Referencias contextuales: recorrido real y reintento de opciones

Continuación de `verificacion-referencias-en-operaciones-2026-10-14.md`. El objetivo completo del frontend sigue abierto.

## Recorrido observado antes de la corrección

La pestaña existente de localhost:8087 volvió a estar disponible. Se inició sesión con la cuenta ficticia habitual de QA. Su documento conservaba entry-66b6d6fa3ecbede3770c5c79b5f9033e.js; una recarga intencional del formulario vacío cargó la versión contextual instalada. Se observaron los accesos de proveedores/variedades dentro de Compra, sin volver a crear una sección Catálogo.

Desde Compra se editó conductor «QA conservar conductor», abrió Proveedores y escribió una referencia ficticia. Volver mostró la confirmación de descarte; Cancelar conservó nombre/teléfono. Guardar confirmó «Registro guardado en el servidor». Al volver, el conductor seguía presente y el selector ofrecía «Proveedor contextual QA 1410». Se seleccionaron ese proveedor y Canchán QA.

Continuar al pesaje **sí crea una recepción**, según el contrato existente: no fue una acción meramente local. Quedó una recepción draft, versión 0, sin sacos, sin liquidación ni efecto financiero. La pantalla de pesaje mostró las acciones contextuales de calidad/procedencia y No informada. Desde ella se guardó «Primera QA contextual», con confirmación visible. La sesión venció antes de completar el retorno y selección de esa calidad; no se considera acreditado ese tramo. Se observó el aviso de vencimiento y un nuevo acceso, sin certificar por ello todo el ciclo de seguridad.

El árbol DOM del editor tenía role=dialog y aria-modal=true. Esto no constituye prueba de TalkBack, aislamiento completo del foco ni accesibilidad de todos los diálogos. Las capturas se inspeccionaron en la salida de la herramienta; no se conservaron como archivos y no se presentan como comparación exportable con Figma.

## Persistencia y conservación

Después de constatar ausencia de los servicios/procesos QA, se reanudaron la base existente y API; no se reiniciaron por un timeout de observación. `mercado-api/test/verify-contextual-reference-ui-state.mjs` ejecutó una transacción PostgreSQL REPEATABLE READ / READ ONLY y rollback. Evidencia `tmp/contextual-reference-ui-state-20261015.json`, 2026-10-15T15:45:52.670Z:

- Proveedor/teléfono y calidad activos persistieron en el mismo negocio.
- Recepción `0261c947-7813-4745-bf93-9d080be48b14`, proveedor y conductor correctos, draft/version 0, cero sacos.
- Las huellas de las 14 tablas comerciales anteriores coinciden con el corte previo al excluir **solo esa recepción nueva** del cálculo de receptions. No se reemplazó la línea base. Saldos, ventas, devoluciones y bytes PDF anteriores intactos; sin nuevos movimientos financieros.

El verificador anterior de migraciones que exige igualdad total de receptions ya no es aplicable sin reconocer esta adición legítima. No borrar ni anular la recepción para forzar ese verificador a pasar. El script nuevo pasó oxlint; no muta datos de negocio ni reenvía la devolución pendiente.

## Corrección de recuperación

La revisión encontró que una referencia guardada cuya recarga de opciones fallaba mostraba «Reintenta la carga» sin acción directa. Compra (datos y pesaje) y Venta ahora muestran «Dato guardado; opciones pendientes» con «Reintentar opciones». Es una lectura de referencias, no repite el alta ni encola una operación comercial; conserva conductor, acuerdo, líneas y peso en edición. Durante la lectura muestra carga, evita solicitudes simultáneas y nuevas aperturas de editores; conserva el control por generación al salir/cambiar sesión. El permiso de administración se renderiza desde un booleano de rol, sin leer refs durante render ni desactivar lint.

Tres regresiones nuevas comprueban recarga fallida y reintento con opciones nuevas, doble pulsación sin lecturas duplicadas, acuerdo de Venta y peso de saco conservados, sin encolado/envío ni nueva consulta de recepción. Las primeras pruebas enfocadas aprobaron 49 casos. El primer check detectó el uso de una función con ref como condición de render; se corrigió. Un check posterior quedó sin proceso/resultado final después de seis suites; no se contó como aprobado. El siguiente intento no se inició por timeout de revisión automática; el único reintento permitido terminó con **494 pruebas / 68 suites** aprobadas. Tipos/lint aprobados en `tmp/contextual-retry-frontend-check-20261015.log`; suite final y salida 0 en `tmp/contextual-retry-frontend-tests-20261015.log` y `tmp/contextual-retry-frontend-tests-exit-20261015.txt`.

## Paquete y límites

Export web de 20 rutas aprobado: `tmp/web-export-contextual-retry-20261015`, log `tmp/contextual-retry-export-20261015.log`. Entry `entry-6801ae68795ac8b2329573481299403e.js`, SHA-256 `8BDD635BFA8CB4C40FFB21FF95E00C4581CB2704CF44355CC7387946A860E90D`. Instalados 260 archivos con hashes iguales; respaldo `tmp/web-before-contextual-retry-20261015`, assets anteriores conservados. `tmp/contextual-retry-web-activation-20261015.json`, 17:08:21Z. Verificados los 200 recursos PDF.js 6.4.299 por raíz tanto en export como dist.

Tras reiniciarse el control del navegador no quedaron pestañas disponibles. La revisión automática rechazó crear otra pestaña del origen localhost:8087 porque lo considera reapertura de la superficie bloqueada previamente. No se usó otro navegador, protocolo o vía indirecta para reproducir la UI. Se solicitó al usuario abrir la aplicación; queda pendiente su respuesta. La consulta PostgreSQL anterior verifica persistencia, no sustituye el recorrido visual bloqueado.

Pendientes: recorrido real del reintento nuevo y Venta, selección de calidad tras volver, Figma, Android, teclado y lector de pantalla, demás gates de cada módulo. La evidencia de las altas reales corresponde al paquete contextual anterior; no prueba visualmente la corrección posterior. La meta no se cierra por tests/export ni por este recorrido parcial.

## Continuación nativa del mismo día

El SDK local consultó el estado real y confirmó el AVD apagado; su arranque posterior terminó con booted:true. Se abrió la aplicación con una grabación nueva y parametrizable (`tmp/android-contextual-retry-20261015.ad`), sin sobrescribir la del día anterior. No se introdujeron credenciales. La primera pantalla mostró el cliente de desarrollo; se introdujo la dirección local de Metro y Connect mostró después «Failed to connect to /10.0.2.2:8081». Captura inspeccionada `tmp/android-contextual-retry-current-20261015.png`; **no es una captura del frontend cargado**.

Se verificó que Metro propio PID 4092 estaba vivo pero escuchaba solo en ::1. Consulta al estado IPv4 rechazó la conexión. El código instalado de Expo fija host=localhost cuando se pide --localhost; se contrastó en Context7 la documentación oficial de Node.js 24 sobre orden DNS IPv4. Se reemplazó únicamente ese Metro, después de cotejar comando y propietario del listener, por Node con --dns-result-order=ipv4first y los mismos argumentos Expo/puerto/API QA. Nuevo PID 18632, listener **127.0.0.1:8081** comprobado; no se abrió una interfaz pública ni se actualizaron dependencias. Logs `tmp/metro-ipv4-contextual-retry-20261015.log` y `.err.log`.

La consulta de disponibilidad tuvo inicialmente un timeout de revisión automática antes de ejecutar; el único reintento permitió verificar el diagnóstico. Se comprobó también ausencia de API/PostgreSQL y se reanudó la base existente. El PID anterior 17320 ya pertenecía a AppActions.exe y **no se detuvo**; el lanzador nuevo fue 24676, logs `tmp/qa-api-native-ipv4-20261015.log` y `.err.log`. Estos PIDs describen el corte, no sustituyen una comprobación futura de identidad/liveness.

La siguiente lectura/pulsación oficial de cierre del error se rechazó: «Android automation helper is still holding device automation ownership». No se afirma ejecutada ni se forzó la propiedad. Doctor oficial confirmó una sesión dirigida al AVD, dispositivo arrancado, herramientas correctas, IME normal y Metro alcanzable en http://127.0.0.1:8081/status, pero informó que no encontraba una aplicación launchable con el identificador observado antes y advirtió reverse ausente. Esa discrepancia queda sin resolver; el reverse no se añadió y no se instaló ninguna app como sustitución. No se considera acreditado un nuevo acceso, la carga del frontend vigente ni los módulos Android por haber resuelto el enlace IPv4.

Referencia consultada: [Node.js 24 — orden de resultados DNS](https://nodejs.org/docs/latest-v24.x/api/dns.html#dnssetdefaultresultorderorder). La relación con el enlace de Metro es una inferencia contrastada con su código instalado y el cambio de listener observado.

### Recuperación oficial posterior y pérdida del entorno

Una consulta posterior de apps.list sí devolvió «Gestion (com.mercado.gestion)», resolviendo la ausencia de reconocimiento anterior para ese corte. devices.list y sessions.list acreditaron que emulator-5554 estaba reclamado por mercado-contextual-retry-20261015 y el workspace de este proyecto. Se cerró exclusivamente esa sesión con sessions.close(shutdown:false), después de comprobar propietario/nombre/workspace; no se forzó ni se retiró otra reclamación. El SDK devolvió cierre correcto, pero no informó savedScript; por ello no se acredita un archivo de recuperación exportado por ese cierre. Se preservaron los destinos anteriores y se reabrió con otro destino de grabación.

La reapertura terminó correctamente y la lectura posterior del helper funcionó. Metro propio 18632 seguía vivo, enlazado a 127.0.0.1, y completó Android Bundled 4357ms / 1665 módulos. La captura fue blanca con el control del cliente de desarrollo; no se observó el login. La ruta de captura «current» es mutable y sustituyó el archivo de error de conexión anterior: ese error se vio en la herramienta, pero ya no se puede comprobar mediante ese mismo archivo. Se conserva la fase blanca separada en `tmp/android-contextual-retry-resumed-blank-20261015.png` para no atribuirle otro estado.

Al intentar obtener el árbol completo, el SDK reemplazó un daemon no alcanzable y terminó con DEVICE_NOT_FOUND / No devices found. La comprobación CIM/TCP actual confirmó ausencia de emulator/qemu, PostgreSQL, Metro y listeners 8081/3000/55437/8087; solo quedó el daemon nuevo. No se interpretó un archivo de estado como liveness ni se reiniciaron todos los servicios por un timeout. No se introdujeron credenciales ni se verificó un acceso nativo nuevo. La causa por la que esos procesos dejaron de estar activos no está acreditada; el cierre oficial anterior había usado shutdown:false y se había comprobado el dispositivo después.

Referencia de recuperación contrastada con Context7 y los tipos instalados: [cliente oficial agent-device](https://github.com/callstack/agent-device/blob/main/src/agent-device-client.ts). Los intentos posteriores no sustituyen los gates visuales; estos siguen pendientes.
