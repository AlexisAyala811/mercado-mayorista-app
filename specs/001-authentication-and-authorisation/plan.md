# Plan técnico 001: autenticación y autorización

**Estado:** aprobado para implementación

## Objetivo del corte

### Retorno desde rutas abiertas directamente — 11 de octubre de 2026

Los retornos principales de analítica, administración, auditoría, cola, comprobantes, catálogos, reportes e historiales comerciales usan la función compartida `backOrHome`: regresar si existe historial de navegación, o reemplazar por el menú protegido si no existe. El reemplazo no inicia sesión ni amplía permisos. Preservar retornos internos de detalle y los flujos de salida con advertencia de compras/ventas; no modificar las rutas retiradas de inventario. Verificar aperturas directas y navegación normal en la aplicación, además de regresiones de módulo.

Entregar un acceso individual, una sesión segura y autorización comprobable por negocio, rol y reemplazo vigente, conforme a la especificación 001.

## Diseño técnico propuesto

La estructura propuesta en la decisión 001 separa rutas, interfaz, dominio y datos. En este corte, la interfaz no decide permisos: consulta un estado de sesión derivado de una fuente de autorización validada por el backend.

| Área | Responsabilidad | Límite |
|---|---|---|
| Rutas | Separar acceso público de áreas protegidas. | No contiene reglas de rol. |
| Dominio | Representar identidad, negocio, rol, autorización de reemplazo y decisiones de acceso. | No almacena secretos ni hace llamadas de red. |
| Datos | Gestionar repositorio de sesión, almacenamiento seguro y llamadas de identidad. | No interpreta permisos solo con la interfaz. |
| Backend | Validar credenciales, negocio, vigencia del reemplazo y autorización por recurso. | Es la autoridad final para datos y operaciones protegidas. |
| Interfaz | Solicitar credenciales, mostrar estados y restringir navegación como defensa de experiencia. | Nunca sustituye la autorización del backend. |

## Contratos que deben definirse antes de implementar

1. Identificador de inicio de sesión y mecanismo de alta, baja y restablecimiento de credenciales.
2. Datos mínimos de una sesión: usuario, negocio, rol, vencimiento, versión de autorización y condición de reemplazo.
3. Reglas de inicio, cierre, vencimiento y revocación de reemplazo del Encargado.
4. Política para operaciones pendientes y sesión local al cerrar sesión, reiniciar o perder conectividad.
5. Respuesta uniforme del backend para acceso denegado, credenciales inválidas y sesión vencida, sin filtrar información sensible.

## Estrategia de verificación

### MENU adaptable

El menú consume la lista autorizada que produce la ruta, conserva las identidades de módulos y reutiliza ModuleCard para la sección Venta y módulos complementarios. Los accesos originales de Compra usan los activos descargados y tipografías Inter Regular/Raleway ExtraBold del contexto completo de MENU. La cuadrícula de tablet conserva tarjetas de 261 × 279 e imágenes de 175 × 175; se adapta a dos/una columnas manteniendo los controles táctiles. La tarjeta sin nombre se interpreta únicamente como agrupación de navegación, sin nueva regla de negocio. Verificar cambio de sección sin operaciones, cierre, estado vacío, filtrado actual tras cambio de permisos y exclusión del módulo retirado Inventario. Las URLs históricas no invocan sus pantallas ni servicios.

La restauración offline usa únicamente una sesión anteriormente validada y no vencida cuando `GET /auth/session` falla con indisponibilidad de transporte. Marca el contexto como local y conserva la obligación de revalidación central al sincronizar, incluido el reemplazo del Encargado. Un temporizador bloquea rutas al vencer; no borra la cola cifrada. `401` limpia el acceso; otros errores centrales no activan la restauración. Pruebas: sesión vigente sin red, vencimiento previo y durante uso, respuestas 401/403/500 y recuperación de la misma identidad. No permite un nuevo login offline ni amplía el TTL central.

- Pruebas de dominio para matriz de permisos por rol y reemplazo.
- Pruebas de contrato para aislamiento por negocio y rechazo de recursos protegidos.
- Pruebas de interfaz para inicio, error, sesión vencida y cierre de sesión.
- Pruebas de recuperación para pendientes offline cuando CL-06 esté resuelta.
- Revisión de convergencia contra el marco Figma `LOGIN · Acceso` y la especificación 001.

## Decisiones resueltas de la línea base

CL-03, CL-05, CL-06 y CL-10 están resueltas conforme a `docs/sdd/decision-backlog.md`. La tabla conserva los aspectos del plan que cubren; no representa bloqueos vigentes de implementación.

| ID | Aspecto cubierto |
|---|---|
| CL-03 | Selección definitiva del stack y comandos de arranque. |
| CL-05 | Modelo de reemplazo y permisos efectivos del Encargado. |
| CL-06 | Persistencia y recuperación local al cambiar o cerrar sesión. |
| CL-10 | Conservación y protección de auditoría de accesos y datos derivados. |

## Convergencia del contrato de acceso — 5 de octubre de 2026

El contrato real de `POST /auth/sessions` devuelve token, expiración e identidad de credenciales parcial. El adaptador móvil consulta a continuación `GET /auth/session` con ese token para obtener nombre del negocio, ID de sesión y expiración central antes de persistir. Si esa consulta falla, no publica una sesión restaurable. No se relajan los requisitos del parser de almacenamiento ni se conservan contraseñas. La regresión reprodujo el rechazo de la identidad parcial y la ejecución Android verificó login y restauración tras cierre forzado. Evidencia y pendientes de T014: `docs/sdd/frontend-native-verification.md`.




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU07: Inicio/cierre y revocación de sesión; navegación por rol.
- [ ] Verificar HU12: Reemplazo autorizado máximo 24 horas, revocación y revalidación central.


