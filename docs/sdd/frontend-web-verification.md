# Evidencia de verificación del frontend

**Fecha:** 30 de septiembre de 2026  
**Alcance:** ejecución local de Expo Web y compilación Android; la evidencia táctil en tablet física permanece separada.

## Autenticación y autorización

Se ejecutó la aplicación contra una API local controlada que entregó una sesión de Encargado vigente. La prueba verificó:

1. El menú autenticado mostró únicamente **Compras** y **Ventas**.
2. La navegación directa a `/accounts` no cargó datos ni controles financieros.
3. La interfaz mostró **Acceso restringido**, explicó que la sección requiere el perfil Mayorista y ofreció **Volver al menú**.
4. La acción volvió al menú sin cerrar la sesión del Encargado.
5. La barra de sincronización permaneció visible y no reportó operaciones locales inexistentes.

También se ejecutó una sesión de Mayorista cuya primera consulta protegida respondió `401`. La aplicación eliminó la sesión local, volvió automáticamente al acceso y mostró **Tu sesión venció. Ingresa nuevamente para continuar.** Una respuesta `401` al intentar iniciar sesión no dispara esta transición, por lo que las credenciales incorrectas conservan su mensaje específico.

Esta evidencia cubre la presentación web del escenario de acción restringida de la especificación 001. El backend continúa siendo la autoridad y conserva la verificación y auditoría de cada recurso protegido.

## Adaptación visual

Se inspeccionaron el acceso y el menú en el navegador integrado con ancho compacto. Se corrigió la cabecera de cuenta para apilar la acción de cierre de sesión y evitar la fragmentación del nombre. Las tarjetas se presentaron en una columna y conservaron objetivos táctiles, jerarquía y texto legible.

La comparación disponible con Figma usa `LOGIN · Acceso` (`62:79`) y `MENU` (`1:131`). El detalle de los demás marcos no pudo recuperarse en esta ejecución por el límite de llamadas del plan Starter de Figma.

## Reportes y fechas operativas

El reporte comercial se verificó a 1440 × 1024 con resumen, costos, margen comercial estimado, alertas e historial de precios. La interfaz permite filtrar el historial por tipo de operación, variedad, proveedor y comprador, enviando los identificadores seleccionados al contrato central. Los filtros incompatibles se deshabilitan al elegir solo compras o solo ventas.

La prueba detectó que las fechas iniciales se calculaban en UTC. En Lima, después de las 19:00, esto proponía el día siguiente. Reportes, recepción y liquidaciones de flete/estiba ahora forman la fecha con el calendario local del dispositivo.

La consulta de comprobantes distingue documentos vigentes e invalidados. Las operaciones anuladas permanecen visibles como evidencia, pero no ofrecen vista previa ni compartición. En Inventario, la devolución física selecciona una venta confirmada mediante fecha, destino e importe y deja de exigir que el usuario copie un UUID.

## Verificación automatizada y de compilación

- `npm run check` en `mercado-app`: TypeScript, ESLint, 9 suites y 22 pruebas aprobadas.
- `npx expo export --platform web --output-dir dist`: 19 rutas estáticas exportadas.
- `npx expo export --platform android --output-dir dist-android`: bundle Hermes Android generado.
- `scripts/validate_project.ps1`: 7 especificaciones SDD válidas, frontend aprobado y backend aprobado con 31 archivos y 84 pruebas.

## Incidencia encontrada y corregida

La cola cifrada construía un objeto `File` nativo al arrancar en web. Expo FileSystem rechazaba la ruta antes de que la aplicación eligiera el almacenamiento correspondiente a la plataforma. La implementación ahora usa `localStorage` cifrado en web y crea archivos únicamente en Android/iOS.

La recuperación de rechazos también se corrigió. Los cambios de autorización (`401` y `403`) pasan a **Requiere revisión** y conservan el pendiente; una operación rechazada puede descartarse con motivo después de comprobar que no existe un resultado central. El descarte termina en un estado propio y deja de mantener una alerta imposible de resolver.

## Evidencia todavía requerida

- Recorridos táctiles en los tamaños de tablet Android aprobados.
- Reinicio, pérdida de red y cinco reintentos de la cola en Android.
- Apertura y compartición del PDF mediante un cliente de desarrollo nativo.
- Comparación visual detallada de los marcos cuyo contexto de Figma quedó limitado.

## Recorrido con PostgreSQL y API reales — 1 de octubre de 2026

Se utilizó una base aislada `mercado_ui_test_*`, con 19 migraciones, API Nest local y Expo Web. Los registros son datos ficticios de QA.

- Acceso como Mayorista y creación de proveedor, comprador con límite S/ 5,000, variedad, transportista y vehículo confirmados mediante la interfaz.
- Recepción de dos sacos: 50 kg brutos menos 1 kg de tara y 52 kg brutos menos 1 kg de tara. Resultado central: 100 kg netos.
- Cierre de pesaje y compra al contado por S/ 2.50/kg: liquidación confirmada de S/ 250.00.
- Venta al contado de un saco y 49 kg por S/ 3.50/kg: total confirmado de S/ 171.50.
- Inventario posterior: un saco y 51 kg; caja: entrada S/ 171.50, salida S/ 250.00, neto S/ -78.50. Sin operaciones locales pendientes.

El recorrido encontró un rechazo HTTP en Reportes: `maxAvailableSacks` llegaba como texto y el DTO exigía un número sin transformarlo. Se incorporó conversión explícita y prueba de regresión con el valor HTTP `"10"`. El 4 de octubre se verificó `npm run check` del backend: 31 archivos, 85 pruebas, tipos, lint y compilación aprobados. La repetición visual del reporte con el servidor actualizado sigue pendiente; la prueba de transformación no sustituye esa evidencia.

El 4 de octubre se añadió estado vacío en Catálogos y validación previa de límite de crédito inválido. `npm run check` del frontend aprobó tipos, lint y 22 pruebas en 9 suites.

## Legibilidad comercial — 4 de octubre de 2026

Cuentas y caja traduce categorías y orígenes a términos comerciales en español. Las cuentas anuladas muestran Anulada en lugar de Pagada. El historial y detalle de ventas muestran Confirmada o Anulada. Esta revisión evita presentar códigos internos o estados financieros incorrectos. Verificación: tipos, lint y las 22 pruebas del frontend aprobadas; revisión visual de estos cambios pendiente.

## Recuperación de consultas — 4 de octubre de 2026

El listado de ventas ahora presenta los errores de consulta y apertura de detalle; antes guardaba el mensaje sin renderizarlo y podía mostrar Sin ventas tras un fallo. Las acciones Actualizar en ventas, catálogos y cuentas muestran carga y limpian el error anterior al reintentar. La apertura de una cuenta o venta limpia también el mensaje anterior. Verificación automatizada: npm run check, tipos y lint aprobados, 22 pruebas en 9 suites. La simulación visual de fallo y recuperación permanece pendiente.

## Validación de devoluciones — 4 de octubre de 2026

La devolución comercial rechaza ajustes de flete inválidos en lugar de convertirlos silenciosamente a cero. Las líneas seleccionadas validan sacos enteros no negativos y peso decimal con hasta tres posiciones, además del importe autorizado positivo. El backend mantiene la validación definitiva y la comprobación de devolución física previa. La verificación visual del formulario permanece pendiente.

## Confirmación de ventas — 4 de octubre de 2026

Devoluciones y anulaciones bloquean solicitudes simultáneas mediante un cerrojo inmediato y deshabilitan las acciones durante el envío. El diálogo muestra Procesando y evita cierre o confirmación adicional mientras la solicitud está pendiente. Un motivo vacío cierra la confirmación para permitir corregir el formulario. Verificación: 22 pruebas aprobadas y tipos aprobados después de incorporar el estado ocupado al diálogo. Esto no acredita todavía el reintento idempotente ante una respuesta perdida, que requiere revisión adicional.

## Identidad del reintento comercial — 4 de octubre de 2026

La pantalla de historial conserva el UUID y una firma del contenido enviado cuando una anulación o devolución pierde la respuesta o recibe un error del servidor. Reintentar los mismos datos reutiliza el UUID; modificar el contenido mientras el resultado es incierto muestra una instrucción de recuperación. El identificador se libera al confirmar éxito o recibir rechazo HTTP definitivo. El backend comprueba el UUID antes de aplicar nuevamente el efecto comercial. npm run check aprobó tipos, lint y 22 pruebas. Esta evidencia cubre la implementación; falta simular pérdida de respuesta y comprobar el efecto único. La identidad pendiente es actualmente de memoria y su recuperación tras abandonar o reiniciar la pantalla todavía requiere trabajo.

## Consulta central de devoluciones — 4 de octubre de 2026

Se amplió la consulta de operaciones con sale-return, usando UUID y negocio autenticado. La cola reconoce sale.return y sale.void para consultar resultados centrales antes de reintentar o descartar. Se verificó recuperación de devolución con filtro de negocio en una prueba específica (3 pruebas de OperationsService aprobadas); el check completo anterior a añadir esa prueba aprobó 85 pruebas y compilación. La conexión de la pantalla a la persistencia cifrada continúa pendiente.

