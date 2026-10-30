# Proveedores dentro de Compra: Android y persistencia

Fuente: decisión humana de referencias dentro de operaciones, CL-13 y tareas 002/004. Prueba sobre la app actual en Mercado_Tablet_API36, 1280×800, API y PostgreSQL de QA existentes. El archivo `tmp/provider-native-evidence-20261016.json` reúne verificaciones y huellas; no es una declaración de cierre global.

## Recorrido funcional observado

Compra ofrece «Registrar o editar proveedores» y «Registrar o editar variedades» dentro de su formulario. El editor muestra una sola lista y «Volver al formulario», sin exponer Catálogo/Datos maestros como sección del aplicativo.

Se escribió el proveedor ficticio «Proveedor borrador Android» sin guardar. Volver abrió el aviso de descarte; Cancelar mantuvo el texto. Después de descartar únicamente ese borrador, entrar/salir de Variedades conservó el conductor «QA Android conservar conductor» en Compra. Capturas y árboles: `android-provider-discard-*`, `android-purchase-varieties-editor-20261016.json` y `android-purchase-reference-parent-preserved-20261016.*`, en tmp.

En un recorrido posterior se creó **una sola vez** «Proveedor Android QA 1610 entrada», teléfono ficticio 999000161: API POST 201 y confirmación visible. ID `b7745b91-4a6c-410b-a020-d260b6d69154`. La sesión venció antes de editarlo; se renovó el acceso sin reenviar el alta. Editar el registro existente, vaciar teléfono y Guardar produjo PATCH 200. La ficha mostró «Sin teléfono»; reabrir después de la lectura central conservó el campo vacío. Al volver a Compra, el proveedor apareció en el selector y se seleccionó con teléfono opcional vacío. No se pulsó «Continuar al pesaje» ni se confirmó una compra, venta o devolución.

La conservación del conductor corresponde al primer recorrido de cancelación/Variedades. No se atribuye al recorrido posterior interrumpido por vencimiento de sesión.

## Confirmación en PostgreSQL

`mercado-api/test/verify-provider-contextual-android-state.mjs` usa transacción REPEATABLE READ y READ ONLY. Evidencia `tmp/provider-contextual-android-pg-20261016.json`, código 0 en `tmp/provider-contextual-android-pg-check-20261016-exit.txt`:

- Un único proveedor con el nombre/ID observados, activo y teléfono SQL **null**.
- Huellas de las **14 tablas comerciales** iguales a la base previa, conservando la exclusión explícita de la recepción borrador del recorrido anterior `0261c947-7813-4745-bf93-9d080be48b14`. No se sustituyó la base para hacer pasar el chequeo; ese borrador sigue draft, versión 0.
- Como en el verificador previo, la comparación elimina de la representación los campos descriptivos posteriores `quality_id`, `quality_name`, `origin_id` y `origin_name` para compararla con esa base. Acredita conservación de las columnas comerciales preexistentes; no prueba inmutabilidad de esos cuatro campos nuevos.
- Sin una nueva recepción ni efectos financieros; devolución reservada al usuario sin reenvío.

El wrapper conserva credenciales DPAPI solo en el proceso, restringe nombre/host/puerto de QA e inicia PostgreSQL únicamente tras comprobar ausencia de servidor/puerto. Cerró solamente la instancia que inició. Lint del verificador con oxlint aprobado. Este recorrido precede al ajuste posterior de foco, documentado en `verificacion-foco-referencias-2026-10-16.md`; sus capturas no acreditan el ajuste nuevo.

## Entrada de texto y fallos del entorno

Con `testIme:false`, la escritura en el modal mediante fill y foco explícito produjo recargas del cliente de desarrollo. Una observación posterior mostró `[runtime not ready]: TypeError: Cannot read property 'EventEmitter' of undefined`; la pila se conserva en `tmp/android-provider-second-fill-observation-20261016.json`. El código instalado de Expo contiene acceso a `globalThis.expo.EventEmitter`, pero no se ha simbolicado la pila ni probado la causa. No se reparó modificando dependencias o ignorando la verificación de texto.

El SDK también detectó un ANR de System UI después del arranque. La pulsación ordinaria quedó bloqueada; la API oficial de alertas informó que `dismiss` activó **Close app** en ese aviso de System UI, y luego confirmó ausencia de alerta. No se afirma haber pulsado Wait. Posteriormente la app cargó el login con mensaje de sesión vencida. Inicios de sesión QA respondieron 201 y consulta de identidad 200; credenciales parametrizadas en las grabaciones.

La comparación con el **IME de pruebas oficial** `com.callstack.agentdevice.imehelper` permitió escribir el mismo texto sin recargar y completar los recorridos descritos. Esto acredita interacción funcional con ese backend de entrada, **no teclado de software normal**. El guion diagnóstico `tmp/android-operation-reference-input-20261016.ad` fue publicado con 15 acciones y variables de credenciales. El guion del recorrido con IME de pruebas no llegó a publicarse antes de que el entorno se interrumpiera; las capturas/árboles y solicitudes API sí quedaron guardados. No se afirma reproducción de guiones.

Referencias consultadas con Context7: [entrada y alertas del SDK](https://github.com/callstack/agent-device/blob/main/website/docs/docs/commands.md), [IME de pruebas oficial](https://github.com/callstack/agent-device/blob/main/android/ime-helper/README.md), [módulos nativos de Expo](https://github.com/expo/expo/blob/main/packages/expo-modules-core/src/requireNativeModule.ts). No se usó una superficie de navegador para eludir su restricción previa.

## Restauración del método de entrada

Al retomar, procesos de QA y emulador estaban detenidos. Se arrancó el AVD existente para comprobar su configuración; el SDK no conservaba sesiones activas y el IME de pruebas seguía seleccionado. Se abrió Ajustes desde el inventario de apps del sistema usando el SDK, se navegó a System → Keyboard → On-screen keyboard y se desactivó únicamente Agent Device Test IME. El método activo volvió a `com.android.inputmethod.latin`.

La guarda de destino permitió publicar `tmp/android-keyboard-restore-20261016.ad`, **10 acciones**, sin afirmar reproducción. Se cerró únicamente la sesión cuyo nombre/workspace coincidían con el propietario observado. La consulta posterior, ya cerrada esa sesión, volvió a confirmar Latin: `tmp/android-reference-ime-restored-after-close-20261016.json`; huellas y comprobación en `tmp/keyboard-restoration-evidence-20261016.json`. No se usaron comandos ADB directos ni se modificaron registros internos de propiedad del SDK. Después se comprobó que el emulador no tenía propietario y el SDK confirmó su cierre; se había iniciado únicamente para esta restauración.

## Pendientes de cierre

Venta/compradores y destino vacío, calidades/procedencias durante pesaje nativo, recuperación de recarga fallida con servicios reales, teclado normal, TalkBack, teléfono y convergencia Figma siguen abiertos. Al editar una fila de referencia, el formulario puede quedar parcialmente por encima del viewport; la captura `tmp/android-provider-edit-focus-before-20261016.png` lo registra para mejorar el foco sin alterar datos. No se considera terminado el frontend por este recorrido.
