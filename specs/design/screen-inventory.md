# Inventario de flujos y pantallas

**Estado:** backlog de diseño basado en especificaciones SDD. Las pantallas marcadas como existentes deben revisarse y converger; no se consideran aprobadas solo por existir en Figma.

## Convenciones de estados

Todos los flujos aplicables deben contemplar carga, vacío, error, éxito o confirmación, pendiente de sincronización y acceso restringido. Los mensajes concretos dependen de las reglas y contratos que permanecen en aclaración.

## Acceso y navegación

| ID | Pantalla o estado | Especificación | Estado Figma |
|---|---|---|---|
| DS-001 | Inicio de sesión | 001 | Contexto completo de `LOGIN · Acceso` (`62:79`) recuperado el 10 de octubre; composición implementada y geometría/activos verificados en 1440×1024, adaptación en 360×800. Evidencia: `docs/sdd/verificacion-login-figma-2026-10-10.md`. Faltan convergencia de variantes y nuevo aspecto en Android. |
| DS-002 | Menú principal del Mayorista | 001 | Composición adaptable a partir de `MENU` (`1:131`) y navegación por permisos implementadas. User incorpora su SVG original con geometría de fuente; tipos/lint, seis pruebas de menú y export aprobados el 15 de octubre. Verificación renderizada nueva y Android pendientes; `docs/sdd/verificacion-user-original-menu-2026-10-15.md`. |
| DS-003 | Menú del Encargado con reemplazo vigente | 001 | Implementado en código; muestra únicamente Compras y Ventas. Evidencia táctil pendiente. |
| DS-004 | Sesión vencida, cierre y acceso restringido | 001 | Implementado con revalidación, rutas autenticadas, denegación explícita por rol y cierre. La denegación se verificó en Expo Web; evidencia táctil pendiente. |

## Recepción y compras

| ID | Pantalla o estado | Especificación | Estado Figma |
|---|---|---|---|
| DS-010 | Recepción y pesaje saco por saco | 002 | Datos de recepción y captura consecutiva implementados como composiciones controladas; reglas de peso y cierre pendientes de CL-07. |
| DS-011 | Registro de compra | 002 | Existe `COMPRA` (`1:346`); requiere revisión de campos, cálculos y estados. |
| DS-012 | Edición o corrección controlada de compra | 002 | Existe `Editar` (`18:82`); requiere reglas de corrección. |
| DS-013 | Consulta e historial de compras | 002 | Implementado en código con vacío, detalle, correcciones y anulaciones trazables; requiere convergencia visual final. |
| DS-014 | Liquidación y confirmación de compra | 002 | Implementado en código con contado, crédito, cuotas, cálculos centrales y confirmación. |

## Ventas, despacho y trazabilidad

| ID | Pantalla o estado | Especificación | Estado Figma |
|---|---|---|---|
| DS-020 | Registro de venta | 003 | Implementado en código con comprador, líneas, precio, descuento, flete y pago. |
| DS-021 | Despacho operativo | 003 | Captura por variedad, cantidades y pesos de la operación, sin lotes obligatorios, disponibilidad ni descuento de stock. Confirmación central y recorridos nativos/Figma pendientes. |
| DS-022 | Inventario por variedad y lote (retirado) | 003 | Retirado por la decisión aprobada del 7 de octubre. ID reservado para trazabilidad histórica; las rutas antiguas no representan funcionalidad vigente. |
| DS-023 | Historial y devoluciones comerciales | 003 | Historial de ventas, anulaciones y devoluciones comerciales. Sin incidencias de stock, merma ni devolución física. Filtros y trazabilidad implementados; convergencia pendiente. |

## Operación financiera y logística