## Persistencia de resultados inciertos — 4 de octubre de 2026

Historial de ventas envía las anulaciones y devoluciones con UUID estable. Ante fallo de red o HTTP 5xx conserva UUID, ruta y cuerpo en la cola cifrada de la identidad y abre Sincronización. Si el almacenamiento falla, conserva el identificador en memoria y muestra el error sin navegar. Una respuesta comercial exitosa limpia la solicitud antes de refrescar el detalle, evitando encolar una operación por un fallo posterior de consulta. La cola consulta el resultado central por tipo antes de repetir. Se corrigió su descripción: un pendiente puede haber aplicado efectos centrales cuya respuesta no llegó. Verificación: tipos, lint y 22 pruebas aprobados. Pendiente: prueba de respuesta perdida y reinicio; la escritura se hace al detectar el fallo, de modo que aún existe una ventana de cierre abrupto durante el envío.

## Reinicio durante sincronización — 4 de octubre de 2026

Al leer la cola cifrada, los registros que quedaron Sincronizando se recuperan como Pendiente, conservando UUID, cuerpo e intentos. Antes quedaban sin acción de recuperación tras un cierre abrupto. Las respuestas HTTP 5xx vuelven a pendiente porque no acreditan rechazo definitivo. Dos pruebas cubren la identidad conservada y la preservación de estados terminales y revisión. npm run check aprobó tipos, lint y 24 pruebas en 9 suites. La concurrencia entre acciones de cola y el reinicio real del almacenamiento todavía requieren verificación.

## Acciones de cola en orden — 4 de octubre de 2026

Las mutaciones públicas de la cola se ejecutan en una secuencia compartida y consultan la lista actual mediante referencia; la lectura inicial usa la misma secuencia. El estado se publica después de confirmar la escritura cifrada. Un fallo de lectura impide agregar registros que sobrescriban una cola no recuperada. Dos pruebas verifican ejecución en orden y continuación tras un error. Check aprobado con 26 pruebas en 10 suites, tipos y lint sin advertencias. Sigue pendiente la prueba del proveedor con cambio de identidad durante una solicitud y la ejecución nativa.

## Aislamiento de instancia por identidad — 4 de octubre de 2026

SyncQueueProvider crea una instancia interna con clave negocio:usuario (o anonymous). Cambiar de identidad desmonta sus referencias, secuencia y estado y crea una instancia nueva. Las tareas anteriores conservan su ámbito de almacenamiento original y no publican resultados en las referencias de la instancia nueva. Check aprobado: tipos, lint y 26 pruebas en 10 suites. Falta probar el proveedor con respuesta diferida durante cierre de sesión e inicio con otra identidad; las pruebas actuales de dominio no demuestran ese recorrido.

## Pruebas del proveedor de cola — 4 de octubre de 2026

Se ejecutaron pruebas React del proveedor real con almacenamiento y API controlados. Una consulta de recuperación permanece pendiente mientras cambia la identidad; al responder, la cola nueva sigue vacía y la escritura confirmada utiliza únicamente el negocio y usuario originales. Otra prueba encola dos operaciones simultáneas y verifica que ambas permanezcan en memoria y en la escritura cifrada solicitada. Estas pruebas cubren integración del proveedor; no sustituyen el cifrado real ni el recorrido Android.

## Fallos de almacenamiento — 4 de octubre de 2026

Dos pruebas adicionales del proveedor verifican que una escritura cifrada rechazada no publica un pendiente y permite una escritura posterior, y que una cola ilegible no se sobrescribe. Sincronización muestra un mensaje de recuperación y omite el estado vacío cuando falla la lectura. Check aprobado: 30 pruebas en 11 suites, tipos y lint. Falta confirmar estos estados en la interfaz renderizada y almacenamiento nativo.

## Aviso transversal de sincronización — 4 de octubre de 2026

El banner muestra fallo de recuperación con etiqueta accesible y acceso a Sincronización cuando la cola no puede leerse; antes afirmaba Datos sincronizados al tener una lista vacía. Una prueba renderiza el componente y verifica el aviso y la ausencia de ese éxito falso. Sincronizar y Reintentar capturan fallos de almacenamiento y los presentan mediante FeedbackState; las acciones se deshabilitan durante el procesamiento. Check anterior a añadir la prueba: 30 pruebas, tipos y lint aprobados. Nueva prueba de banner aprobada.

## Reintento de lectura — 4 de octubre de 2026

Sincronización ofrece Reintentar lectura cuando el almacenamiento cifrado falla. La lectura se ejecuta en la secuencia de la cola y muestra carga; no elimina ni sobrescribe el contenido. El banner distingue recuperación en curso de datos sincronizados. Una prueba del proveedor simula fallo y posterior recuperación de un envío interrumpido, conservando UUID e intentos y comprobando que no se escribe durante la lectura. Check aprobado: 32 pruebas en 12 suites, tipos y lint. Los servidores anteriores 31137 y 69704 ya no están registrados; no se usaron como evidencia de ejecución actual.

## Recuperación central antes del reenvío — 4 de octubre de 2026

Las pruebas del proveedor real verifican que una devolución o anulación con resultado central se confirma sin repetir la solicitud comercial; intentar descartar una devolución aplicada recupera su referencia central. Se corrigió un fallo que ignoraba errores HTTP de la consulta central y continuaba al envío: ahora propaga el error y conserva el pendiente, UUID, cuerpo e intentos. Solo un 404 de esa consulta habilita el envío en estos tipos soportados. Las pruebas cubren 401, 403 y 500, ausencia central seguida de confirmación y ausencia de llamadas o escrituras al reintentar operaciones confirmadas o descartadas. Esta comprobación usa API y almacenamiento controlados; no acredita servidor real ni almacenamiento nativo.

Verificación actual: `npm run check` aprueba TypeScript, lint y 41 pruebas en 12 suites. Continúan pendientes el recorrido Android, la comparación completa de Figma y la persistencia previa al envío comercial para cerrar la ventana de cierre abrupto.

## Guardado previo en Historial de ventas — 4 de octubre de 2026

Historial guarda anulaciones y devoluciones en la cola cifrada antes de solicitar el envío. `sendQueued` ejecuta la consulta central y el envío en la misma secuencia del proveedor y devuelve el estado guardado. Si la escritura inicial falla, la pantalla conserva el formulario y no contacta al servidor. Una operación pendiente, rechazada o en revisión abre Sincronización; solo una confirmación permite anunciar éxito y actualizar el detalle. Tras la confirmación, un fallo de lectura del detalle se presenta en Historial y no crea otro pendiente.

Se corrigió también el contrato de devolución: `SaleReturnsService.create` devuelve `{saleReturn, lines}`, por lo que la referencia se obtiene de `saleReturn.id`. El contrato TypeScript y la cola reflejan esa estructura. Historial permite compartir el PDF con la referencia central recuperada.

Una prueba del proveedor mantiene la escritura inicial suspendida y comprueba que no hay llamadas a la API hasta completarla; verifica la secuencia Pendiente → Sincronizando → Confirmada y la referencia de devolución. Otra impide enviar un registro no almacenado. Cuatro pruebas de pantalla cubren orden de guardado/envío, error de almacenamiento, resultado incierto sin éxito falso y referencia enviada a compartir comprobante. API, almacenamiento y controles visuales se sustituyen en estas pruebas: no constituyen un recorrido Android ni lectura del cifrado real después de matar el proceso. El código cierra la ventana de envío anterior al guardado en estas dos acciones; la recuperación instrumental sigue pendiente.

`npm run check`: TypeScript y lint aprobados; 47 pruebas en 13 suites aprobadas.

Exportación posterior a estos cambios: `npx expo export --platform web --output-dir dist` genera 19 rutas y `npx expo export --platform android --output-dir dist/android-verification` genera un bundle Hermes de 3,2 MB y sus metadatos. Ambos comandos finalizaron con código 0. Un bundle Android no acredita instalación, interacción táctil, compartición nativa ni lector de pantalla.

## Recuperación del quinto envío — 4 de octubre de 2026

La cola limita a cinco los intentos de envío y conserva la consulta central al agotarlos. Antes, la pantalla ocultaba Reintentar al llegar al límite y la recuperación contaba una consulta exitosa como otro envío. La transición `recover` confirma con referencia central sin incrementar intentos; `start` impide un sexto envío. Tanto sincronización global como acción individual pueden consultar el resultado después del quinto intento. Si no hay resultado central, conservan el pendiente y muestran una instrucción para revisión o descarte razonado; no reenvían. DS-040 ofrece Comprobar resultado central en ese estado.

Una prueba realiza cinco envíos con respuestas perdidas, comprueba que las siguientes acciones solo consultan y recupera la confirmación sin un sexto envío. Otra simula un fallo al guardar la respuesta confirmada: conserva el registro Sincronizando, desmonta el proveedor, lo restaura desde ese registro y confirma mediante una sola consulta, manteniendo UUID, cuerpo e intentos. Dos pruebas de pantalla verifican la acción de consulta al llegar al límite y la presentación de error recuperable. Las pruebas usan API y almacenamiento controlados; no acreditan proceso terminado en Android ni cifrado nativo real.

