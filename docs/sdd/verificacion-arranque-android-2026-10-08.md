# Arranque de Mercado en Android

Fecha: 8 de octubre de 2026. Estado: arranque, presentación y autenticación Mayorista verificados; recorridos completos Android todavía pendientes.

Se inició el AVD local `Mercado_Tablet_API36` (Android API 36, 1280 × 800, densidad 160) mediante el SDK público de Callstack agent-device 0.21.22. Se instaló el APK de desarrollo existente de `com.mercado.gestion`, generado el 5 de octubre, y se cargó el JavaScript del proyecto vigente desde Metro. La instalación del APK de desarrollo no acredita un paquete de producción actualizado.

El SDK se conectó al daemon HTTP local de su propio directorio aislado; identidad y puerto se comprobaron antes de usarlo. La credencial del daemon se lee únicamente en memoria. No se forzaron bloqueos de propiedad ni se modificó el paquete de terceros. Las observaciones y acciones UI se realizaron por la API de agent-device.

El Metro anterior escuchaba solamente en IPv6. Se corrigió el arranque local usando `node --dns-result-order=ipv4first ./node_modules/expo/bin/cli start --dev-client --port 8081 --host localhost`, con API del emulador `http://10.0.2.2:3000/api/v1`. El enlace al cliente de desarrollo usa loopback y la redirección local `adb reverse tcp:8081 tcp:8081`. No se expuso un servicio público ni se modificó el cortafuegos. La recarga mediante `client.metro.reload` y el bundle Android completado permiten observar la versión vigente.

La captura `tmp/android-login-current-2026-10-08.png` muestra el login real de Mercado: usuario, contraseña protegida, botón de acceso y mensajes dentro del área visible, excluyendo la barra del sistema. Es evidencia de presentación inicial, no de autenticación completada, teclado abierto, accesibilidad con lector de pantalla ni equivalencia con un marco Figma de login.

Las pruebas del frontend posterior a la corrección de permisos de catálogo pasan: 283 pruebas en 41 suites, tipos y lint sin errores. El Encargado conserva captura autorizada y copias de catálogo separadas por usuario; roles desconocidos se rechazan. La comprobación completa en Android de compras, ventas, sesión, cola cifrada, PDF y vencimiento de reemplazo continúa abierta.

El acceso al contexto completo de Figma sigue limitado por la cuota Starter. Solo MENU y COMPRA disponen de contextos recuperados suficientes; no se declara equivalencia visual completa para las demás pantallas.

## Autenticación y consulta de historial

Se ingresó mediante los campos y botón nativos observados con la cuenta ficticia del entorno aislado. Se verificó progreso «Ingresando…» y llegada al menú «Mayorista», con «Cerrar sesión» y cero pendientes. El teclado y la contraseña protegida se manejaron por agent-device con grabación desactivada. Se comprobó que el valor de la contraseña no se conservó en los registros locales del SDK; no se guardó en scripts de evidencia.

El historial de compras consultó las 21 recepciones ficticias ya existentes de `QA Historial Compras 20261007`. La primera página mostró 1–20; la segunda, 21–21. La búsqueda sin coincidencia mostró «Sin resultados». Se abrió el detalle de la segunda página, con estado «Anulada», versión 1 y sin sacos; al volver se conservaron participante y segunda página, con «Página anterior» habilitada y «Página siguiente» deshabilitada. No se crearon ni modificaron operaciones para estas consultas.

Evidencias Android 1280 × 800: `tmp/android-purchase-history-pagination-2026-10-08.png`, `tmp/android-purchase-history-page-two-2026-10-08.png`, `tmp/android-purchase-history-detail-2026-10-08.png`, `tmp/android-purchase-history-return-page-two-2026-10-08.png` y árboles de controles JSON asociados. Las capturas se inspeccionaron visualmente para la primera y segunda página. Los controles visibles no invaden la barra inferior del sistema. Este ensayo no acredita todas las fechas/estados, modificación comercial, lector de pantalla ni Figma del historial.
