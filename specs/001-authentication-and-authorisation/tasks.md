# Tareas 001: autenticación y autorización

**Estado:** activo para implementación secuencial

- [x] Recuperar el vector original de User e incorporarlo a MENU con geometría de fuente y adaptación compacta. Sin módulo Code Connect importable: SVG original exacto, no sustitución dibujada; tipos/lint, seis pruebas de menú y export/instalación de archivos aprobados. `docs/sdd/verificacion-user-original-menu-2026-10-15.md`.
- [ ] Verificar el nuevo User montado en MENU a 1440×1024 y 360×800, nombres largos, árbol accesible y Android. Las huellas de SVG y el paquete no sustituyen esas comprobaciones; T017 permanece abierto.

## Preparación y definición

- [x] T001 Registrar la decisión aprobada de plataforma y actualizar la decisión 001. **Completada con decisiones 001 y 002.**
- [x] T002 Definir los contratos de identidad, sesión, negocio, rol y reemplazo con la tarea documental. **Resuelto por CL-05 y aplicado en el backend.**
- [x] T003 Definir conservación, borrado y recuperación de datos locales de sesión y pendientes. **Resuelto por CL-06 y CL-10; su implementación local corresponde a la aplicación móvil.**
- [x] T004 Completar la matriz de autorización por recurso y operación; incluir accesos denegados auditables. **Resuelto por CL-05; denegaciones centrales auditadas.**
- [ ] T005 Diseñar en Figma los estados de acceso válido, credenciales no válidas, sesión vencida y autorización insuficiente. **Puede prepararse; su mensaje definitivo depende de T002.**

### Avance de interfaz

- [x] Se implementó la composición adaptable del acceso con Usuario, Contraseña, acción principal, ayuda y aviso de acceso por rol, alineada con el marco `LOGIN · Acceso` (`62:79`).
- [x] Se implementó validación local de campos obligatorios con mensajes no reveladores y pruebas automatizadas.
- [x] El backend implementa verificación `scrypt`, sesiones opacas revocables, guard Bearer, consulta y cierre de sesión, límite de intentos y auditoría transaccional.
- [x] La interfaz móvil crea, consulta y revoca la sesión mediante la API; conserva el token en SecureStore, revalida al arrancar y protege las rutas privadas.

## Implementación vertical, después de las decisiones

- [x] T006 Crear el esqueleto de la aplicación con TypeScript estricto y rutas públicas/protegidas. **Implementado con Expo Router `Stack.Protected`.**
- [x] T007 Implementar modelos y reglas puras de sesión y matriz de permisos. **Sesión, expiración y matriz central de módulos por rol implementadas y verificadas con pruebas unitarias.**
- [x] T008 Implementar el repositorio de identidad y almacenamiento seguro de sesión. **API real y SecureStore en Android; almacenamiento web separado para desarrollo.**
- [x] T009 Implementar el flujo visual de inicio de sesión según la especificación y Figma. **Incluye carga, credenciales inválidas, límite de intentos y fallo de conexión.**
- [x] T010 Proteger navegación, recursos y operaciones; registrar y mostrar accesos denegados sin filtrar datos. **El menú oculta módulos restringidos; un enlace directo muestra acceso restringido y conserva la sesión. El backend revalida cada recurso y devuelve mensajes no reveladores auditados.**
- [x] T011 Implementar cierre de sesión y recuperación segura de pendientes. **Cierre local, revocación central y recuperación de cola cifrada por usuario y negocio implementados.**

## Verificación y convergencia

- [ ] T017 Converger MENU con sus activos/fontes originales y navegación autorizada. **Composición adaptable implementada: ANOTE, VER COMPRAS, CARROS y DEUDAS; la tarjeta sin nombre abre Más operaciones. Compra/Venta conserva selección accesible y cierre de sesión. Inventario está retirado por alcance aprobado y ambas rutas históricas redirigen al menú. 190 pruebas/33 suites, tipos y lint pasan; falta User conectado, evidencia final de geometría y Android.**

- [ ] T012 Probar reglas de rol, negocio y reemplazo con casos de acceso y denegación. **El backend está aprobado en PostgreSQL. Expo Web verificó que el Encargado solo ve Compras y Ventas y recibe un estado de acceso restringido al abrir Cuentas por enlace directo; falta repetirlo en tablet Android.**
- [ ] T013 Probar contratos de aislamiento por negocio y auditoría de intentos no autorizados. **El backend está aprobado en PostgreSQL para aislamiento de catálogo y auditoría de denegación; falta verificar la presentación móvil.**
- [ ] T014 Probar inicio, errores, sesión vencida, cierre y restauración en tablet. **Android API 36, 1280 × 800: login real, menú del Mayorista y restauración tras cierre forzado verificados el 5 de octubre. Se corrigió el contrato parcial de login consultando la identidad central antes de persistir. Errores, expiración y cierre completos aún requieren evidencia nativa; ver `docs/sdd/frontend-native-verification.md`.**
- [x] Observar en Android el bloqueo por sesión vencida, mensaje de reingreso y nuevo acceso QA con identidad central 200. `docs/sdd/verificacion-proveedores-compra-android-2026-10-16.md`, captura `tmp/android-expired-session-login-20261016.png`. No cierra errores de credenciales, cierre local fallido ni T014 completo.
- [ ] T015 Comparar especificación, Figma, código y evidencias de prueba; registrar y corregir diferencias. **Depende de T012–T014.**