Verificación: `npm run check` aprobado, 53 pruebas en 14 suites, TypeScript y lint. Los bundles documentados arriba preceden a este último ajuste.

## Nueva venta durable — 4 de octubre de 2026

Nueva venta guarda UUID, cuerpo, ruta y método antes de contactar al backend y utiliza `sendQueued` para consultar y enviar. Un cerrojo inmediato evita confirmaciones concurrentes. Una venta confirmada conserva su referencia central aunque falle la consulta del detalle; la pantalla presenta el éxito central y permite reintentar únicamente esa consulta, sin registrar otra venta. Cuatro pruebas de pantalla cubren el orden de guardado/envío, error de almacenamiento, resultado pendiente y fallo posterior al éxito con reintento de detalle. El backend y los controles visuales se sustituyen en estas pruebas.

La cola también conserva un único registro ante dos guardados concurrentes del mismo UUID y datos. Cambiar tipo, ruta, método o cuerpo con un UUID ya guardado se rechaza sin reemplazar la evidencia original. Dos pruebas del proveedor cubren ambas situaciones. Verificación: `npm run check` aprobado con 59 pruebas en 15 suites, TypeScript y lint. Compras, pagos y costos aún usan envíos directos en parte de sus flujos y requieren revisar la persistencia previa; esta evidencia no extiende la corrección de ventas a esos módulos.

## Pagos, cobros y reversos durables — 4 de octubre de 2026

Cuentas guarda el UUID, cuerpo, ruta y método antes de solicitar el envío de un pago, cobro o reverso. El proveedor consulta el resultado central y aplica los estados de recuperación. La pantalla usa un cerrojo inmediato para evitar confirmaciones concurrentes y muestra el diálogo ocupado. Si falla el guardado inicial, conserva el formulario y no envía. Un resultado pendiente o en revisión abre Sincronización sin afirmar éxito.

Al confirmar, la pantalla conserva el mensaje de éxito y limpia el importe o motivo antes de refrescar el saldo. Si falla esa consulta, informa Saldo pendiente de actualizar y bloquea nuevos movimientos hasta obtener el detalle central; Reintentar consulta de cuenta solo lee el saldo y las listas. Cinco pruebas de pantalla cubren guardado previo de pago y reverso, fallo de almacenamiento, resultado pendiente y fallo de consulta posterior a confirmación con reintento exclusivo de lectura. API, almacenamiento y controles están sustituidos en las pruebas; caja y saldos reales corresponden a la evidencia histórica del backend.

Verificación actual: `npm run check` aprobado, TypeScript, lint y 64 pruebas en 16 suites. La revisión de guardado previo continúa en compras y costos; tampoco se acredita recorrido nativo con estas pruebas.

## Liquidaciones de flete y estiba durables — 4 de octubre de 2026

Flete y estiba guardan el UUID, cuerpo, método y ruta antes de enviar liquidaciones o registros de jornadas. `sendQueued` consulta el resultado central y gestiona el envío, con un cerrojo inmediato contra confirmaciones concurrentes. Fallar el guardado impide enviar. Un resultado pendiente abre Sincronización sin presentar éxito. Después de confirmar, la pantalla limpia la selección o el formulario y conserva el mensaje de éxito; si falla la consulta de costos, bloquea nuevos registros y ofrece reintentar solo la lectura.

Seis pruebas de pantalla cubren las tres acciones, error de almacenamiento, fallo de consulta posterior al éxito y resultado incierto. Usan controles, cola y API sustituidos; no prueban salida real de caja ni interacción Android. El backend conserva sus validaciones transaccionales y referencia central. `npm run check` aprobado con 70 pruebas en 17 suites, TypeScript y lint. La revisión de persistencia previa continúa en compras; los bundles anteriores no incluyen estos últimos ajustes.

## Liquidación de compra durable — 4 de octubre de 2026

La liquidación guarda UUID, cuerpo, ruta y método antes del envío y usa la consulta central del proveedor. Una recepción local conserva la dependencia `@UUID` de su creación y abre Sincronización sin afirmar compra confirmada. Para recepción central, la pantalla conserva la confirmación aunque falle cargar el detalle y permite reintentar solo `getPurchaseSettlement`, sin exponer nuevamente el formulario de liquidación. Un cerrojo inmediato impide confirmaciones simultáneas.

Cinco pruebas del flujo con pantallas y servicios controlados cubren guardado previo, fallo de almacenamiento, resultado pendiente, fallo posterior a confirmación y compra offline con cuatro UUID distintos. El caso offline comprueba referencias de recepción en pesaje, cierre y liquidación y ausencia de un éxito central falso; no prueba la ejecución de esa secuencia en PostgreSQL ni cifrado nativo.

`npm run check` aprobado: TypeScript, lint y 75 pruebas en 18 suites. Recepción, guardado/corrección de sacos y cierre de pesaje aún tienen ramas de envío directo y requieren revisar el guardado previo y los errores de almacenamiento. Los bundles documentados anteriormente preceden a este ajuste.

## Recepción, pesaje y cierre durables — 4 de octubre de 2026

El flujo de compra guarda recepción, saco, corrección previa al cierre y cierre de pesaje antes de enviar; comparte un cerrojo inmediato para impedir acciones simultáneas. Fallar una escritura conserva los datos del formulario y libera el estado ocupado. Se retiraron ramas offline que escribían fuera del bloque de recuperación y podían dejar la pantalla ocupada ante un error de almacenamiento.

Si una operación queda pendiente, las siguientes escrituras de esa recepción se guardan en orden y permanecen pendientes, incluyendo liquidación; no se envían por delante del pesaje incierto. La recepción local mantiene la referencia `@UUID`; una recepción central mantiene su identificador y las versiones previstas de la secuencia. Rechazo o revisión abre Sincronización en lugar de continuar como si existiera confirmación. Si falla leer una respuesta ya confirmada, la operación guardada permite consultar su resultado desde Sincronización.

La suite de compra ahora verifica los cuatro guardados antes del envío. Cinco pruebas nuevas cubren fallo al guardar recepción, saco o cierre, corrección de saco con ruta/versión original y cierre/liquidación encolados detrás de un pesaje incierto sobre recepción central. El caso offline existente conserva cuatro UUID distintos. Estas pruebas sustituyen cola, API y subpantallas; no acreditan sincronización real con PostgreSQL ni persistencia nativa. `npm run check` aprobado: TypeScript, lint y 80 pruebas en 18 suites. Historial de compras y ajustes de inventario aún requieren revisar su guardado previo.

## Ajustes de inventario durables — 4 de octubre de 2026

Corrección, merma y devolución física guardan UUID, cuerpo, ruta y método antes de solicitar envío. La pantalla conserva la versión del lote y, en devolución, la venta de origen; el backend sigue siendo responsable de revalidar cantidades y vínculo comercial. Un cerrojo inmediato y diálogo ocupado bloquean confirmaciones concurrentes. Fallar el almacenamiento conserva el formulario; un resultado pendiente abre Sincronización sin presentar éxito.

Después de confirmar, se muestra el éxito central y se limpian los campos antes de refrescar el lote. Si falla esa lectura, se bloquean nuevos ajustes y se ofrece reintentar solo la consulta. La apertura inicial del lote ya no queda cargando indefinidamente ante un error: presenta un mensaje y reintento. Un acceso sin identificador también muestra estado explícito.

Siete pruebas de pantalla cubren las tres clases de movimiento, fallo de almacenamiento, resultado pendiente, fallo posterior a confirmación y error de lectura inicial con recuperación. API, cola y controles están sustituidos; no prueban stock real ni accesibilidad táctil Android. `npm run check` aprobado: TypeScript, lint y 87 pruebas en 19 suites. La revisión de guardado previo continúa en Historial de compras.

## Historial de compras durable — 4 de octubre de 2026

Anulación de recepción, compra o saco y corrección de pesaje abierto o cerrado guardan UUID, ruta, método y cuerpo antes de solicitar envío. Se añadieron a la cola los tipos `reception.void`, `reception.sack-void` y `purchase.void`, respaldados por las consultas centrales existentes. El proveedor recupera esos resultados sin repetir la mutación cuando ya están confirmados.

Historial conserva el éxito después de refrescar, corrigiendo el borrado anterior del mensaje. Un fallo de consulta posterior a confirmación bloquea nuevas acciones y ofrece reintentar exclusivamente la lectura del detalle. Fallar el guardado inicial conserva la corrección editable; un resultado pendiente abre Sincronización sin anunciar éxito. La actualización del detalle se publica después de leer todos sus componentes.

Ocho pruebas de pantalla cubren las cinco variantes de acción, almacenamiento fallido, resultado incierto y fallo posterior al éxito. Tres casos adicionales del proveedor prueban recuperación central de las anulaciones. API, cola y controles visuales se sustituyen; no acreditan efectos financieros reales ni interacción Android. `npm run check` aprobado: TypeScript, lint y 98 pruebas en 20 suites.

