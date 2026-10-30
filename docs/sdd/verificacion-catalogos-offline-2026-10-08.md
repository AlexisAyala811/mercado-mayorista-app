# Catálogos cifrados para captura tras reinicio

Corte HU05/005 del 8 de octubre de 2026, alineado con el alcance sin inventario. Este registro no declara terminados el frontend completo, la convergencia Figma ni los ensayos nativos.

## Implementación

Compra y venta consultan todas las páginas de sus catálogos, validan la copia y guardan solamente los campos que usan sus formularios. Se conservan versión, tipo, usuario, negocio y fecha de consulta; no se guardan tokens ni credenciales. Una consulta parcial fallida no sustituye la copia anterior. Cada tipo tiene su propio espacio de cifrado y clave; la cola conserva exactamente sus nombres y formato anteriores.

El almacenamiento compartido conserva AES, SecureStore y archivos verificados con copia previa en Android, y el adaptador local cifrado existente en web. Serializa lecturas/escrituras por usuario/negocio/espacio para evitar que dos primeros guardados generen claves incompatibles. Un archivo o clave dañados no se borran silenciosamente ni se tratan como copia vacía.

La recuperación se permite solo por ApiUnavailableError y con sesión vigente, revalidada antes/después de las esperas. No sustituye respuestas 401, 403, 422 ni 500 por permisos/datos locales. La captura de compra/venta conserva los roles aprobados de Mayorista y Encargado con reemplazo vigente; el backend revalida esa autorización. El historial y los módulos financieros/analíticos siguen con sus guards exclusivos. La restricción inicial de la copia de venta al Mayorista fue incorrecta y se corrigió al contrastar 001/RF02 y la ruta sale-flow, sin conceder permisos nuevos. La pantalla muestra la fecha y origen de la copia y advierte de la validación central al sincronizar. Si falla guardar una consulta central, permite usar esos datos actuales pero advierte que no quedaron disponibles para reinicio offline. Compra ofrece reintento cuando no hay catálogos recuperables.

## Evidencia

- Tipos y lint aprobados; 264 pruebas frontend en 40 suites, incluida la regresión completa posterior al último ajuste.
- Diecinueve comprobaciones de servicio/paginación: copia íntegra y mínima, recuperación ante conexión fallida, rechazo central, guardado fallido, identidad/versión/corrupción, copia vacía frente a ausencia, vencimiento antes/después de consulta, permiso de venta y página posterior a cien. El fallo de descifrado presenta un mensaje recuperable sin exponer rutas internas.
- Adaptadores de almacenamiento: compatibilidad de la cola histórica, archivos/clave independientes para catálogos, generación única de clave bajo escrituras concurrentes, aislamiento de usuario y conservación ante pérdida de clave. Pruebas de archivos nativos simulan guardado/movimiento incompleto y conservan la copia previa. Estas pruebas no acreditan un dispositivo físico.
- Navegador real: se consultaron primero catálogos de venta y compra con la API disponible. Se detuvo exclusivamente la API local verificada del proyecto y se recargó Nueva recepción. La pantalla mostró sesión local y fecha de copia; el selector conservó Proveedor QA. Nueva venta recuperó Comprador QA y Canchán QA sin API y permitió registrar una operación ficticia de un saco, 10 kg y S/ 2.50/kg. La operación quedó pendiente con cero intentos y siguió pendiente tras recargar.
- Tras restablecer la API, la sincronización confirmó la venta y revalidó la sesión: el indicador mostró cero pendientes y el navegador volvió al menú. Ese regreso al menú es una limitación de navegación pendiente, no conservación del contexto de la cola.
- API/PostgreSQL de la base local aislada: venta `bf693f0e-844f-4ef5-8532-05f8631936ff`, UUID `7631591d-79d1-439f-bbc2-99324a4091f6`, total 2500 céntimos. Consulta central y repetición del mismo POST conservan una venta, un cobro y una auditoría de confirmación, sin inventario. Su anulación ficticia usa UUID `4dc33b1b-9de6-4409-998a-bc8c15a931a2`, conserva un reverso y deja dos movimientos de caja con saldo neto cero. No se borraron registros ni se afectaron operaciones reales.

Artefactos: `tmp/offline-reception-catalog-2026-10-08.png`, `tmp/offline-catalog-sale-pending-2026-10-08.png`, `tmp/offline-catalog-sale-api-2026-10-08.json`. El script `mercado-api/test/verify-offline-catalog-sale-ui.mjs` restringe la base de pruebas, consulta en READ ONLY para verificar efectos y conserva el UUID de reverso antes de enviarlo. Los tokens y la clave PostgreSQL se suministran únicamente en memoria.

## Pendientes

Mantener la pantalla actual durante revalidación tras sincronizar, sin debilitar el bloqueo de sesión vencida/revocada. Verificar también la revocación durante solicitudes en curso. Los borradores de venta sin confirmar, detalle completo de cola, otros recorridos offline, ensayo real de dos horas y pruebas Android permanecen abiertos. La recuperación real de catálogos de compra no sustituye todos los pasos de nueva recepción/pesaje/liquidación offline. No se declara igualdad con Figma para pantallas cuyo contexto completo sigue inaccesible.

Los paquetes de pruebas Android/web de este corte se registran después de verificar su exportación; un bundle Android no constituye APK instalado ni prueba de funcionamiento en dispositivo.


## Exportaciones verificadas

Expo export terminó correctamente para Android (Hermes) y web (20 rutas). Documentación de opciones consultada mediante Context7 y comprobada contra https://docs.expo.dev/more/expo-cli. Son artefactos de pruebas locales, no una publicación de producción ni un APK instalado. La dirección Android corresponde al emulador del host; no acredita conectividad de un dispositivo físico.

- `tmp/android-export-catalogs-2026-10-08/_expo/static/js/android/entry-d509713efddb9faad7c667c87ffa6238.hbc`: 3405260 bytes; SHA-256 `0248a3e688ce35e6b93384d2f47521ee83e84f2f210a74619890ed16e19858a2`.
- `tmp/web-export-catalogs-2026-10-08/_expo/static/js/web/entry-ef1428aa88518187687cd0ec05283360.js`: 1527907 bytes; SHA-256 `21c179138a7403e7647d5686e326d7102d051689b211c47e9a81d18756735941`.

Se verificaron los archivos de las rutas de compra, venta, historial y cola, y metadata Android. Registro reproducible: `tmp/frontend-export-catalogs-2026-10-08.json`. Estas exportaciones incluyen historiales filtrados y catálogos cifrados del código actual; las exportaciones de fechas anteriores son evidencia histórica.


## Corrección de RF02 durante verificación Android

La ruta sale-flow y la matriz aprobada permiten captura al Encargado durante reemplazo autorizado. La copia cifrada debe respetar esa captura, separada por su usuario; no imponer rol Mayorista adicional. Se añadieron pruebas de consulta/recuperación del Encargado y denegación de rol desconocido. La vigencia y rechazo central permanecen obligatorios, y no se crearon cuentas ni delegaciones persistentes para esta corrección.
Verificación posterior a la corrección de RF02: frontend con tipos y lint sin errores y 283 pruebas aprobadas en 41 suites. El límite del reemplazo comunicado por el backend se corrigió y se verificó separadamente en `docs/sdd/verificacion-vencimiento-reemplazo-2026-10-08.md`; no se declara probado todavía el recorrido Android completo del Encargado.