- [ ] T016 Verificar que las opciones excluyentes de precio, flete, pago y actividad anuncien rol/estado, y que las selecciones múltiples de liquidación expongan marcado/desmarcado. **Precio/flete/pago en Compra y Venta, actividad y selector múltiple de variedades verificados en el árbol accesible y DOM web el 6 de octubre. Se añadió el atributo web explícito junto al estado nativo. Pendientes filas reales de liquidación múltiple y TalkBack; ver `docs/sdd/frontend-web-verification.md`.**



## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU07: Inicio/cierre y revocación de sesión; navegación por rol.
- [ ] Verificar HU12: Reemplazo autorizado máximo 24 horas, revocación y revalidación central.


Convergencia parcial de MENU del 7 de octubre: `docs/sdd/verificacion-menu-textos-2026-10-07.md`. Textos Usuario/Compra/Venta y seis usos de activos originales verificados en 1440×1024; cabecera compacta corregida y verificada en 360×800 sin ocultar nombre ni desbordar. Tipos, lint y cinco pruebas de menú pasan. T017 continúa abierto: User conectado, otros marcos y Android no están acreditados.

## Revalidación con contexto conservado
- [x] Conservar Stack/pantalla detrás de Modal bloqueante durante revalidación, manteniendo gates iniciales y rechazo central. **Componente y navegador aprobados; ensayo Android queda en la tarea siguiente. Evidencia: `docs/sdd/verificacion-revalidacion-sesion-2026-10-08.md`.**
- [x] Descartar resultados posteriores a logout/invalidation/expiry y serializar persistencia; probar lectura/escritura aplazadas. **Regresiones de respuestas/escrituras tardías, 401 concurrente, caducidad y login aprobadas.**
- [x] Ofrecer revalidación de sesión local sin pendientes y verificar ruta actual en navegador/Android. **Navegador y Android API36 conservan sincronización con API pausada/restaurada; el ensayo Android de cero pendientes no cierra rechazo/expiración ni lector de pantalla. Evidencia: `docs/sdd/verificacion-revalidacion-sesion-2026-10-08.md`.**
## Convergencia del vencimiento del reemplazo

- [x] Limitar el vencimiento persistido/devuelto de nuevas sesiones del Encargado al fin del reemplazo aprobado.
- [x] Aplicar el límite efectivo al revalidar sesiones anteriores sin modificar sus registros; seis pruebas adicionales y backend compilado. Evidencia: `docs/sdd/verificacion-vencimiento-reemplazo-2026-10-08.md`.
- [ ] Verificar el recorrido Android del Encargado al vencer su reemplazo; las pruebas con repositorios simulados no cierran esta tarea.
## Recuperación de cierre local

- [x] Vincular el evento 401 al token rechazado y conservar la sesión nueva ante respuestas tardías de la anterior. Tipos/lint y 55 pruebas enfocadas de autenticación/reportes aprobados; evidencia `docs/sdd/verificacion-aislamiento-reportes-sesion-2026-10-13.md`. HTTP real y Android de este escenario siguen pendientes.

- [x] Ofrecer reintento visible, conservar bloqueo mientras falla retirada y evitar restauración/reingreso; tipos, lint y cinco regresiones adicionales pasan. Evidencia: `docs/sdd/verificacion-recuperacion-cierre-2026-10-08.md`.
- [ ] Verificar esta recuperación frente a un fallo de almacenamiento real en Android; la simulación no acredita borrado físico.
## Convergencia visual del login — 10 de octubre de 2026

- [x] Recuperar contexto completo de 62:79 y usar los dos SVG originales e Inter local; verificar tarjeta, campos y activos en 1440×1024.
- [x] Adaptar a 360×800 y comprobar desplazamiento, mensajes completos y ausencia de desbordamiento horizontal. Evidencia: `docs/sdd/verificacion-login-figma-2026-10-10.md`.
- [ ] Validar nuevo aspecto, teclado, aumento de fuente y estados de error/expiración/denegación en Android; no cerrar el frontend completo por la composición base.

## Convergencia de texto ampliado — 15 de octubre de 2026

- [x] Corregir superposición de títulos/imágenes de MENU al 200 % observada en Android, usando flujo y altura automática, manteniendo tamaño original de activos y composición base. Escala 1.0 restaurada y confirmada; 501 pruebas/69 suites, tipos/lint y paquete final aprobados. `docs/sdd/verificacion-texto-ampliado-menu-carros-2026-10-15.md`. No acredita login ampliado ni TalkBack.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Aislamiento auditado y límite de acceso — 29 de octubre de 2026

- [x] Registrar `authorization.cross-business-denied` en consultas de detalle de venta, cuenta, recepción, liquidación de compra y comprobantes PDF cuando el recurso pertenece a otro negocio; mantener la respuesta `404`. `backend/src/audit/foreign-access.ts`; 3 pruebas unitarias. Evidencia: [verificación del backend](../../docs/sdd/verificacion-backend-2026-10-29.md).
- [x] Configurar `TRUST_PROXY` para el límite de inicio de sesión y desactivar OpenAPI por defecto en producción. 7 pruebas del esquema de configuración.
- [x] Prueba e2e HTTP con dos negocios que compruebe el evento de auditoría y la ausencia de datos del otro negocio. `backend/test/voided-credit-and-isolation.e2e-spec.ts`. Evidencia: [verificación de pendientes](../../docs/sdd/verificacion-backend-pendientes-2026-10-30.md).
- [ ] Verificar el límite de 5 intentos por cliente detrás del proxy HTTPS de producción, cuando exista el entorno.
- [x] Registrar en desarrollo solo el SQL de cada consulta, sin parámetros enlazados (hash de contraseña, tokens, datos personales), respetando la opción `logging`. `backend/src/database/query-logger.ts`; 3 pruebas unitarias. Evidencia: [verificación de pendientes](../../docs/sdd/verificacion-backend-pendientes-2026-10-30.md).