Exportaciones posteriores aprobadas con código 0: web en `dist/web-verification`, 19 rutas; Android en `dist/android-verification`, bundle Hermes de 3,2 MB (`entry-db7ac9414f10bc2f28d79b283b97ff23.hbc`). Se mantiene pendiente la secuencia offline completa contra API real y la instalación/interacción Android; estos bundles no sustituyen esas verificaciones.

## Orden de la cola por origen — 4 de octubre de 2026

Se corrigió un fallo de sincronización: una referencia de recepción resuelta no impedía enviar cierre o liquidación mientras un saco previo seguía pendiente. La cola identifica el origen de recepción, cuenta, venta y lote y bloquea mutaciones posteriores a una orden sin resolver del mismo origen. Las referencias locales se normalizan a las centrales confirmadas; un origen distinto conserva independencia. La consulta por UUID puede recuperar un resultado aplicado, pero la mutación espera al predecesor. Los mensajes de espera se guardan sin consumir intentos. El mismo control cubre Sincronizar, Reintentar y `sendQueued`.

Tres pruebas del proveedor real con API/almacenamiento controlados cubren la secuencia recepción → dos sacos → cierre → liquidación, sustitución de referencias, conservación de UUID y versiones, bloqueo tras HTTP 500 o 409, continuación de una venta independiente y desbloqueo al recuperar el saco sin reenviarlo. Esto no acredita efectos reales en PostgreSQL ni cifrado o reinicio Android. `npm run check` aprobado: TypeScript, lint y 101 pruebas en 20 suites. Los bundles anteriores preceden a este cambio de orden.

## Recuperación de cola cifrada sin sustitución silenciosa — 4 de octubre de 2026

El adaptador valida estructura, campos esenciales, estados, métodos, fechas, contadores, identidad de negocio/usuario e identificadores repetidos al recuperar y antes de escribir. Un contenido inválido produce error y no se convierte en lista vacía. Se retiró también el retorno vacío ante una salida de descifrado inesperada. El contrato de salida de Expo se contrastó con Context7 y con los overloads de `expo-crypto/src/aes/index.ts` de la versión instalada: la llamada sin opción de codificación devuelve bytes.

Cuando existen datos cifrados sin clave, tanto lectura como escritura rechazan la recuperación y conservan los datos; no generan una clave de sustitución. Solo una cola nueva sin datos permite crear clave. Si localStorage no está disponible, el adaptador lanza error en lugar de afirmar guardado o cola vacía. Los errores llegan al proveedor, que conserva el estado de recuperación y evita reemplazar una cola ilegible.

Seis pruebas ejercitan el adaptador real con almacenamiento web controlado y Expo Crypto simulado: pérdida de clave, estructura inválida, otra identidad, duplicados/contador negativo, ausencia de almacenamiento y escritura/lectura válidas. Verifican ausencia de escrituras o generación de clave durante errores. No prueban AES real, SecureStore ni escritura nativa: continúa pendiente validar conservación del archivo cuando una escritura Android se interrumpe. `npm run check` aprobado: TypeScript, lint y 107 pruebas en 21 suites.

## Escritura nativa protegida — 4 de octubre de 2026

El adaptador escribe el ciphertext en `.writing`, verifica sus bytes, copia el último archivo confirmado a `.previous`, mueve el temporal al destino y vuelve a verificar los bytes del destino antes de indicar éxito. No presupone que File.move sea atómico: el código instalado de Expo permite copia y eliminación como alternativa. Un fallo de guardado se propaga al proveedor y evita el envío comercial.

Si falta el destino y existe `.previous`, se lee y valida esa copia. Un primer guardado interrumpido con solo `.writing` bloquea la recuperación en lugar de indicar cola vacía. Si el destino existe pero no descifra, se conserva y se muestra el error sin sustituirlo silenciosamente por una versión anterior. La detección de datos sin clave considera los tres archivos.

Ocho pruebas nuevas del adaptador simulan escritura interrumpida, escritura parcial silenciosa, fallo de copia, pérdida del destino durante movimiento, movimiento parcial, primer guardado interrumpido, confirmación válida y ciphertext actual corrupto. Son pruebas con archivos y Crypto controlados; no acreditan AES, SecureStore ni comportamiento de un dispositivo Android real.

Validación: `npm run check` aprobado, 115 pruebas en 22 suites. Exportación web aprobada con 19 rutas y `entry-c8cd8876486849e87a3f736a71161432.js`; exportación Android aprobada con `entry-b7fd6a0f6fec87043dbc5baf1d2edbe6.hbc` (3.3 MB). Son paquetes exportados, no una instalación Android verificada. Se mantienen pendientes los recorridos nativos y la integración actual bloqueada por Device Guard.

## Login compacto y verificación visual — 4 de octubre de 2026

La ejecución de Expo Web permitió detectar a 360 × 800 que la contraseña terminaba en y=823.2, fuera de la primera vista. Se redujeron tipografía/espaciado del panel compacto y los márgenes acumulados del formulario, usando tokens existentes. Los campos aumentaron de 199.2 a 247.2 px de ancho; el botón ocupa y=662.2–714.2 y la contraseña y=586.2–638.2. Se conservaron todos los textos y la composición de escritorio. El bloque compacto queda centrado.

Se inspeccionaron y guardaron capturas de 360 × 800, 768 × 1024 y 1440 × 1024: `tmp/login-compact-2026-10-04.png`, `tmp/login-tablet-web-2026-10-04.png`, `tmp/login-desktop-web-2026-10-04.png`. A 768 × 1024, ambos campos y el botón están en la primera vista, con altura de controles de 52 px. Son viewports de navegador, no recorridos Android.

Se verificó el login real con credenciales ficticias exclusivamente locales. Sin EXPO_PUBLIC_API_URL mostró el error de configuración. Al iniciar Expo con `http://localhost:3000/api/v1`, mostró «No se pudo conectar con el servidor. Revisa la conexión e intenta nuevamente.» y volvió a habilitar el botón; no mostró éxito ni acceso al menú. No hay backend ejecutándose para validar login exitoso en esta ejecución.

Una recarga fue interrumpida por suspensión de red del navegador; se recuperó mediante una nueva pestaña del mismo navegador después de comprobar que el puerto 8087 respondía. El servidor Expo permanece en ejecución con configuración local de API. `npm run check` aprobado después del cambio visual: 115 pruebas, 22 suites, TypeScript y lint. Los bundles exportados en la sección anterior preceden únicamente a este ajuste visual.

## Integración real recuperada — 4 de octubre de 2026

La nueva ejecución autorizada inició PostgreSQL local y el log confirmó «database system is ready to accept connections». La base sigue siendo la aislada `mercado_ui_test_` indicada en `tmp/ui-db-name.txt`. No se alteró Device Guard. El helper quedó esperando EOF de stdout/stderr heredados por el hijo de larga duración; se corrigió para no esperar indefinidamente tras salir pg_ctl. Se inició Nest con la misma configuración y clave DPAPI, sin imprimirla. Nest confirmó arranque correcto en 3000. Sesión API de esta ejecución: 1282; Expo de la ejecución anterior: 44662. Los identificadores no constituyen garantía de disponibilidad futura.

En el navegador se inició sesión con el Mayorista de pruebas y apareció el menú autorizado. Reportes generó datos del 1 al 4 de octubre: compras S/250, ventas S/171.50, caja neta S/-78.50, stock un saco, costo vendido S/122.50 y margen estimado S/49. Seleccionando Canchán QA y Solo ventas, la consulta devolvió un precio de S/3.50/kg; el filtro Proveedor quedó deshabilitado con explicación. Los indicadores generales conservaron el periodo, como indica la pantalla. Se acredita la corrección previa de los parámetros numéricos de reporte contra API real.

Capturas: `tmp/reports-live-filtered-2026-10-04.png` y `tmp/reports-live-results-2026-10-04.png`, en viewport web 1280 × 800. No equivalen a ejecución Android. Figma COMPRA 1:346 continúa devolviendo límite Starter; adb y emulator consultados fuera del sandbox no listaron dispositivo ni AVD. La propuesta analítica `analytics-decision-proposal.md` está preparada para revisión del usuario y permanece sin aprobación.

## Recepción offline recuperada contra API real — 5 de octubre de 2026

Se reiniciaron Expo (8087), PostgreSQL aislado (55437) y Nest (3000) tras comprobar que los handles previos no existían y los puertos no respondían. El helper corregido inició la API sin esperar indefinidamente por EOF de pg_ctl. Se añadió `-UseRunningDatabase` para los casos en que la base permanezca activa; en esta ejecución Ctrl+C sobre el proceso agrupado también detuvo PostgreSQL, por lo que la recuperación requirió el arranque completo.

Recorrido real desde interfaz, con Mayorista de pruebas y catálogos QA:

