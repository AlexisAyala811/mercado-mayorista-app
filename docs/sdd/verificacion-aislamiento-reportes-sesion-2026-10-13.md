# Aislamiento de reportes y rechazos de sesión — 13 de octubre de 2026

Al revisar 006 se identificó que Reportes conservaba estado mientras cambiaba el token del contexto: el efecto de catálogos cambiaba, pero resultados, periodo y diálogo pertenecían al componente anterior. Además, el cliente API notificaba un 401 sin identificar el token rechazado; el proveedor retiraba la sesión vigente aunque el rechazo proviniera de una solicitud de la sesión anterior.

La corrección mantiene los requisitos de aislamiento y ciclo seguro de 001/006, sin cambiar actores, permisos, contratos HTTP ni operaciones comerciales.

## Cambio

- `ReportsScreen` monta un `ReportsWorkspace` identificado por el token vigente y no muestra contenido sin sesión. Cambiar token reinicia periodo, filtros, diálogos, catálogos y resultados. Desmontar invalida la generación de solicitudes; resultados antiguos no se muestran en el nuevo espacio.
- `apiRequest` comunica al listener de 401 el token de la solicitud rechazada. El listener de `SessionProvider` compara con la referencia de sesión vigente antes de retirar credenciales. Un 401 del token anterior se ignora; uno del token vigente sigue retirando la sesión y su copia local mediante el ejecutor serial existente.
- Un login fallido sin token no activa ese listener. La gestión de errores de bootstrap/login sigue resolviendo sus propias solicitudes; no se relajan autorización, revalidación ni vencimiento.

## Verificación

Tipos y lint correctos. Suite enfocada: 55 pruebas en once suites de autenticación y reportes, código cero. Regresiones concretas:

1. El cliente comunica el token efectivamente rechazado y conserva mensaje/requestId del servidor.
2. Después de iniciar una nueva sesión simulada, el evento 401 del token anterior no limpia almacenamiento ni cierra la nueva sesión; el evento del token vigente sí la retira.
3. Cambiar de sesión con reporte generado, periodo editado y selector abierto reinicia resultados/fecha/dialogo y consulta los nuevos catálogos con el nuevo token. Retirar sesión deja la pantalla vacía.
4. Un resumen pendiente de la sesión anterior, resuelto después de cambiar de token, no publica importes ni bloquea Generar en el espacio nuevo.

La suite completa del frontend terminó con código cero: 415 pruebas en 62 suites, incluidas compras, ventas, cuentas, logística, sincronización, analítica y comprobantes. Se amplió la verificación por tratarse de un cambio en el límite API compartido. Los ensayos usan identidades y servicios simulados, sin crear usuarios, permisos, ventas o pagos persistentes. No acreditan cambio de usuario con HTTP real, Android, lector de pantalla ni fidelidad de Reportes con Figma; esas verificaciones siguen pendientes.

La exportación posterior `node node_modules/expo/bin/cli export --platform web` terminó con código cero y veinte rutas estáticas: entrada `entry-e738a7dd8e47d817ebe684299180bac0.js` y bundle PDF diferido `pdf-1b52feaf12c4e9365d455a718c424bde.js`. Después de exportar, `node scripts/verify-pdfjs-assets.mjs` confirmó otra vez los 200 recursos de cada raíz contra el paquete instalado (2026-10-13 18:33:00 UTC). Las rutas históricas de inventario son compatibilidad/redirección, no una reintroducción de existencias. No se publicó ni se acreditó runtime productivo mediante esta construcción.

## Referencia visual

En esta revisión Figma devolvió otra vez el contexto de Carros `18:459`, coherente con el material conservado del 11 de octubre. La consulta del componente conectado User `1:12` alcanzó el límite Starter. No se sustituyó el componente conectado ni se asignó significado al campo N° sin decisión. La composición de Carros y la comparación global siguen abiertas.