| ID | Pantalla o estado | Especificación | Estado Figma |
|---|---|---|---|
| DS-030 | Carros y transportistas | 004 | Contexto completo de `Carros` (`18:459`) y seis activos originales recuperados el 11 de octubre. Búsqueda funcional de nombres/teléfonos/placas implementada y probada. Respuesta humana del 14 de octubre interpretada y comunicada como teléfono y placa separados; sin correlativo. Composición final pendiente de User conectado y convergencia visual/nativa; límite Starter impidió completar lecturas. Evidencias: `docs/sdd/verificacion-busqueda-logistica-2026-10-11.md` y `docs/sdd/decision-referencias-en-operaciones-2026-10-14.md`. |
| DS-031 | Flete y estiba | 004 | Implementado en código con grupos, operaciones seleccionables, entradas, liquidación y sincronización. |
| DS-032 | Adelantos, deudas y pagos | 004 | Existe `Deudas` (`20:531`); requiere reglas de cálculo y vencimiento. |
| DS-033 | Caja e historial de movimientos | 004 | Implementado en código con entradas, salidas, neto, origen y fecha. |

## Operación confiable, evidencias y analítica

| ID | Pantalla o estado | Especificación | Estado Figma |
|---|---|---|---|
| DS-040 | Centro de sincronización y operaciones pendientes | 005 | Implementado en código con indicador global, cola cifrada, reintento y descarte con motivo. |
| DS-041 | Conflicto o rechazo de sincronización | 005 | Implementado en código con estados rechazado, revisión, detalle del error y revalidación central. |
| DS-042 | Reportes y filtros | 006 | Periodo, resumen comercial/financiero, vencimientos e historial de precios; sin margen por lotes ni alertas de stock. Catálogos completos y recuperación de filtros implementados; convergencia pendiente. |
| DS-043 | Vista previa y generación de comprobante | 006 | Implementado en código con descarga autenticada, visor PDF y compartición; requiere evidencia en Android. |
| DS-044 | Analítica descriptiva | 007 | Primer tablero conectado implementado con periodo/variedad, ponderación, semanas, cantidades y estados; lectura real verificada en web. Faltan filtros completos y convergencia visual/nativa. |
| DS-045 | Pronóstico habilitado y no disponible | 007 | Criterios CL-08 aprobados el 6 de octubre; evaluación, publicación versionada e interfaz pendientes. |

## Secuencia de diseño propuesta

1. Completar acceso, navegación por rol y estados de sesión.
2. Diseñar recepción, pesaje, compra y liquidación con cálculos visibles.
3. Diseñar venta y despacho independientes, con cantidades por operación y trazabilidad; sin disponibilidad ni inventario.
4. Diseñar cuentas, caja, flete, estiba y vehículos.
5. Diseñar sincronización, comprobantes, reportes y analítica progresiva.

La secuencia no reduce el alcance: ordena la construcción para mantener trazabilidad y pruebas verticales.

## Mensajería y notificaciones — 26 de octubre de 2026

Mensajería y notificaciones organiza avisos financieros y compartición manual de archivos. Cuentas y caja conserva la autoridad sobre saldos y vencimientos. El Mayorista puede seleccionar un PDF, DOC/DOCX o imagen y un cliente/comprador o proveedor; después elige WhatsApp o correo y confirma destinatario y envío en la aplicación externa. El canal previsto no fuerza la aplicación final. Compartición solicitada no significa enviado, entregado ni leído. No se añade chat, envío automático, push ni acceso de mensajería al Encargado. La selección y compartición ocurren en Android mediante DocumentPicker y Sharing. La API autoriza, consulta avisos y conserva metadatos en message_share_attempts; no recibe el contenido de los archivos. Un adjunto por intento, hasta 20 MiB. PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. Los comprobantes PDF existentes se reutilizan desde HU10. En web, compartir requiere soporte de archivos del navegador; si falta, se prepara una descarga y no se declara compartición externa. La especificación 008 mantiene contratos, tareas y evidencia. HU15 añade adjuntos genéricos mediante RF25/RF26 sin renumerar historias anteriores.