1. Cargar proveedor, vehículo y variedad con API disponible.
2. Detener el servidor de pruebas antes de guardar la recepción. Registrar dos sacos de 52.125 y 49.875 kg, tara cero, cerrar pesaje y liquidar a S/2.50 por kg.
3. La cola mostró cinco pendientes: recepción, dos sacos, cierre y liquidación, todos con cero envíos. El pesaje local mostró 102.000 kg y promedio 51.000 kg.
4. Recargar el navegador sin servidor: apareció el acceso. No se acredita restauración autenticada offline. Tras restaurar servidor e iniciar sesión con el mismo usuario, se recuperaron los cinco pendientes mediante el adaptador cifrado real de Expo Web; no se usaron mocks.
5. Pulsar Sincronizar pendientes. Los cinco quedaron confirmados con un envío por operación, sin conflictos ni rechazos. El indicador volvió a cero pendientes y la acción de sincronizar quedó deshabilitada.
6. Historial central mostró una nueva recepción Liquidada del 5 de octubre, conductor QA offline, versión 4, dos sacos con los pesos registrados y liquidación S/255.00.
7. Inventario central mostró un lote nuevo de dos sacos y 102.000 kg, versión 1, con un único movimiento purchase_in. Sumado al lote anterior de 51 kg, quedaron tres sacos y 153 kg. Se acredita conservación y orden del recorrido probado; no se acredita una segunda transmisión deliberada, respuesta perdida ni comportamiento nativo Android.

Evidencia visual: `tmp/offline-reception-confirmed-2026-10-05.png`, `tmp/offline-purchase-detail-2026-10-05.png`, `tmp/offline-inventory-movement-2026-10-05.png`. Esta ejecución usa cifrado y almacenamiento web reales, API y PostgreSQL reales, en una base aislada. T511/T512 permanecen abiertos por sus recorridos instrumentales Android y restantes escenarios. No se amplía esta evidencia a todos los módulos offline ni al cierre completo del objetivo.

Observación de convergencia: la cola y el historial de movimientos todavía presentan algunos identificadores técnicos (purchase.settle, reception.close, purchase_in). Deben sustituirse por nombres de operación comprensibles para el usuario conservando los identificadores en el dominio y contratos.

## Etiquetas comprensibles y paquetes actualizados — 5 de octubre de 2026

Se reemplazaron los nombres técnicos de 17 tipos de sincronización por acciones en español y los seis tipos de inventario por nombres de movimiento. Las etiquetas son presentación: no cambian UUID, contratos, estados ni referencias centrales. Un tipo desconocido muestra una descripción genérica.

La interfaz conectada mostró Liquidar compra, Cerrar pesaje, Registrar pesaje de saco, Registrar recepción y Entrada por compra sobre los datos de la prueba real. Evidencia: `tmp/sync-readable-labels-2026-10-05.png`. `npm run check` aprobó TypeScript, lint y 115 pruebas en 22 suites.

Ambas exportaciones se regeneraron tras los ajustes del login y etiquetas: web 19 rutas, `entry-9b694a27b1bfec7b933be3f4b23ce44b.js` (1.4 MB), con API local de pruebas configurada; Android `entry-422271743c9122da9a074edff1c7b0ac.hbc` (3.3 MB). La exportación Android acredita empaquetado; no es APK ni instalación, y necesita una dirección de API alcanzable al construir para el dispositivo de validación.

Comprobación adicional del entorno Android fuera del sandbox: emulator -accel-check devolvió WHPX instalado y usable, plataforma android-37.0 y build-tools 36.0.0 disponibles. No existen imagen de sistema ni AVD configurado; Java no está en PATH, aunque Android Studio incluye jbr. Esto permite preparar el entorno nativo, pero no acredita un recorrido Android.
# Ajuste visual de Compra — 6 de octubre de 2026

## Reinicio offline, recuperación cifrada y reconexión — 6 de octubre

La creación de recepción conserva `receptionContext` opcional en la misma cola cifrada: nombres de proveedor, vehículo y variedades para recuperar la presentación sin descargar catálogos. Ese contexto se valida al leer/escribir y no se agrega al cuerpo comercial de la API. El proyector de dominio reconstruye altas/correcciones de sacos y cierre en orden, relacionando UUID locales y referencias parcialmente confirmadas y comprobando versiones. Eventos rechazados, en revisión, descartados o no reconstruibles bloquean la edición; una liquidación ya guardada no permite registrar otra. Las colas antiguas sin contexto de presentación conservan sus operaciones: requieren consulta central cuando no se pueden proyectar de forma fiable.

Una sesión ya validada, almacenada y todavía vigente puede recuperar el contexto local cuando la consulta central falla por indisponibilidad de transporte. El aviso identifica sesión local sin conexión. Un vencimiento local bloquea rutas; `401` invalida sesión y `403`/`500` no activan esta restauración. La cola permanece separada por usuario/negocio. No se permite un nuevo login sin conexión ni se amplía el TTL. Al sincronizar, el backend revalida identidad y autorización conforme a CL-05.

Prueba real: se prepararon catálogos y campos con la API disponible y se detuvo únicamente el servidor de la base aislada de pruebas. Se guardó la creación local `e3520b37-4e03-4c11-af83-a35ad587a79f` y un saco de 17 kg para `Conductor QA Reinicio Offline`. Después de recargar sin API se abrió “Continuar pesaje local” desde la cola: se recuperaron variedad Canchán QA, saco y versión. Se añadió un saco de 18 kg y otra recarga conservó los 2 sacos, 35 kg y promedio de 17.5 kg. Se cerró el pesaje provisional y una recarga posterior recuperó liquidación con cuatro operaciones pendientes.

Durante esa comprobación se detectó y corrigió una consulta anticipada de catálogos antes de hidratar la cola, que dejaba un error de conexión ajeno a la recuperación. La repetición con el código corregido recuperó liquidación sin ese error. Evidencia: `tmp/purchase-offline-restart-2026-10-06.png` y `tmp/purchase-offline-closed-restart-2026-10-06.png`.

Se restableció API/PostgreSQL, se recargó para revalidar sesión y se sincronizaron las cuatro operaciones: creación, dos sacos y cierre, confirmadas en un intento cada una. El backend confirmó una sola recepción `b374bb89-aeba-4bdc-885d-243b5920e8be`, estado `weighed`, versión 3, dos sacos de 17/18 kg y total de 35 kg. La cola quedó con cero pendientes y cero revisiones. Captura: `tmp/purchase-offline-restart-synced-2026-10-06.png`. No se registró liquidación ni caja durante esta prueba.

Verificación final de este corte: TypeScript, ESLint de archivos afectados y 159 pruebas en 27 suites pasaron. Las pruebas cubren cifrado/contexto, no envío de metadatos, versión/identidad, correcciones encadenadas, cierre, bloqueo de liquidación duplicada, navegación, sesión local vigente, rechazo central y vencimiento. La comprobación Android del nuevo recorrido y de sesión offline, el ensayo de duración de dos horas y los campos no enviados todavía no se acreditan por esta prueba web. La fidelidad completa a Figma continúa pendiente.

## Recuperación funcional de recepciones centrales

Se añadió continuación desde Historial de recepciones hacia `purchase-flow?receptionId=...`. La ruta recupera recepción y sacos del servidor; borrador/en pesaje permite continuar captura y pesada permite liquidar. Liquidada/anulada no se reabre, y una lectura fallida admite reintento sin creación. La cola debe estar hidratada y legible; escrituras relacionadas pendientes, en envío, rechazadas o en revisión remiten a sincronización. Las referencias locales cuyo alta ya tiene identidad central también se reconocen. Operaciones de otras recepciones no bloquean este acceso.

Se excluyen sacos anulados del resumen y de la lista activa, conservándolos para no reutilizar su secuencia durante la captura local pendiente. Este cambio cubre recuperación central; no certifica recuperación de borradores exclusivamente locales ni conservación de campos aún no enviados.

Prueba real en Expo Web con API/PostgreSQL aislados: recepción `acf23ffd-bafa-4118-88bc-0fc97a139cce`, conductor ficticio `Conductor QA Recuperacion`, inicialmente dos sacos de 11 y 12 kg, versión 2. Desde el historial se retomó el pesaje y se añadió un saco de 10 kg. Tras recargar se recuperaron 3 sacos, 33 kg y promedio de 11 kg. El cierre explícito pasó a liquidación; otra recarga recuperó directamente ese estado. La lectura central final confirmó una sola recepción con ese conductor de prueba, estado `weighed`, versión 4 y pesos 11/12/10 kg. Las capturas `tmp/purchase-recovered-weighing-2026-10-06.png` y `tmp/purchase-recovered-settlement-2026-10-06.png` documentan ambos resultados. No se confirmó liquidación, caja ni saldo durante esta prueba.

La suite completa pasó: 134 pruebas, 24 suites, incluyendo recuperación, lectura fallida, estados terminales, cola ilegible/sin hidratar, escrituras pendientes, ruta desde historial y secuencia tras anulación. TypeScript y ESLint de los archivos afectados pasaron. La validación nativa de este recorrido sigue pendiente; la convergencia de composición con Figma también continúa pendiente.

Se retomó la dirección visual con la instrucción explícita del usuario de reproducir las interfaces de Figma con alta fidelidad. COMPRA (`1:346`) conserva una composición amplia de captura a la izquierda y resultado/flete/resumen a la derecha. La interfaz por pasos actual todavía difiere de esa composición; este corte no cierra la convergencia.

