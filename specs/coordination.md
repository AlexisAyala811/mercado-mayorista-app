> **Organización documental aprobada — 13 de octubre de 2026:** se retiran Catálogos y logística e Inventario como módulos independientes del entregable, diagramas y PPT. Sus datos comerciales permanecen dentro de recepción, compras y ventas. Esta intervención no reorganiza el código. Véase `docs/sdd/retiro-modulos-documentales-2026-10-13.md`.

> **Cambio de alcance aprobado — 7 de octubre de 2026:** el usuario retira el control de existencias. Se conservan compras, pesajes, ventas y despachos como registros, y los saldos financieros. Las referencias anteriores a inventario, disponibilidad y valoración por lote están sustituidas por `docs/sdd/cambio-alcance-sin-inventario.md`; la implementación previa requiere adaptación.

# Coordinación entre documentación, diseño y técnica

**Estado:** activo. Este artefacto organiza el trabajo de las tres tareas; no sustituye la propuesta ni las especificaciones.

## Integración técnica en curso — 26 de octubre de 2026

La tarea de frontend está verificando aislamiento por sesión, respuestas tardías y validación civil de Flete/estiba, además de la convergencia de fechas de Auditoría. El módulo 008 aparece simultáneamente en el árbol compartido conforme a su especificación aprobada. No atribuir sus cambios a este corte ni afirmar que la migración 026 está aplicada al QA.

Comprobación global `tmp/cost-session-full-check-final-20261026.log`: tipos aprobados tras corregir dos comparaciones de host de pruebas en `tests/messaging/messaging-screen.test.tsx`; lint detectó `react-hooks/set-state-in-effect` en la carga inicial de Mensajería. La tarea de frontend corrigió exclusivamente ese efecto: respuestas asíncronas y limpieza local para ignorar resultados obsoletos; no cambió selección de archivos, envío, contratos ni estados de compartición. Antes de activar una exportación compartida que incluya 008, verificar disponibilidad real de sus contratos/migración; no presentar la nueva ruta como completa por una compilación web. QA existente usa puertos 3000/8087/55437 y la base aislada identificada en `tmp/ui-db-name.txt`. La devolución financiera reservada al usuario no se reenvía.

## Regla de trabajo

Cada corte funcional debe mantener una cadena completa:

`requisito y regla de negocio → diseño y estados → plan y tareas → implementación → pruebas y convergencia`.

Una tarea que detecte una diferencia la registra en la especificación afectada o en el registro de aclaraciones, indica su impacto y no decide en silencio por las otras tareas.

## Matriz de coordinación

Integración QA posterior del 26/10: backend 243 pruebas/61 archivos, tipos/lint/build aprobados después de ordenar 026 al final de las migraciones explícitas. Migración 026 aplicada **solo** al QA existente, exactamente una vez; catorce tablas comerciales/PDF cotejadas sin cambios. API y web actualizadas; 281 archivos cotejados. Mensajería ofrece lecturas 200 de destinatarios, historial y avisos, sin seleccionar archivos ni enviar mensajes. Evidencia `docs/sdd/verificacion-costos-sesion-fechas-2026-10-26.md`. Esta actualización sustituye la falta de migración/contrato QA indicada arriba; no acredita compartir nativo ni producción.

| Especificación | Documentación entrega | Diseño entrega | Técnica entrega | Cierre conjunto |
|---|---|---|---|---|
| 001 Acceso | Credenciales, roles, reemplazo y sesión. | Inicio, error, sesión vencida y denegación. | Autorización por negocio, rol y recurso; pruebas. | Acceso y cierre seguros, sin rutas protegidas accesibles. |
| 002 Compras | Reglas de pesaje, tara, lote, precio y liquidación. | Captura táctil, corrección, confirmación y estados de lote. | Dominio verificable, persistencia y pruebas de cálculo. | Pesaje y liquidación trazables y coherentes. |
| 003 Ventas e inventario | Reglas de disponibilidad, despacho y movimientos. | Venta, despacho, historial y falta de stock. | Transacciones de stock y pruebas de integridad. | Un despacho no genera saldos o stock inconsistentes. |
| 004 Cuentas y caja | Fórmulas de adelantos, deuda, pago, flete y estiba. | Saldos, vencimientos, pagos y confirmaciones. | Cálculos monetarios, asientos y pruebas de dominio. | Totales reproducibles y auditables. |
| 005 Offline y auditoría | Política de pendientes, reintentos, conflictos y retención. | Pendiente, confirmado, rechazado y recuperación. | Cola, idempotencia, sincronización y auditoría. | Reintentos no duplican efectos y el usuario comprende el estado. |
| 006 Reportes | Contenido, permisos y aceptación de comprobantes. | Selección, vista previa, generación y compartición. | Contratos de archivo y pruebas de generación. | Comprobantes verificables y accesibles al rol autorizado. |
| 007 Analítica e IA | Umbrales, datos permitidos y evaluación. | Disponibilidad progresiva, explicación y ausencia de datos. | Datos derivados aislados, métricas y evaluación. | Ninguna estimación se presenta como certeza ni cruza negocios. |

