> **Organización documental aprobada — 13 de octubre de 2026:** se retiran Catálogos y logística e Inventario como módulos independientes del entregable, diagramas y PPT. Sus datos comerciales permanecen dentro de recepción, compras y ventas. Esta intervención no reorganiza el código. Véase `docs/sdd/retiro-modulos-documentales-2026-10-13.md`.

> **Cambio de alcance aprobado — 7 de octubre de 2026:** el usuario retira el control de existencias. Se conservan compras, pesajes, ventas y despachos como registros, y los saldos financieros. Las referencias anteriores a inventario, disponibilidad y valoración por lote están sustituidas por `docs/sdd/cambio-alcance-sin-inventario.md`; la implementación previa requiere adaptación.

# Línea base técnica implementada

**Fecha de verificación:** 30 de septiembre de 2026  
**Alcance:** línea base móvil existente y backend central de los cortes 001 a 006.

## Evidencia disponible

| Capacidad | Estado | Evidencia |
|---|---|---|
| Plataforma móvil | Implementada | `mercado-app` usa Expo SDK 57, React Native, TypeScript estricto y Expo Router. |
| Enrutamiento base | Implementado | Expo Router separa el acceso público de las rutas autenticadas; las rutas exclusivas del Mayorista presentan una denegación explícita al Encargado sin cerrar su sesión. |
| Separación arquitectónica | Implementada como base | Directorios `app`, `features`, `domain`, `data`, `services` y `ui`; límites documentados y controlados por ESLint. |
| Sistema visual base | Implementado parcialmente | Tokens semánticos de color, espaciado, radio, tipografía y layout; requiere convergencia con Figma. |
| Componentes transversales | Implementados | Botón, campo, retroalimentación, carga, vacío, contenedor adaptable, encabezado, tarjeta y sección de formulario. |
| Adaptación de pantalla | Implementada como base | Área segura, desplazamiento, ancho máximo y espaciado diferenciado para teléfono y tablet. |
| Interfaz de acceso | Implementada y conectada | Usuario, contraseña, validación local, API de sesión real, errores no reveladores, límite de intentos, carga y fallo de conexión. |
| Sesión móvil | Implementada para acceso | Token opaco en SecureStore, restauración local, comprobación de expiración, revalidación central, revocación y limpieza local al cerrar o recibir un `401` autenticado. |
| Menú principal | Implementado como entrada protegida | Cabecera de usuario, rol y cuadrícula adaptable; el Encargado solo ve Compras y Ventas conforme a RF02, mientras el Mayorista accede a administración, auditoría y módulos operativos. |
| Recepción y pesaje | Implementados y conectados | La app carga proveedores, variedades y vehículos; crea la recepción, captura bruto y tara, presenta neto y totales, corrige antes del cierre y usa la versión vigente para detectar concurrencia. El cierre explícito crea lotes pendientes en la API. |
| Liquidación de compra móvil | Implementada y conectada | Precio y flete por kg o saco, adelantos, descuentos, contado o crédito con múltiples cuotas; la confirmación muestra exclusivamente los importes persistidos y calculados por la API. |
| Ventas y despacho móvil | Implementados y conectados | Comprador, destino, vehículo, conductor, selección de lotes disponibles, sacos, peso, precio, flete, descuentos y contado o crédito; la confirmación conserva UUID ante respuesta perdida y muestra el resultado central. |
| Consulta móvil de inventario | Implementada y conectada | Resumen de lotes, sacos y peso, estados textuales, variedad, versión, movimientos, correcciones, mermas y devolución física con selección de la venta de origen. Las rutas permanecen exclusivas del Mayorista conforme a RF02. |
| Historial móvil de compras | Implementado | Recepciones, pesajes, liquidaciones, corrección antes y después del cierre, anulación de saco, recepción y compra con versión y motivo. |
| Cuentas y caja móvil | Implementadas | Listado, detalle, vencimientos, historial, pagos, cobros, reversos idempotentes e historial paginado de entradas y salidas de caja con total neto. |
| Logística móvil | Implementada | Alta, edición y desactivación de transportistas y vehículos; grupos de estiba, selección de compras o ventas, entradas, liquidaciones confirmadas y cola offline para mutaciones idempotentes. |
| Reportes móviles | Implementados | Resumen comercial, margen estimado, alertas e historial de precios por periodo, operación, variedad, proveedor y comprador. Las fechas operativas usan el calendario local del dispositivo. |
| Comprobantes móviles | Implementados | Historial de compras y ventas, estado vigente o invalidado, descarga autenticada, vista previa PDF nativa con zoom en Android, vista embebida web y compartición mediante el panel del dispositivo. Los documentos invalidados conservan la fila histórica sin acciones de apertura. |
| Administración móvil | Implementada | Alta y desactivación de Encargados, restablecimiento de contraseña, creación y revocación de reemplazos máximos de 24 horas y consulta filtrada de auditoría. |
| Sincronización offline móvil | Implementada; validación en dispositivo pendiente | Cola AES-GCM por usuario y negocio, clave en SecureStore, dependencias entre operaciones, cinco reintentos, consulta de resultado central, conflictos en revisión, descarte con motivo e indicador global. Compras, ventas y cuentas están integradas. |
| Backend central | Cortes 001–006 implementados | NestJS 12, PostgreSQL 17, TypeORM sin sincronización automática, API `/api/v1`, health checks y diecinueve migraciones explícitas registradas. |
| Seguridad de credenciales | Implementada | Hash `scrypt` con sal, comparación segura, consulta restringida del hash y tokens opacos almacenados solo como SHA-256. |
| Sesiones y reemplazos API | Implementados | Crear, consultar y revocar sesión; Encargados, reemplazos máximos de 24 horas, revalidación por orden, revocación de sesiones, roles y denegaciones auditadas. |
| Catálogos centrales | Implementados | Proveedores, compradores, variedades, transportistas y vehículos aislados por negocio, paginados, con lectura autenticada y mutación restringida al Mayorista. |
| Auditoría central | Implementada | Eventos anexables e inmutables, consulta exclusiva del Mayorista por negocio y filtros, accesos denegados auditados y retención mínima expuesta de cinco años. |
| Compras e inventario | Implementados | Liquidación por kg o saco con redondeo mitad hacia arriba, flete, adelantos, descuentos, lotes disponibles solo tras liquidar y movimientos para ingreso, venta, devolución, merma, ajuste y reverso. |
| Ventas y despacho | Implementados | Confirmación idempotente con bloqueo de lotes, versión optimista, crédito y excepción autorizada, caja o cuenta, devolución física y anulación compensatoria. |
| Cuentas, caja, flete y estiba | Implementados | Cuentas por pagar/cobrar, vencimientos, aplicación al más antiguo, rechazo de excedentes, reversos, caja, costos de flete derivados por kg o saco, liquidación a transportistas, grupos de estiba y liquidación trazable. |
| Sincronización central | Contratos implementados | UUID por tipo, reintentos idempotentes, conflictos `409` con versión, revalidación de rol/reemplazo y consulta determinista del resultado por UUID y tipo. |
| Reportes y comprobantes | Implementados | Resumen comercial, margen comercial estimado con valoración por lote, componentes de costo, operaciones sin valoración, stock, cuentas, alertas, evolución de precios y PDF interno persistido con hash, versión, invalidación y retención mínima de cinco años. |
| Contrato y diagnóstico HTTP | Implementados | OpenAPI 3 configurable, esquema Bearer, identificador `X-Request-Id`, respuesta uniforme de errores y trazas de método, ruta, estado y duración sin registrar cuerpos. |
| Despliegue del backend | Preparado; contenedor pendiente | Dockerfile multi etapa con usuario sin privilegios y Compose con PostgreSQL, health checks, migración previa obligatoria y configuración de TLS, pool y tiempo de conexión. Respaldo y restauración fueron comprobados con PostgreSQL 17.11; la máquina actual no dispone de Docker para ejecutar Compose. |
| Integridad de entradas | Implementada | Normalización previa a validación y restricciones PostgreSQL impiden textos obligatorios vacíos; las contraseñas no se normalizan ni modifican. |
| Verificación automatizada | Implementada | La app aprueba TypeScript, Expo ESLint y veintidós pruebas Jest en nueve suites de autenticación, autorización, fechas locales, filtros, pesaje, dinero, idempotencia, cola y disponibilidad de ventas. El backend aprueba 84 pruebas Vitest y 28 E2E PostgreSQL. `scripts/validate_project.ps1` agrega validación SDD, móvil y backend. |
| Salud de Expo | Verificada | Expo Doctor aprobó 21 de 21 comprobaciones al establecer la línea base. |
| Riesgo de dependencias | Registrado | `mercado-app/docs/security/dependency-audit.md`. |