Se añadió `PurchaseVisualTheme` en la ruta `purchase-flow`, con valores del contexto detallado recuperado: fondo blanco, campos `#D9D9D9`, paneles `#F4F4F4`, contorno negro y esquinas de 10 px. Los componentes existentes resuelven la paleta desde el ámbito de compra; el resto conserva su tema previo. El detalle de sacos y los textos de pesaje/liquidación consumen el mismo ámbito.

Verificación real en Expo Web, 1280 × 720: inicio de sesión con usuario ficticio de la base aislada, acceso al menú y entrada a Compra. El campo Fecha renderiza `rgb(217, 217, 217)`, radio `10px` y borde `0px`, comprobados desde el DOM. Capturas: `tmp/figma-compra-reference-2026-10-06.png` (referencia de Figma con editor) y `tmp/purchase-palette-2026-10-06.png` (aplicación). No se crearon compras ni se enviaron cambios comerciales durante esta comprobación.

El intento inicial en 8090 falló por el origen no incluido en CORS de pruebas; se utilizó 8087, el origen ya configurado. No se amplió la política CORS. TypeScript pasó con el código final y ESLint directo pasó sobre `src/ui`, `src/features/reception` y la ruta de compra; el envoltorio `expo lint` de la última ejecución no terminó y fue detenido. La suite final aprobó 117 pruebas en 23 suites, en 8 segundos. Una ejecución previa registró un tiempo de espera de 5 segundos en `native-preview.test.tsx`; se repitió la suite completa sin modificar código ni tiempos de espera y pasó. No se presenta esa intermitencia como un defecto visual resuelto.

Limitación: Figma Starter vuelve a rechazar nuevas llamadas de contexto por cuota. La skill `figma-design-to-code` exige implementar exclusivamente desde respuestas de contexto de alta fidelidad y usar los activos estáticos exactos. No se inventaron ni sustituyeron iconos. Composición, fuentes y activos completos continúan pendientes, al igual que la comparación de las otras interfaces.

## Estados accesibles verificados — 6 de octubre de 2026

Se verificaron en Expo Web las opciones excluyentes de precio, flete y pago en Compra y Venta. Cambiar una opción actualiza `aria-checked` y el árbol accesible: la anterior queda desmarcada y la nueva marcada. En Venta también se comprobó flete separado frente a incluido en el total. En logística se comprobó Descarga/Carga. En el selector de variedades, Canchán QA pasó de casilla desmarcada a marcada y volvió a desmarcada.

`AppButton` y `ChoiceDialog` conservan `accessibilityState` nativo y exponen además `aria-checked`: React Native Web 0.21 no trasladaba el estado legado al atributo web. La apariencia y los contratos comerciales permanecen iguales. Capturas: `tmp/purchase-accessible-selection-2026-10-06.png` y `tmp/choice-accessible-selection-2026-10-06.png`. No se confirmó una compra, venta ni liquidación durante estas comprobaciones. La base no tenía filas de flete/estiba pendientes para verificar la selección múltiple de esas filas; su evidencia real y TalkBack siguen pendientes en T016.

La prueba PDF en frío reprodujo un timeout con 8507 ms dentro del caso. Después de inicializar los componentes públicos de la interfaz antes de medir la interacción, el mismo caso sin caché pasó en 53 ms; la suite dedicó 7.956 s a preparación y ejecución. No se amplió el timeout, no se relajaron las aserciones y no se modificó el visor por esta causa.

La consulta de solo lectura de COMPRA mediante `use_figma` también devolvió el límite Starter. Este bloqueo se resolvió para MENU y COMPRA recuperando las respuestas completas originales de `get_design_context` del historial de esta misma tarea; los archivos recuperados y los activos locales se detallan en el corte del 7 de octubre. T218/T219 siguen abiertas hasta comprobar la convergencia visual.

## Fecha de apertura después de medianoche — 6 de octubre de 2026

La revisión encontró fechas calculadas al importar el módulo en Compra, Costos y Reportes. En una aplicación que permanece abierta durante la noche, montar una pantalla nueva conservaba el día y, en Reportes, el mes anteriores. Se trasladó el cálculo al inicio de cada instancia de pantalla, usando la fecha local del dispositivo. La fecha ingresada en una instancia abierta y la fecha central de una recepción recuperada se conservan; no se actualizan silenciosamente al avanzar el reloj.

La regresión de Compra falló antes del cambio: al simular apertura el 30 de septiembre de 2030 se recibió el 6 de octubre de 2026, la fecha de importación real. Las pruebas ahora simulan apertura antes/después de medianoche, cambio de mes, fecha/periodo editados y nuevo montaje sin enviar operaciones. La suite incluye casos específicos de Compra, Costos y Reportes. Esta corrección no altera contratos, reglas de cálculo ni composición visual y no certifica la comparación Figma. Los paquetes `*-export-accessibility-2026-10-06` son anteriores a este ajuste de fechas; no representan este último código.

## Primer corte analítico conectado — 6 de octubre de 2026

Tras la aprobación humana íntegra de `analytics-decision-proposal.md`, se implementó `AnalyticsModule` y `GET /api/v1/analytics/series`, la ruta protegida `/analytics` y la tarjeta del menú exclusiva del Mayorista. El contrato distingue compras/ventas, semana de lunes a domingo en America/Lima, variedad, cantidades, peso, precio pactado equivalente por kg, operaciones distintas y referencias de compensaciones. Usa centavos/gramos enteros; las devoluciones comerciales reducen bruto, peso y sacos sin contarse como ventas nuevas. El precio pactado corresponde a mercadería antes de descuentos/flete, y no se identifica como margen ni precio neto.

Prueba real de solo lectura contra API/PostgreSQL: periodo 2026-09-01 a 2026-10-06, Canchán QA. Semana 2026-09-28: una compra, 2 sacos/100 kg/S/250, precio S/2.5000/kg; una venta, 1 saco/49 kg/S/171.50, precio S/3.5000/kg. Semana 2026-10-05: una compra, 2 sacos/102 kg/S/255, precio S/2.5000/kg; identificada como parcial. No se crearon ni liquidaron operaciones comerciales en esta comprobación.

Expo Web consultó el periodo y la variedad desde controles visibles, mostró cantidades/precios y retiró el resultado anterior al modificar Desde. Captura `tmp/analytics-live-series-2026-10-06.png`. La captura corresponde al primer corte, antes del ajuste menor de singular/plural y listado detallado de exclusiones; no sustituye validación del código posterior ni comparación con Figma.

API real: sin sesión 401; periodo invertido 422; fecha imposible 400; filtro `buyerId` no admitido 400; intento de agregar `businessId` 400; variedad no existente devuelve cero puntos. La revisión automática rechazó preparar un Encargado/delegación persistentes de prueba. Se usó una prueba aislada con el controlador y `RolesGuard` reales, identidad y auditoría controladas: Encargado denegado sin llamar al servicio y Mayorista admitido usando su negocio central. No se eludió el rechazo ni se creó una delegación por otro mecanismo. La denegación HTTP con un Encargado de la base y la prueba entre dos negocios reales siguen pendientes; no se presentan estas pruebas aisladas como esos recorridos.

`npm run check` aprobó API: tipos, lint, 91 pruebas/33 suites y compilación; frontend: tipos, lint, 165 pruebas/29 suites. Tres nuevas pruebas de pantalla cubren filtros efectivos, descarte de respuesta tardía y error/reintento/vacío. Cuatro pruebas de agregación cubren ponderación, referencias, conteo distinto, separación de variedad/tipo, semanas parciales, exclusiones y valores superiores a la precisión de Number. No se muestran precios predictivos ni se declara completada T708–T710 por implementar descriptiva.

La fuente documental y el DOCX se regeneraron con la política aprobada. El renderizador empaquetado falló porque no encontró LibreOffice en Windows; también informó permisos al limpiar sus directorios temporales del sandbox. No se modificó el renderizador ni se instaló software. El contenido está sincronizado, pero el documento no tiene revisión visual de esta versión y no se declara listo para entrega documental final. La convergencia visual Figma y Android permanece pendiente.

Exportaciones posteriores al primer corte analítico: web `tmp/web-export-analytics-2026-10-06/_expo/static/js/web/entry-41477e3e2f0cae15cccb666b7a56d30c.js`, 20 rutas; Android `tmp/android-export-analytics-2026-10-06/_expo/static/js/android/entry-719229b458d0c36215dea86050a8c886.hbc`. Incluyen el código final del tablero descriptivo, pluralización y exclusiones detalladas. Son paquetes locales de pruebas, no publicación ni certificación de recorridos Android o de igualdad con Figma.

### Corte del 7 de octubre: suficiencia analítica y pesaje de tablet

La aprobación humana de la propuesta analítica completa mantiene los criterios registrados en `analytics-decision-proposal.md`. La nueva consulta `/analytics/readiness` reconstruye 26 semanas completas anteriores al corte por negocio y variedad; cuenta ventas válidas distintas, sin convertir líneas en ventas ni rellenar precios faltantes. La API y la pantalla exponen criterios pendientes de evaluación, cobertura y revisión. La suficiencia histórica no habilita por sí sola una predicción: T708 sigue parcial y la implementación de modelo, evaluación y publicación permanece pendiente.

