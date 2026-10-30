# Verificación PostgreSQL del backend

Fecha: 29 de septiembre de 2026.

PostgreSQL 17.11 portátil para Windows x64, obtenido del enlace EDB publicado en https://www.enterprisedb.com/download-postgresql-binaries (fileid 1260569). SHA-256 observado del ZIP: `B9424EE7BC60B52450FF910A3630225DF32E633F3CB29C1D126D9299D59AEA28`. Este hash registra el archivo descargado; no equivale a una firma del proveedor.

El ejecutor `mercado-api/scripts/test-postgres-portable.ps1` usa PowerShell 7, contraseña aleatoria protegida con DPAPI, entrada mediante tubería en memoria, autenticación SCRAM-SHA-256 y escucha en `127.0.0.1:55437`. Crea una base nueva por ejecución, conserva evidencia y detiene el servidor. Binarios y clúster están en `.local/postgres17`, excluido del repositorio.

## Resultado comprobado

Base más reciente: `mercado_test_9172b8f95355455da6d9d09e8ffb0235`. Código de salida 0, dos archivos y veintiocho pruebas aprobadas; apagado del servidor confirmado.

1. Aplicación de las 19 migraciones y presencia de tablas críticas, incluidas valoración por lote, costo de línea y devoluciones comerciales.
2. UUID compartido entre categorías distintas de caja, rechazando duplicados dentro de una categoría.
3. Reintentos simultáneos de abono con un solo pago, movimiento de caja y evento de auditoría.
4. Rollback de pago y vencimiento cuando el detalle no cubre el importe.
5. Reverso idempotente, recuperación de saldos, caja compensatoria y aislamiento por negocio.
6. Arranque completo de Nest y endpoints de salud del proceso y de PostgreSQL.
7. Recorrido comercial completo de recepción, captura de dos sacos, cierre, liquidación de compra al contado, activación y descuento exacto de inventario, y venta al contado.
8. Recuperación por `clientOperationId` después de una respuesta perdida, sin duplicar recepción, cierre, compra, lote, caja, movimientos ni auditoría.
9. Rollback completo de una venta con versión obsoleta, sin alterar lote, venta, caja, movimientos ni auditoría.
10. Inicio de sesión de Mayorista y Encargado mediante la aplicación HTTP real, lectura autorizada, mutación denegada y auditada, aislamiento de catálogo entre negocios y revocación efectiva al cerrar sesión.
11. Liquidaciones idempotentes de flete y estiba, con un solo egreso de caja y evento de auditoría por operación.
12. Generación y persistencia de PDF, SHA-256, retención mínima, reutilización por versión, invalidación al anular la compra y aislamiento por negocio.
13. Serialización de dos ventas concurrentes sobre la misma versión del lote: una sola confirma inventario, caja y auditoría.
14. Venta a crédito con cuenta por cobrar y distribución exacta en dos vencimientos, sin registrar un cobro en caja.
15. Anulación idempotente de venta al contado, restauración exacta del lote, egreso compensatorio único y regeneración del PDF con invalidación de la versión anterior.
16. Compra a crédito con cuenta por pagar, vencimientos exactos y ausencia de salida inmediata de caja.
17. Resumen comercial, historial de precios y alertas con filtros, fechas de corte, saldos, stock e aislamiento por negocio.
18. Correcciones concurrentes de saco antes del cierre y actualización trazable del lote pendiente después del cierre.
19. Acceso HTTP a reportes permitido al Mayorista y denegado al Encargado con reemplazo vigente.
20. Contrato OpenAPI generado por la aplicación, rutas críticas, rechazo de propiedades no permitidas, respuesta uniforme de error y propagación segura de `X-Request-Id`.
21. Merma, devolución física y corrección de inventario idempotentes, con límites por existencia inicial y cantidad vendida.
22. Respaldo custom con metadatos y SHA-256, restauración transaccional, presencia de las 19 migraciones y conservación de eventos de auditoría.
23. Revocación de un reemplazo con invalidación inmediata de la sesión del Encargado y registro de la denegación.
24. Límite real de cinco intentos de inicio de sesión por minuto, con respuesta `429` en el sexto intento.
25. Trigger PostgreSQL de auditoría anexable: los intentos directos de `UPDATE` y `DELETE` fallan y el evento conserva su acción y detalle originales.
26. Valoración del lote con la base de compra y descuento proporcional; fijación del costo por línea vendida y reposición de la base disponible ante devolución física.
27. Devolución comercial al contado con respaldo físico, prorrateo exacto del descuento, egreso único, versión, auditoría, invalidación del PDF, comprobante interno y reintento idempotente; rechazo sin devolución física o con flete no cobrado.
28. Devolución comercial a crédito que reduce los vencimientos abiertos más lejanos, aplica solo el saldo pendiente y devuelve el excedente por caja; margen comercial estimado con reversión exacta de ingreso y costo.

La restauración más reciente se comprobó en `mercado_restore_test_e482e11f07ac43aab0c702bd4dfdee9e` y conservó las 19 migraciones y la auditoría.

## Correcciones descubiertas

Los nombres de migraciones usaban sufijos de doce dígitos incompatibles con TypeORM. Se reemplazaron por timestamps de trece dígitos ordenados, conservando nombres de archivos. Ninguna migración se había aplicado en el intento fallido anterior.

Identidad no exportaba SessionIdentityReader y Auditoría no importaba Identidad para sus guards. Se corrigieron ambas dependencias antes de obtener el resultado aprobado.

El pesaje bloqueaba una recepción mediante un `LEFT JOIN` y PostgreSQL rechazó `FOR UPDATE` sobre el lado anulable. La consulta se reemplazó por un `QueryBuilder` que carga las variedades esperadas y emite el bloqueo únicamente sobre la tabla de recepción.

El contrato de inventario permitía deltas negativos, pero el parser decimal compartido solo aceptaba valores sin signo. Se añadió un parser firmado separado para movimientos, manteniendo estrictos los pesos ordinarios, y se verificó la merma completa contra PostgreSQL.

## Límites

Esta evidencia cubre recorridos al contado y crédito, concurrencia y anulaciones, correcciones de pesaje, autorización HTTP, cierre de sesión, devolución física y comercial, margen comercial estimado, PDF versionado, liquidaciones de flete y estiba, respaldo y restauración. No constituye una prueba exhaustiva de cada combinación de todos los endpoints ni una prueba de carga. Tampoco cubre la ejecución con Docker, porque el ejecutable no está disponible en esta máquina, ni la operación móvil, que pertenece a `mercado-app`. Estas limitaciones no dejan reglas funcionales aprobadas de CL-11 o CL-12 pendientes en el backend.