## Alcance que permanece fuera del backend

La persistencia segura de sesión, cola offline, estados visuales, recuperación de pendientes, vista previa y compartición corresponden a `mercado-app`. La analítica predictiva de la especificación 007 permanece fuera de los cortes 001–006 y bloqueada por CL-08. CL-11 y CL-12 están implementadas en la API mediante valoración por lote, margen trazable y devolución comercial separada de la reposición física.

Las 19 migraciones se aplicaron sobre una base nueva PostgreSQL 17.11 portátil. Pasaron veintiocho pruebas de integración de salud, esquema, contrato HTTP, autorización, sesiones, auditoría inmutable, transacciones financieras, recorridos al contado y crédito, concurrencia, correcciones, inventario, devoluciones comerciales, margen, anulaciones, logística y comprobantes. La misma ejecución respaldó y restauró la base verificando migraciones y auditoría. Evidencia y límites en `docs/sdd/backend-postgres-verification.md`. La prueba de carga y la ejecución de Compose permanecen como verificaciones de despliegue fuera de la máquina actual.

## Próximas condiciones de avance

1. Converger tokens y componentes con la biblioteca de Figma cuando vuelva a estar disponible su contexto de diseño.
2. Validar la cola offline durante dos horas y cinco reintentos en los dispositivos Android definidos por CL-09.
3. Ejecutar las verificaciones móviles y PostgreSQL también en CI.
4. Ejecutar las pruebas en los tamaños de dispositivo aprobados en CL-09.


