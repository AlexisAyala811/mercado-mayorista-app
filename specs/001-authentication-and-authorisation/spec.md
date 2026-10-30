# Especificación 001: Autenticación y autorización por rol

**Estado:** aprobada para implementación

## Objetivo

Permitir el acceso seguro mediante credenciales individuales y asegurar que cada usuario solo pueda realizar las operaciones autorizadas en su negocio.

## Trazabilidad

- RF 01: acceso seguro mediante credenciales individuales.
- RF 02: acceso total para el Mayorista y acceso limitado para el Encargado cuando lo reemplaza.
- RF 22: auditoría de creación, actualización o anulación de operaciones.
- AC03: no duplicar efectos al reintentar una operación.
- AC04: denegar y registrar intentos de acceso no autorizado entre negocios.
- R05: aislamiento de los datos de cada negocio.
- DA03: autenticación, autorización por negocio y auditoría en el backend.
- CL-05: inicio y fin del reemplazo del Mayorista por el Encargado, incluidas autorizaciones vencidas o revocadas durante trabajo offline.
- CL-06: conservación y recuperación de operaciones locales pendientes.
- CL-10: aislamiento y conservación de auditoría en datos derivados y archivos.

## Actores

| Actor | Permiso |
|---|---|
| Mayorista | Acceso completo a recepción y pesaje, compras, ventas y despachos, historial comercial, cuentas, caja, reportes, analítica, configuración y administración de usuarios. |
| Encargado | Solo mientras tenga un reemplazo vigente y autorizado del Mayorista, puede registrar pesaje saco por saco e ingresar datos de compras y ventas. No accede a cuentas, caja, reportes, IA, configuración ni administración. |

## Flujos principales

### Acceso válido

1. El usuario ingresa sus credenciales individuales.
2. El sistema valida su identidad y asociación con un negocio.
3. El sistema crea una sesión segura.
4. El sistema muestra solo la navegación y acciones correspondientes al rol y, para el Encargado, al reemplazo vigente autorizado.
5. El acceso y las operaciones posteriores quedan asociadas al usuario autenticado.

### Acceso no autorizado

1. Un usuario intenta acceder a una ruta, operación o dato fuera de sus permisos o negocio.
2. El backend deniega la solicitud sin revelar datos del otro negocio.
3. El sistema registra el intento para auditoría.
4. La interfaz informa que la acción no está permitida y conserva la sesión válida, si existe.

### Operación del Encargado

1. El Encargado inicia sesión con sus propias credenciales.
2. El sistema verifica que exista un reemplazo vigente y autorizado.
3. El sistema habilita pesaje, compras y ventas autorizadas únicamente durante ese reemplazo.
4. El sistema bloquea las operaciones no autorizadas en interfaz y backend.
5. Cada operación guarda el usuario responsable y su fecha.

## Requisitos funcionales verificables

1. El sistema permite iniciar sesión únicamente con credenciales individuales válidas.
2. El sistema identifica el negocio asociado a la sesión antes de recuperar o modificar datos.
3. El Mayorista puede acceder a todos los módulos aprobados.
4. El Encargado solo puede ejecutar las operaciones expresamente autorizadas por RF 02 durante un reemplazo vigente y autorizado.
5. La autorización se verifica en el backend para cada recurso protegido.
6. Toda operación creada, actualizada o anulada conserva el usuario autenticado, fecha y detalle de auditoría.
7. Un intento de acceder a datos de otro negocio se deniega y registra para auditoría.
8. El cierre de sesión invalida el acceso a rutas y recursos protegidos en el dispositivo.

## Criterios de aceptación

### Escenario: Mayorista autenticado

**Dado** un Mayorista con credenciales válidas, **cuando** inicia sesión, **entonces** puede acceder a todos los módulos autorizados de su negocio y ninguna información de otro negocio.

### Escenario: Encargado autenticado

**Dado** un Encargado con credenciales válidas y un reemplazo vigente autorizado, **cuando** inicia sesión, **entonces** puede acceder a pesaje, compras y ventas, y no puede acceder a cuentas, caja, reportes, IA, configuración o administración.

### Escenario: Encargado sin reemplazo vigente

**Dado** un Encargado con credenciales válidas pero sin un reemplazo vigente autorizado, **cuando** inicia sesión o intenta ejecutar una operación restringida, **entonces** el sistema no habilita pesaje, compras ni ventas y no revela datos u operaciones fuera de sus permisos.

### Escenario: Acción restringida

**Dado** un Encargado autenticado, **cuando** intenta consultar o invocar una operación de cuentas, **entonces** el backend rechaza la acción, registra el intento y no devuelve información protegida.

### Escenario: Aislamiento por negocio

**Dado** un usuario autenticado, **cuando** intenta recuperar o modificar un identificador perteneciente a otro negocio, **entonces** la solicitud es rechazada y el evento queda auditado.

### Escenario: Cierre de sesión

**Dado** un usuario con sesión activa, **cuando** cierra sesión, **entonces** no puede volver a una pantalla protegida ni ejecutar una operación protegida sin autenticarse otra vez.

## Requisitos de calidad

### Restauración durante una interrupción de conexión

Una sesión previamente validada y conservada en almacenamiento seguro puede recuperar el contexto local mientras su vencimiento aún no se cumpla cuando la consulta de sesión falla por falta de conexión. Esto permite recuperar pendientes cifrados de la misma identidad y continuar capturas provisionales; no realiza un nuevo inicio de sesión ni confirma permisos o efectos centrales. La interfaz identifica la sesión local sin conexión y el servidor vuelve a validar identidad, permisos y reemplazo al recibir cada operación conforme a CL-05. Una respuesta de sesión inválida (`401`), otros errores centrales o una sesión vencida no habilitan esta restauración. El vencimiento local y el cierre de sesión bloquean las rutas sin borrar los pendientes.

