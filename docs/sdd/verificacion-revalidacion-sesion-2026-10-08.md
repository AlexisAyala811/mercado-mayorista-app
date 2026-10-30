# Revalidación con navegación conservada y respuestas tardías descartadas

Corte de 001/005 del 8 de octubre de 2026. Corrige el regreso involuntario al menú observado al sincronizar desde una sesión restaurada offline. No cambia actores, duración de sesión ni autorización central.

## Implementación

La validación inicial sigue usando el gate de apertura. Una sesión existente usa isRevalidating y mantiene el Stack montado detrás de Modal bloqueante. Si existe un error central con sesión previa, el modal conserva el bloqueo y ofrece reintento; Back/escape no omite la comprobación. Un resultado válido actualiza identidad y fecha y cierra el diálogo sin desmontar navegación. La retirada de sesión conserva el gate de autenticación.

Cada solicitud de sesión tiene una generación. Logout, invalidación y vencimiento cancelan su generación antes de retirar la identidad. Una respuesta antigua no puede volver a persistirla ni habilitarla. Lectura/escritura/retirada local se serializan; una retirada espera a una escritura que ya estaba en curso y queda después de ella. La vigencia se comprueba de nuevo tras las esperas. Se conserva el vínculo usuario/negocio/sessionId del token y se valida el esquema de la identidad central.

El cierre intenta la revocación central incluso si falla retirar almacenamiento local, mostrando el fallo sin anunciar un cierre persistente correcto. La recuperación offline conserva exclusivamente una identidad previamente verificada y vigente. Un 401 o identidad central incompatible la retira; otros rechazos no se convierten en permiso offline. La cola no se elimina ni modifica por revalidar la sesión.

Sincronización añade Revalidar sesión cuando la identidad es local, incluso con cero pendientes. Esta acción no envía operaciones comerciales ni crea movimientos de dinero.

## Evidencia

- Tipos y lint aprobados. Regresión completa: 280 pruebas en 41 suites.
- Pruebas de sesión: revalidación separada del bootstrap inicial; respuesta tardía tras logout/invalidation/expiry/401 concurrente; escritura iniciada antes del cierre; login tardío; caducidad durante validación inicial; error central; esquema/rol e identidad incompatibles; revocación central aun con fallo de retirada local. Se usan respuestas y escrituras aplazadas y reloj controlado, sin eliminar verificaciones existentes.
- Árbol de navegación: estado de Stack conservado durante modal y después de éxito/error; Back no cierra el bloqueo; ninguna navegación protegida se monta durante bootstrap inicial. El navegador de este ensayo de componente es una implementación con estado del mismo límite de montaje, no una certificación del funcionamiento interno de Expo Router.
- Pantalla de sincronización: revalidación independiente con pendingCount=0, sin synchronize ni retry de operaciones. Prueba aislada posterior del escenario: cinco casos de cola aprobados.
- Navegador real: /sync-queue con cero pendientes; API local de pruebas detenida y página recargada, sesión local restaurada y Revalidar sesión disponible. Revalidar con API aún detenida conserva estado y ruta. Después de restablecer API y pulsar la misma acción, el indicador pasa a Datos sincronizados y la URL sigue siendo http://localhost:8087/sync-queue. Se conservan operaciones confirmadas anteriores; no se registró ni anuló una operación comercial en este ensayo.

Captura: `tmp/session-revalidation-stays-queue-2026-10-08.png`. La comprobación real de navegador acredita ruta conservada y estado final; el diálogo fue transitorio y su bloqueo/montaje se verifica mediante componente. API de pruebas quedó restablecida.

Referencia Modal consultada mediante Context7, catálogo oficial React Native y tipos instalados: https://reactnative.dev/docs/modal. El código usa visible, animationType y onRequestClose; no introduce APIs de autorización ni rutas alternativas al servidor.

## Límites

El recorrido básico ya se ejecutó en Android en el ensayo adicional descrito abajo. Falta comprobar lector de pantalla, casos de rechazo/expiración con operaciones pendientes y converger con los marcos Figma pendientes. La recuperación visible del cierre local fallido se implementó y verificó mediante cinco regresiones en `verificacion-recuperacion-cierre-2026-10-08.md`; sigue pendiente inducir un fallo físico de almacenamiento en Android. La corrección de generaciones no sustituye esos ensayos.

Las exportaciones de catálogos anteriores a este cambio son históricas para revalidación. Las exportaciones actuales verificadas se detallan a continuación; la meta completa sigue activa.


## Exportaciones actuales de pruebas

Expo export completó Android/Hermes y web/20 rutas. Metadata, rutas pertinentes y SHA-256 verificados. API Android del emulador: http://10.0.2.2:3000/api/v1; web local: http://localhost:3000/api/v1. Son paquetes locales, no APK instalado ni publicación.

- `tmp/android-export-revalidation-2026-10-08/_expo/static/js/android/entry-7fa53e799e2f38727860f73cb7b7d05c.hbc`: 3411887 bytes; SHA-256 `d76ba46213c25e8513ca7141c5a998307dfdd8c4c025948de3b204d7162d0bc2`.
- `tmp/web-export-revalidation-2026-10-08/_expo/static/js/web/entry-de08a071bb5444f82db4c5dab4656863.js`: 1529847 bytes; SHA-256 `e8d4463ead1be61f11b6e569a3fd7bfa8537d06729948fccc148cc2d88766543`.

Registro: `tmp/frontend-export-revalidation-2026-10-08.json`.

## Ensayo Android con la API pausada y restablecida

AVD Mercado Tablet API36, 1280 × 800; frontend vigente cargado mediante Metro y sesión ficticia Mayorista conservada en SecureStore. Se detuvo únicamente el proceso propio de API del entorno aislado, manteniendo PostgreSQL y Metro. Después de recargar, Android restauró la identidad aún vigente y mostró «Sesión local sin conexión» con cero pendientes.

En sincronización se ofreció «Revalidar sesión» aunque no había operaciones. Al pulsarlo con la API pausada, se observó «Revalidando la sesión» como único contenido accesible de la aplicación durante la comprobación; al terminar se mantuvo «Operaciones del dispositivo», sesión local y cero pendientes. Tras restablecer la API, el mismo botón actualizó el estado a «Datos sincronizados» conservando la pantalla de sincronización y retirando el aviso local. No se volvió al menú durante estas revalidaciones; la recarga completa inicial sí abrió el menú, como un bootstrap nuevo.

Capturas y controles asociados: `tmp/android-revalidation-offline-stays-queue-2026-10-08.png/.json` y `tmp/android-revalidation-online-stays-queue-2026-10-08.png/.json`. La captura offline se inspeccionó visualmente; ambas observaciones acreditan el título de sincronización y sus estados finales. Los servicios de pruebas quedaron restablecidos. No se crearon operaciones ni se borraron pendientes; el ensayo de cola vacía no acredita conservación de operaciones reales durante el proceso.