## Puertas de avance

| Puerta | Evidencia mínima | Responsable coordinador |
|---|---|---|
| `specify` → `plan` | Criterios observables, reglas de negocio y aclaraciones bloqueantes resueltas. | Documentación |
| `plan` → `tasks` | Arquitectura, contratos, riesgos y estrategia de pruebas definidos. | Técnica |
| `tasks` → `implement` | Tareas pequeñas, dependencias claras y diseño de los estados necesarios. | Técnica y diseño |
| `implement` → `converge` | Código, pruebas automatizadas y evidencia en tablet. | Técnica |
| `converge` → cierre | Comparación satisfactoria entre requisito, Figma, código y pruebas. | Las tres tareas |

## Registro mínimo de una diferencia

Cada diferencia debe incluir:

1. Identificador de la especificación y requisito o aclaración relacionado.
2. Evidencia concreta: documento, nodo de Figma, código o prueba.
3. Impacto para las otras dos tareas.
4. Decisión, responsable y validación requerida.

## Estado actual

- CL-01 y CL-02 están cerradas por reconciliación editorial de la documentación.
- CL-03 a CL-10 siguen condicionando los cortes que indican sus especificaciones.
- La especificación 001 tiene diseño inicial de acceso, plan y tareas preparadas; no inicia implementación hasta cerrar sus bloqueos.
- La biblioteca visual v1 sigue como propuesta hasta que pueda validarse en Figma y se confirme la dirección visual.
- La línea base técnica transversal ya incluye el scaffold Expo, separación de capas, tokens y componentes compartidos; no contiene comportamiento funcional de los siete cortes.

## Historias complementarias aprobadas

HU01–HU14 están consolidadas en `specs/user-stories.md` y `build_propuesta.py`; la renumeración de offline/analítica es explícita. Mantener seis historias comerciales y ocho complementarias sin duplicación; RF24 corresponde a búsqueda comercial y RF08/RF09 continúan retirados. Canal externo de HU14 y predicción de HU06 requieren sus aclaraciones antes de implementación.


## Convergencia técnica de Analítica — 28 de octubre de 2026

Validación local de periodos conforme al contrato existente, corte predictivo independiente y fechas/instantes de Lima; aviso descriptivo colocado junto a la consulta tras revisión móvil. No cambia reglas, criterios predictivos ni permisos. Consulta QA real con características no informadas, insuficiencia y referencias observadas; evidencia y límites en `docs/sdd/verificacion-fechas-analitica-2026-10-28.md`. Diseño/documentación deben mantener las distinciones entre descriptiva, disponibilidad y publicación revisada; el cierre global permanece abierto.

## Mensajería y notificaciones — 26 de octubre de 2026

Avance técnico posterior: selección PNG pública y apertura/cancelación del selector Android observadas con cliente recompilado y API QA real. Un intento solicitado, sin envío externo; catorce tablas comerciales/PDF intactas. Fechas del historial corregidas a Lima. Evidencia y límites en `docs/sdd/verificacion-adjunto-android-2026-10-26.md`. Documentación/diseño deben conservar la distinción entre solicitud del selector y entrega; no hay nueva regla comercial ni cierre global.

Mensajería y notificaciones organiza avisos financieros y compartición manual de archivos. Cuentas y caja conserva la autoridad sobre saldos y vencimientos. El Mayorista puede seleccionar un PDF, DOC/DOCX o imagen y un cliente/comprador o proveedor; después elige WhatsApp o correo y confirma destinatario y envío en la aplicación externa. El canal previsto no fuerza la aplicación final. Compartición solicitada no significa enviado, entregado ni leído. No se añade chat, envío automático, push ni acceso de mensajería al Encargado. La selección y compartición ocurren en Android mediante DocumentPicker y Sharing. La API autoriza, consulta avisos y conserva metadatos en message_share_attempts; no recibe el contenido de los archivos. Un adjunto por intento, hasta 20 MiB. PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. Los comprobantes PDF existentes se reutilizan desde HU10. En web, compartir requiere soporte de archivos del navegador; si falta, se prepara una descarga y no se declara compartición externa. La especificación 008 mantiene contratos, tareas y evidencia. HU15 añade adjuntos genéricos mediante RF25/RF26 sin renumerar historias anteriores.