- Las decisiones de autorización no se basan exclusivamente en la interfaz.
- Los datos de negocios distintos permanecen aislados en todas las consultas y operaciones protegidas.
- Los mensajes de error no revelan datos, permisos internos ni existencia de usuarios de otro negocio.
- El diseño debe ser táctil y accesible en tablet Android.

## Referencia de diseño

### Menú y módulos autorizados

La composición de MENU conserva los accesos ANOTE (registro de compra), VER COMPRAS (historial), CARROS (logística) y DEUDAS (cuentas y caja), habilitados exclusivamente cuando el módulo está autorizado para el usuario. Compra y Venta se presentan como secciones seleccionables. La tarjeta sin nombre del diseño se adapta a Más operaciones, que abre los módulos aprobados restantes; no introduce una operación de negocio nueva. Los módulos ausentes por permisos no se muestran ni se pueden invocar desde el menú. Cambiar de sección no registra operaciones y se mantiene disponible el cierre de sesión. La composición se adapta a teléfono conservando imágenes, textos legibles y controles táctiles.

- Figma: archivo `MERCADO`, marco `LOGIN · Acceso` (`62:79`), tablet de 1440 × 1024.
- El marco contiene los campos visibles de **Usuario** y **Contraseña**, la acción **Iniciar sesión** y el aviso de que las acciones se habilitan según el rol. No agrega recuperación de acceso ni un mecanismo de credenciales: ambos continúan pendientes de aclaración.
- La pantalla es una referencia de flujo e interfaz. La validación de identidad, la sesión segura y la autorización por negocio y rol siguen siendo responsabilidades de la implementación y del backend.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones aprobadas

1. Definir el formato exacto de credenciales: usuario, teléfono, correo u otro identificador.
2. Definir quién crea, activa, desactiva o restablece las credenciales del Encargado.
3. Definir duración de sesión y comportamiento cuando el dispositivo permanece offline.
4. Definir si un Mayorista puede tener más de un Encargado activo y cómo se registra el reemplazo.
5. Definir el mecanismo de recuperación de acceso sin debilitar la seguridad.
6. Resolver CL-05, CL-06 y CL-10 del registro compartido antes del plan técnico de autenticación y sincronización.



## Alineación de historias del 7 de octubre de 2026

HU07: acceso y cierre de sesión; HU12: autorización y revocación de reemplazos. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.

## Revalidación sin perder navegación
Al consultar nuevamente una sesión ya vigente, conservar la pantalla montada y su contexto detrás de un diálogo bloqueante. La comprobación inicial sigue bloqueando la apertura de rutas. La revalidación no habilita interacción con datos protegidos hasta finalizar; un rechazo mantiene un estado bloqueado o retira la sesión según la política existente. Un resultado central válido actualiza permisos/fecha y cierra el diálogo sin devolver al menú.
Una respuesta iniciada antes de cerrar sesión, invalidarla o vencer no puede volver a guardarla ni habilitarla. El cierre local y los cambios de credenciales se serializan para impedir que una escritura tardía quede después de la retirada. Un error de conexión solo conserva la identidad previamente verificada y aún vigente; no amplía su plazo. La cola permanece independiente. Con cero pendientes, una sesión local debe poder solicitar revalidación explícita desde sincronización.
### Convergencia del vencimiento del reemplazo (8 de octubre de 2026)

La vigencia comunicada y persistida al iniciar sesión como Encargado es el menor valor entre el vencimiento configurado de la sesión y el fin del reemplazo activo. La revalidación aplica el mismo límite a sesiones anteriores. Esto concreta el permiso temporal ya aprobado; no amplía permisos ni modifica reemplazos. Cada petición central continúa comprobando la autorización y su revocación. Sin conexión no se puede conocer una revocación posterior, pero tampoco se permite conservar una sesión más allá del vencimiento conocido del reemplazo.
### Recuperación del cierre local fallido

Si retirar credenciales del dispositivo falla, bloquear la sesión inmediatamente y ofrecer «Reintentar cierre» en el acceso. Mientras esté pendiente, no permitir nuevo login ni restauración local mediante revalidación. Mostrar progreso y permitir otro intento si el almacenamiento sigue fallando. Un cierre central se intenta aunque la retirada local falle. La retirada afecta solo credenciales, nunca pendientes comerciales. Esta recuperación no permite garantizar borrado físico si el almacenamiento no funciona ni descubrir una revocación sin conexión tras reiniciar completamente el proceso.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.

## Aislamiento auditado y límite de acceso — 29 de octubre de 2026

Decisiones D3 y D4 de [integridad y seguridad del backend](../../docs/sdd/decision-integridad-seguridad-backend-2026-10-29.md). Completa CL-10 para consultas de detalle.

### Escenario: Consulta de un recurso de otro negocio

- **Dado** un usuario autenticado del negocio A
- **Cuando** consulta el detalle de una venta, cuenta, recepción, liquidación de compra o comprobante PDF que pertenece al negocio B
- **Entonces** recibe `404`, igual que ante un recurso inexistente
- **Y** la auditoría del negocio A registra `authorization.cross-business-denied` con el usuario, el tipo y el identificador consultados
- **Y** la auditoría del negocio B no recibe información del negocio A.

### Escenario: Límite de intentos detrás de un proxy

- **Dado** la API publicada detrás de un proxy inverso con `TRUST_PROXY` configurado
- **Cuando** un cliente supera 5 intentos de inicio de sesión en un minuto
- **Entonces** solo ese cliente recibe `429`; los demás usuarios pueden seguir iniciando sesión.

OpenAPI no se publica en producción salvo configuración explícita.