La comprobación real previa, con corte 2026-10-06 y Canchán QA, devolvió ventana 2026-04-06–2026-10-04, una venta válida y cero de 26 semanas suficientes. Las semanas sin datos no muestran precios inventados. Sin sesión: 401; fecha imposible: 400; corte futuro: 422; variedad ajena/no existente: 404. Evidencia: `tmp/analytics-readiness-live-2026-10-06.png`; expiración separada en `tmp/web-expiry-analytics-2026-10-06.png`. El check de API posterior a este corte aprobó 98 pruebas en 35 suites, tipos, lint y compilación. Las exportaciones anteriores no contienen este corte.

Se recuperaron de las respuestas originales de herramientas de esta misma tarea los contextos completos de MENU (1:131) y COMPRA (1:346), conservados en `tmp/figma-recovered-context/context-1.tsx.txt` y `context-2.tsx.txt`. No se volvió a consultar Figma ni se usó la captura como activo de implementación. Los once activos originales se descargaron de las URLs proporcionadas, sin cambiar bytes, y su tamaño, dimensiones y SHA-256 se registraron en `mercado-app/assets/figma/original/manifest.json`. El límite remoto ya no bloquea estos dos contextos; otros contextos y la convergencia final siguen pendientes.

`TabletWeighingWorkspace` implementa un corte del pesaje a partir de 1100 px: captura y lista virtualizada a la izquierda; resultado, ubicación de flete y resumen a la derecha. Usa Inter Regular y Bentham Regular, y el SVG original `compra/imgGroup.svg` dentro del botón de 50 × 50, conservando 41.6667 × 41.6667 de dimensión intrínseca. Flete y precio se mantienen en la liquidación posterior al cierre explícito; no se inventaron precios individuales por variedad ni importes confirmados. Se reutilizan las acciones actuales de registrar/corregir saco y pedir confirmación del cierre. Las dependencias de fuentes se fijaron por versión y se instalaron sin scripts de terceros.

En el navegador se abrió la recepción borrador existente `8758e4d6-dfee-4451-86de-fe160f550e8f`, sin crear otra recepción, agregar sacos ni liquidar una compra. A 1440 × 1024 se confirmó el título Inter de 64 px, el activo visible de 41.6625 × 41.6625 px dentro del botón de 50 × 50, y el bloqueo de cierre sin sacos. Introducir 51 en peso habilitó Agregar saco sin enviarlo. Al cambiar a 390 × 844 se conservó el valor y apareció el flujo compacto. Evidencia de tablet: `tmp/tablet-weighing-2026-10-07.png`. Esta captura antecede al ajuste de desplazamiento independiente del panel derecho para alturas menores.

El check completo del frontend aprobó tipos, lint y 172 pruebas en 30 suites; cuatro nuevas pruebas verifican identidad del saco corregido, solicitud de confirmación de cierre, bloqueo sin sacos/durante escritura y bloqueo de agregado sin variedad. La apariencia de COMPRA todavía no converge: faltan encabezado de cuenta/proveedor/fecha, controles completos de liquidación, activos restantes y navegación inferior. T218/T219 no se cierran. La prueba nativa del nuevo corte y el QA visual del DOCX siguen pendientes.

### Encabezado, totales por variedad y navegación de COMPRA

El corte posterior del 7 de octubre agrega `PurchaseReferenceHeader`, conectado a usuario, proveedor, celular y fecha conservados de la recepción. La lectura del borrador existente mostró Proveedor QA, celular ficticio 999111222 y fecha original 2026-10-05, sin reemplazarla por la fecha de apertura. Los resultados por variedad usan los mismos sacos vigentes y cálculo de dominio que el total del cargamento; también se presentan en el flujo compacto.

`PurchaseReferenceNavigation` usa los tres SVG originales locales. En el navegador a 1440 × 1024 se verificaron sus cajas contra las coordenadas de la respuesta de Figma: flecha izquierda x393/y929, 93 × 93; casa x677/y935, 72 × 72; flecha derecha x944/y919, 103 × 103. El contenedor de la flecha derecha conserva rotate-180 y escala Y negativa; su transformación efectiva es `matrix(-1, 0, 0, 1, 0, 0)`. Los botones tienen etiquetas accesibles y se deshabilitan durante escritura; continuar sin sacos permanece bloqueado.

Salir al menú con un peso escrito de 51 mostró confirmación; cancelar mantuvo el valor sin encolar ni enviar el saco. Dos regresiones nuevas cubren este comportamiento y la separación de variedades con exclusión de sacos anulados y recuperación de proveedor/fecha. `npm run check` aprobó 174 pruebas/30 suites, tipos y lint. Tras corregir el crecimiento propio del ScrollView derecho, tipos/lint y 25 pruebas de los dos archivos de pesaje/liquidación volvieron a pasar. La corrección surgió de inspección visual, no de una prueba que reproduzca estilos.

Siguen pendientes el componente User conectado (SDS es DOM y requiere adaptación nativa documentada), composición completa de liquidación, todos los activos de esa fase y convergencia Android. La barra de sincronización permanece visible y constituye una diferencia con la referencia. No se declara igualdad completa con Figma ni se cierra T218. No se instaló SDS ni se ejecutó código externo: se revisaron su icono, estilos y licencia en el commit oficial `05525f75192a3aa5d5690c5e41277ebd19d2efe1` para la adaptación pendiente.

Captura final de este corte, después de corregir el crecimiento del panel: `tmp/tablet-weighing-header-navigation-2026-10-07.png`. El resultado se renderizó en x810.825/y206.600, con ancho interior 581.975 y alto 276.800; estos valores todavía difieren del panel original y no se presentan como convergencia. Las dimensiones y posiciones exactas verificadas corresponden exclusivamente a los tres activos de navegación mencionados arriba. La recepción borrador siguió con cero sacos y no hubo mutaciones comerciales en esta inspección.

### Liquidación de tablet: composición y cálculo provisional

`TabletSettlementWorkspace` mantiene el encabezado y la navegación de COMPRA, muestra el pesaje cerrado en lista virtualizada a la izquierda y Resultado, Flete y Resumen a la derecha. Edita precio global por recepción, bases por kilo/saco, flete, adelantos y descuentos. Las condiciones de contado/crédito y cuotas se extraen a `PaymentTermsFields`, compartido con teléfono y presentado en un diálogo desplazable de tablet. La lectura no habilita corrección de sacos en esta fase.

El dominio `purchase-preview.ts` usa BigInt para centavos/milésimas de kilo, excluye anulados y agrega antes de redondear half-up. Replica la política del backend sin sumar importes redondeados por saco/variedad. Admite los límites del DTO de tarifas y deducciones (9 000 000 000 000 centavos por dato); conserva resultados exactos superiores a Number. No reemplaza los importes confirmados por el servidor. Un precio ausente deja importes pendientes; importes/pesos inválidos o deducciones excesivas retiran la vista previa previa y bloquean el envío. Crédito exige fechas calendario existentes y suma exacta del líquido. La salida con términos editados muestra confirmación y cancelar mantiene el borrador en memoria.

`npm run check` aprobó 185 pruebas en 32 suites, tipos y lint. Seis pruebas de dominio cubren medio centavo/agregación, bases independientes, anulados, pesos inválidos, precisión alta, importes pendientes/excesivos y cuotas. Tres pruebas de composición verifican recálculo sin envío, retirada de importe antiguo y formulario de crédito compartido. Dos regresiones de flujo verifican crédito y salida; los recorridos anteriores de cola, respuesta perdida e identidad de recepción siguen pasando. La confirmación previa incluye importes y condición de pago concretos; una aserción posterior sobre ese mensaje pasó en las 23 pruebas del archivo de flujo.

Prueba web con recepción existente `b374bb89-aeba-4bdc-885d-243b5920e8be`, estado pesada/versión 3, dos sacos de 17 y 18 kg: precio S/2.50 por kg produjo bruto provisional S/87.50; flete S/0.50 por saco produjo S/1.00; adelanto S/5 y descuento S/1 produjeron líquido S/80.50. Se editó una cuota de S/80.50 para 2026-11-01, se abrió la confirmación previa y se canceló. Se conservaron los términos en la interfaz; no se pulsó Liquidar compra ni se creó una compra. Captura `tmp/tablet-settlement-preview-2026-10-07.png`. Esa captura verifica controles y cálculo, no el texto posterior del mensaje de confirmación mejorado ni la geometría completa de Figma.

Exportación Android local para emulador: `tmp/android-export-purchase-tablet-emulator-2026-10-07/_expo/static/js/android/entry-8be29377d78f90f4e495233c1e634b27.hbc`; 34 activos, incluidos los cuatro SVG consumidos de COMPRA e Inter/Bentham/Bevan. Se inspeccionó el binario para confirmar la dirección pública local de API 10.0.2.2:3000/api/v1. Exportación web: `tmp/web-export-purchase-tablet-2026-10-07/_expo/static/js/web/entry-87e0ab248b34041cf30fcdcc6735fd8b.js`, 20 rutas; la dirección incorporada comprobada es localhost:3000/api/v1. Son paquetes locales de verificación, no despliegue ni prueba de ejecución nativa. El archivo sin sufijo emulator tiene el mismo hash Android y no constituye evidencia adicional.