## Convergencia de textos MENU — 7 de octubre de 2026

Usar exclusivamente el contexto completo de `tmp/figma-recovered-context/context-1.tsx.txt`, marco 1:131 y la captura original 1440×1024. En ancho de referencia, Usuario 1:138 tiene offset vertical 16 respecto a la barra 1:132; Compra 1:135 tiene offset (97,17) respecto a 1:133, y Venta 1:136 (116,17) respecto a 1:134. El centrado genérico de los textos no reproduce esas posiciones. Conservar centrado y apilamiento adaptables en ancho compacto. Medir rectángulos DOM y verificar navegación/selección; no cambiar activos ni operaciones.

El contexto de User 1:137 indica Code Connect/SDS 48, pero omite posición y la lectura programática volvió a fallar por cuota Starter. No inferir su geometría desde la captura ni declarar cerrado T017. El indicador global de sincronización y los controles de rol/cierre de sesión son extensiones funcionales vigentes; documentar su desplazamiento al comparar con el marco original.

## Corte de revalidación y solicitudes tardías
Separar isBootstrapping inicial de isRevalidating de sesión existente. RootNavigator conserva Stack y usa Modal bloqueante durante revalidación/error con sesión existente; apertura sin sesión conserva gates anteriores. El cierre por Back/escape no omite el control. Usar generación de solicitud y referencia de sesión para descartar respuestas posteriores a logout/invalidation/expiry; comprobar generación antes y después de escribir. Serializar read/write/clear del almacenamiento de sesión. Siempre intentar revocación central al cerrar aunque falle retirar almacenamiento local, y no afirmar cierre persistente en ese caso.
Verificar solicitudes aplazadas de lectura/escritura, logout, caducidad, 401, rechazo y revalidación exitosa. Prueba de árbol mantiene navegador/pantalla montados durante el modal y conserva estado; navegador real con API pausada/restaurada debe permanecer en /sync-queue. No sustituye gates de autorización ni ensayo Android.
### Corrección del vencimiento efectivo (8 de octubre de 2026)

Seleccionar `expiresAt` del reemplazo activo tanto en creación como en lectura de identidad. Persistir y devolver `min(session.expiresAt, delegation.expiresAt)` al crear; devolver ese mínimo al revalidar registros anteriores sin modificar sus datos. Verificar con repositorios simulados el reemplazo más corto, el TTL más corto, la ausencia de autorización y el vencimiento de sesiones anteriores. No crear usuarios o reemplazos persistentes para esta verificación.
### Recuperación de retirada local

Las notificaciones compartidas de respuesta no autorizada incluyen el token de la solicitud. Antes de retirar la sesión, comparar ese token con `currentSession.current.accessToken`; rechazos tardíos de otra sesión no deben cerrar la vigente. Conservar el retiro de credenciales del token vigente, el ejecutor serial y el manejo propio de bootstrap/login. Verificar ambos casos sin crear actores o permisos persistentes.

Mantener una bandera de retirada pendiente además del estado visible de progreso. El login y bootstrap consultan esa bandera antes de crear/restaurar identidad; el reintento usa el ejecutor serial existente y las generaciones que descartan respuestas tardías. La pantalla de acceso conecta un botón explícito y deshabilita el ingreso hasta finalizar. Verificar fallos repetidos, revalidación sin restauración, reintento exitoso y nuevo acceso posterior; no borrar catálogos ni cola.
## Convergencia del login con Figma — 10 de octubre de 2026

Contexto completo recuperado de `62:79` (LOGIN · Acceso): lienzo 1440×1024, panel lateral 540 de ancho, tarjeta 520×650 en (760,187), Inter y dos SVG originales de 450×450 y 350×350. Traducir la composición a layout adaptable reutilizando AppScreen, FormField y AppButton. Añadir opciones visuales acotadas y borde a borde sin modificar el aspecto de otros módulos. El formulario crece al presentar errores o recuperación; el texto del panel se dispone en flujo para evitar el solapamiento visible en la captura de referencia. En teléfono, apilar identidad y acceso manteniendo los activos, tactilidad, desplazamiento de teclado y mensajes.

Comprobar activos locales y dimensiones intrínsecas, geometría del lienzo de referencia, estados y tamaño compacto. Mantener abierta la equivalencia visual hasta inspeccionar render real; la recuperación de contexto no acredita la implementación.

## Vector original User — 15 de octubre de 2026

Code Connect no aporta una ruta importable de User y el plan Starter impide consultar su mapeo; no se crea una correspondencia ficticia ni se instala una biblioteca parecida. El nodo de diseño sí permite recuperar su vector original. Los contextos detallados de Icon en MENU (`I1:137;7758:12536`) y Carros (`I18:462;7758:12536`) proporcionan SVG idénticos y sus metadatos delimitan instancias 54×54, vector 36×40.5 en (9,6.75), con expansión de trazo de 2 px. Usar ese recurso original sin modificar sus bytes o dimensiones intrínsecas, mediante un componente local decorativo: SVG 40×44.5 en (7,4.75).

Integrar primero en MENU en la ranura (56,33) del marco, conservando la traslación existente del lienzo y el banner. En teléfono, mantener el icono original y disponer el nombre truncable a su lado, sin solapar cierre de sesión ni crear una acción nueva. El nombre conserva la etiqueta accesible. El PNG exportado es solo referencia, nunca recurso de interfaz. No acreditar geometría renderizada, Android ni todas las instancias de Compra/Carros por esta integración; requieren sus propios recorridos y contextos.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