## Mensajería y notificaciones — 26 de octubre de 2026

Mensajería y notificaciones organiza avisos financieros y compartición manual de archivos. Cuentas y caja conserva la autoridad sobre saldos y vencimientos. El Mayorista puede seleccionar un PDF, DOC/DOCX o imagen y un cliente/comprador o proveedor; después elige WhatsApp o correo y confirma destinatario y envío en la aplicación externa. El canal previsto no fuerza la aplicación final. Compartición solicitada no significa enviado, entregado ni leído. No se añade chat, envío automático, push ni acceso de mensajería al Encargado. La selección y compartición ocurren en Android mediante DocumentPicker y Sharing. La API autoriza, consulta avisos y conserva metadatos en message_share_attempts; no recibe el contenido de los archivos. Un adjunto por intento, hasta 20 MiB. PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. Los comprobantes PDF existentes se reutilizan desde HU10. En web, compartir requiere soporte de archivos del navegador; si falta, se prepara una descarga y no se declara compartición externa. La especificación 008 mantiene contratos, tareas y evidencia. HU15 añade adjuntos genéricos mediante RF25/RF26 sin renumerar historias anteriores.

## Monorepo y entrega continua — 29 de octubre de 2026

Decisión D5 de [integridad y seguridad del backend](../../docs/sdd/decision-integridad-seguridad-backend-2026-10-29.md) y ADR-05.

- El repositorio `mercado-mayorista-app` reúne `docs/` (documentación del entregable y `docs/sdd/`), `specs/`, `.specify/` y `backend/` (antes `mercado-api`, importado con su historial). La aplicación Expo se incorporará en `app/`.
- `backend-ci.yml`: en cada PR, tipos, lint, pruebas unitarias, build, `npm audit` sin vulnerabilidades altas, migraciones y e2e en PostgreSQL 17 e imagen Docker.
- `backend-cd.yml`: en cada push a `main`, CI completa, publicación de la imagen en GHCR (`sha-<commit>`) y despliegue por SSH con migración, comprobación de salud y reversión cuando `DEPLOY_ENABLED=true`.
- `docs-ci.yml`: enlaces y anclas de toda la documentación, incluidas especificaciones y decisiones.

Evidencia: primera ejecución de CD en `main` (run 41003641527) con imagen publicada y despliegue omitido por falta de entorno. Pendiente: servidor, entorno `production`, protección de `main` y CI de la aplicación Android.
