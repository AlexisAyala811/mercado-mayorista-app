# Carros en Android: datos reales y borradores

Recorrido ejecutado el 15 de octubre de 2026, aproximadamente 19:49–19:58 de Lima (artefactos con sufijo UTC 20261016). Emulador existente Mercado_Tablet_API36, 1280×800, app com.mercado.gestion, SDK agent-device 0.21.22, Metro actual y API/PostgreSQL de QA aislados. No se abrió una pestaña o navegador alternativo para eludir la restricción de revisión automática.

## Comprobación realizada

El inventario confirmó emulador apagado y ausencia de los servicios; se arrancaron las instancias de QA existentes. Metro en 127.0.0.1:8081, con dirección IPv4 ya documentada para Android, cargó 1674 módulos. La primera observación de apertura aún mostró controles del lanzador; la observación posterior mostró el login completo. No se reinició por ese estado intermedio.

Inicio de sesión con la cuenta ficticia existente: respuesta API 201 y consulta de sesión 200; menú del Mayorista visible. SDK fill parametrizó ambos valores como `${QA_USERNAME}` y `${QA_PASSWORD}`, disponibles únicamente en el proceso de ejecución. No se crearon credenciales ni se modificó el método de autenticación.

Desde el botón Logística se abrió Carros. Se observaron User original, búsqueda, transportista QA, teléfono y placa separados, acciones de entidades y acceso +. La fila proviene de las consultas API existentes. La composición 1280×800 tiene desplazamiento vertical; no se agregaron filas ficticias para llenar el marco.

Pulsar editar transportista desplazó al formulario y mostró Nombre/Placa. Se introdujeron únicamente borradores: «Borrador Android conservar» y «QA-BORRADOR». El gesto táctil en la zona observada permitió volver a la cabecera. Buscar «No existe Android QA» mostró «Sin coincidencias de logística»; limpiar recuperó la fila. Pulsar + abrió «¿Abrir un registro nuevo?»; Cancelar mantuvo los datos.

Se corrigió el retorno al registro ya editado: cuando existe un borrador de esa misma entidad, solicitar de nuevo la edición lleva el foco a su formulario conservando los valores. Antes la guarda devolvía sin enfocar; el comportamiento sigue pidiendo confirmación cuando se trata de otra entidad. Regresión de componente reforzada y retorno nativo comprobado: ambos borradores visibles después de buscar, limpiar, cancelar y volver al mismo transportista.

## Registro y límites de la herramienta

El desplazamiento genérico SDK hacia arriba no movió contenido en tres pasadas. No se confundió ese fallo con pérdida del borrador: la captura lo conservó y el gesto dentro de la zona observada sí desplazó al inicio.

La primera publicación del registro fue rechazada por faltar una comprobación de destino. Se añadió el selector portable del título visible «Registro de logística»; el filtro `role="heading"` no resolvió en el adaptador, por lo que se usó su etiqueta visible y única. La publicación confirmó **20 acciones**, sin forzar ni reemplazar archivos. Guion `tmp/android-contextual-retry-resumed-20261015.ad`, con variables de credenciales y comprobación final; no se afirma que haya sido reproducido.

## Evidencia

- `tmp/carros-native-evidence-20261016.json`: huellas de capturas/guion, estados observados y solicitudes de API. El registro de esta instancia contiene solo lecturas y el alta de sesión: **cero escrituras comerciales observadas**. No se pulsó guardar, desactivar ni confirmar devolución.
- Capturas: `tmp/android-carros-login-20261016.png`, `tmp/android-carros-reference-initial-20261016.png`, `tmp/android-carros-new-guard-20261016.png`, `tmp/android-carros-drafts-preserved-20261016.png`.
- Árboles de elementos en los JSON `android-carros-*-20261016.json`; los valores de ambos borradores se verificaron antes de la guarda de destino.
- Código final: TypeScript/lint y **501 pruebas / 69 suites** aprobados en `tmp/carros-native-focus-check-20261016.log`, código 0.

## Atrás del sistema y paquete final

Después de publicar el guion, se probó Atrás con el SDK en modo `system`. La primera acción conservó el formulario; antes de la siguiente se consultó el teclado, que indicó `visible:false`. La segunda acción mostró «¿Salir de logística?». Cancelar mantuvo ambos borradores, comprobados en el árbol accesible. Volver a pulsar Atrás y luego «Salir sin guardar» devolvió al menú. Solo se descartaron los borradores ficticios creados para esta prueba. Evidencia y huellas en `tmp/carros-system-back-evidence-20261016.json`; captura del aviso `tmp/android-carros-system-back-guard-20261016.png`, captura del menú `tmp/android-carros-exit-menu-20261016.png`. Estas acciones posteriores no se atribuyen al guion ya publicado.

La exportación de la corrección de foco falló por EPERM al crear assets dentro del sandbox. Se conservó ese intento y se exportó correctamente fuera del sandbox a `tmp/web-export-carros-native-focus-retry-20261016`, 20 rutas, código 0. Entrada SHA256 `07BCACF488B6A25A34E68ED3EC2029EC36165799F1DD7FED9BFC498A6D8F5E97`. Instalación local en dist: 267 archivos cotejados, respaldo `tmp/web-before-carros-native-focus-20261016`, activos anteriores conservados; evidencia `tmp/carros-native-focus-web-activation-20261016.json`. PDF.js 6.4.299 y sus 200 recursos cotejados en public/export/dist. No se afirma que un navegador haya cargado este paquete.

Esto acredita login, consulta real, búsqueda, retorno al formulario y conservación/cancelación en una tablet Android. Faltan 360×800, marco 1440×1024, aumento de texto, TalkBack, oclusión por teclado de software y mutaciones positivas de logística. El teclado no se consideró verificado por el solo hecho de editar campos. T413/T414 y la convergencia global siguen abiertos.