T218/T219 siguen abiertas: composición funcional no significa igualdad visual. Quedan el User conectado, botones/activos restantes de la referencia, ajuste de geometrías y comprobación táctil/accesible en Android. La API no se modificó en este corte y sus 98 pruebas/35 suites corresponden al corte anterior.

Al pasar la misma recepción de 1440 × 1024 a 390 × 844, se conservaron precio 2.50, flete por saco 0.50, adelanto 5, descuento 1 y crédito con la cuota de 80.50 para 2026-11-01. El flujo compacto mostró los controles compartidos con sus estados de selección correctos. Esta comprobación confirma conservación en memoria al cambiar de composición; no prueba persistencia del borrador sin enviar tras reiniciar.

### MENU original y retiro de navegación de inventario

`ReferenceHomeScreen` reemplaza las tarjetas genéricas de Compra por ANOTE, VER COMPRAS, CARROS y DEUDAS, con Inter Regular/Raleway ExtraBold y los PNG/SVG originales descargados. El espacio sin nombre se adapta a Más operaciones conforme al SDD; Venta y módulos complementarios reutilizan ModuleCard. El menú cambia a dos/una columnas en tamaños menores y conserva cierre, vacío y listas autorizadas. El módulo Inventario está retirado para ambos roles, incluso ante metadatos viejos; ambas URLs históricas redirigen al inicio. Los mensajes de compra ya no anuncian creación/activación de lotes. No se modificaron ni borraron datos/migraciones históricos.

Figma permitió la captura de MENU, conservada en `tmp/figma-menu-reference-2026-10-07.png`, 1440 × 1024. `get_design_context` y metadata del User siguen rechazados por el límite Starter. La composición se basa en el contexto completo recuperado, no en la captura como activo. En web se midieron ANOTE 175 × 175 en x321/y430.6 y libro 24 × 24 en x303/y369.6; el desplazamiento vertical respecto del frame incluye la barra global de sincronización. Capturas del corte: `tmp/menu-reference-implemented-2026-10-07.png` y, después de corregir `aria-selected` y retirar inventario, `tmp/menu-no-inventory-2026-10-07.png`. El componente User conectado todavía falta; no se declara convergencia completa.

El DOM real devolvió `aria-selected=true` para Compra y el árbol accesible la anunció seleccionada. Más operaciones mostró ocho módulos vigentes, sin Inventario. Se probaron `/inventory` y `/inventory-adjustment`: ambos terminaron en `/home`, sin abrir pantallas de existencias. La retirada de accesos no acredita por sí sola transacciones de compras/ventas sin stock; consultar `plan-convergencia-sin-inventario.md`.

### Reportes financieros sin inventario — 7 de octubre

Resumen comercial deja de consultar `inventory_lots` y proyecta compras, ventas, caja, cuentas y costos. Alertas solo consulta vencimientos financieros; el DTO/client ya no admiten umbral de bajo stock. El endpoint histórico de margen devuelve 410 sin ejecutar la valoración por lote. Se preserva código/datos históricos y no se crea una fórmula nueva. El frontend retira Stock, Stock bajo, costo vendido y margen y deja de solicitar el endpoint retirado. Los filtros invalidan resultados desde sus eventos de edición y las respuestas tardías se descartan; el desmontaje también invalida consultas. El formateador compartido conserva centavos mediante BigInt, incluidos importes confirmados fuera de la precisión de Number y caja negativa.

Verificación automatizada: frontend `npm run check`, 194 pruebas/34 suites, tipos y lint. Backend: tipos, lint, 102 pruebas/36 suites y `npm run build`. Vitest falló inicialmente al escribir la carpeta temporal protegida del sandbox; la opción documentada `--experimental.fsModuleCache --experimental.fsModuleCachePath ./tmp/vitest-cache` permitió ejecutar toda la suite dentro del proyecto y sin ampliar permisos. La documentación de React respaldó mover la invalidación a eventos para corregir el error de lint de setters dentro de un efecto. El reinicio anterior de Metro no se ejecutó por fallo de revisión automática debido al límite de uso; posteriores solicitudes por la vía normal fueron aprobadas y los servicios se iniciaron, sin eludir la revisión.

API/PostgreSQL reales de la base aislada: resumen sin propiedad `inventory`; alertas sin `lowStockAlerts`; margen 410; `maxAvailableSacks` antiguo 400; resumen sin sesión 401. Evidencia sin tokens/contraseñas: `tmp/reports-without-inventory-api-2026-10-07.json`. No se registraron compras, ventas, pagos ni devoluciones durante esa lectura.

Web generó octubre 2026 hasta el día 7: compras S/505.00, ventas S/171.50, caja neta S/-333.50, cuentas S/0.00 y tres precios históricos. No aparecen indicadores de stock ni margen. Al editar Desde a 2026-09-01 se retiraron métricas/precios anteriores sin mostrarlos bajo el periodo cambiado. Captura a 1440 × 1024: `tmp/reports-without-inventory-web-2026-10-07.png`. Estos datos corresponden a operaciones QA existentes, no a cantidades estimadas o saldos de mercadería.

El corte no acredita SI-03–SI-06 ni SI-08: compra/venta/devoluciones todavía contienen dependencias históricas de inventario y requieren adaptación; precios/analítica todavía deben consumir las nuevas líneas por variedad. Las pruebas conservadas de la línea base histórica no se presentan como prueba de venta independiente sin disponibilidad. La convergencia visual completa y Android siguen pendientes.


## Venta sin inventario: offline, recarga y salida protegida — 7 de octubre de 2026

Fuente y límites: `verificacion-venta-offline-2026-10-07.md`. Navegador real verificó cancelación de salida con conservación del campo Conductor, guardado cifrado sin API, recarga con pendiente conservado y sincronización al restablecer servicio. API/PostgreSQL verificaron UUID, 3 sacos/150 kg a S/1.55, S/232.50 y un cobro/auditoría, sin stock. Capturas `tmp/sale-offline-restarted-pending-2026-10-07.png` y `tmp/sale-offline-restarted-confirmed-2026-10-07.png`. Suite frontend actual: tipos/lint y 221 pruebas en 35 suites. Android, Figma, catálogos offline y demás validaciones siguen pendientes. La API quedó restaurada; las exportaciones anteriores no incluyen estos cambios.


## MENU: alineación de textos y cabecera móvil — 7 de octubre de 2026

`verificacion-menu-textos-2026-10-07.md` registra mediciones reales: Usuario/Compra/Venta coinciden con coordenadas del contexto completo a 1440×1024, descontando el indicador global. Los seis usos de activos de MENU cargan y conservan geometría. A 360×800 se corrigió nombre de usuario comprimido a altura cero: ahora 28.8 px, cabecera automática 116.8 px y sin desbordamiento horizontal. Tipos/lint y cinco pruebas del menú pasan. Capturas finales `tmp/menu-text-convergence-2026-10-07.png` y `tmp/menu-text-convergence-compact-2026-10-07.png`. User conectado y convergencia completa/Android siguen pendientes por sus evidencias faltantes.


## Historial de compras HU11 — 8 de octubre de 2026

API/PostgreSQL y navegador verifican filtros por receivedOn/proveedor/estado, paginación, proveedor desactivado y conservación de página al volver del detalle. A 360×800 no hay desbordamiento horizontal. Tipos/lint y 241 pruebas frontend en 38 suites pasan sin caché; backend 135/41 y once E2E PostgreSQL. Evidencia y límites: `verificacion-historial-compras-2026-10-08.md`. Figma/Android y terminación completa permanecen pendientes.


## Catálogos offline tras reinicio — 8 de octubre de 2026

Copias cifradas de compra/venta recuperadas con API detenida y sesión vigente; venta ficticia de un saco/10 kg/S/ 25 guardada, recargada y sincronizada una vez. PostgreSQL conserva cobro/auditoría únicos, anulación compensatoria y caja neta cero sin stock. Tipos/lint y 264 pruebas en 40 suites pasan. Evidencia y límites: `verificacion-catalogos-offline-2026-10-08.md`. Revalidación central devolvió al menú: el contexto de navegación sigue pendiente; no se presenta como conservación de la cola. Android/Figma y ensayo de dos horas permanecen abiertos.


## Revalidación sin perder navegación — 8 de octubre de 2026

API pausada/restaurada: sesión local con cero pendientes permite revalidar y conserva /sync-queue; al recuperar conexión muestra Datos sincronizados sin devolver al menú. Se verifica descarte de respuestas tras logout, invalidación, caducidad y 401 concurrente, más retirada posterior a escritura en curso. Tipos/lint y 280 pruebas en 41 suites pasan. Evidencia: `verificacion-revalidacion-sesion-2026-10-08.md`. El defecto de navegación anotado en el corte anterior queda corregido en web, con validación Android pendiente.
