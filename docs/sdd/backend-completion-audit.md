# Auditoría de cierre del backend Mercado

**Fecha:** 29 de septiembre de 2026  
**Estado:** backend funcional aprobado implementado y verificado.

Esta auditoría contrasta el objetivo del backend con código ejecutable, migraciones y pruebas sobre PostgreSQL 17.11. La evidencia detallada de ejecución está en `backend-postgres-verification.md`.

| Requisito | Estado comprobado | Evidencia principal |
|---|---|---|
| Identidad y sesiones | Implementado | Credenciales `scrypt`, token opaco almacenado como hash, sesión activa, cierre y revocación comprobados por HTTP. |
| Autorización por negocio y rol | Implementado | Mayorista, Encargado con reemplazo vigente, denegación auditada, revalidación e aislamiento entre negocios. |
| Catálogos | Implementado | Proveedores, compradores, variedades, transportistas y vehículos con paginación, aislamiento y mutaciones autorizadas. |
| Recepción y pesaje | Implementado | Captura, tara, secuencia, corrección concurrente, retiro, cierre, corrección posterior al cierre y lotes pendientes. |
| Compras | Implementado | Liquidación exacta al contado y crédito, flete, adelantos, descuentos, vencimientos, idempotencia y anulación compensatoria. |
| Inventario | Implementado | Ingreso, venta, merma, ajuste, devolución física, reverso, valoración por lote, versiones y límites comprobados. |
| Ventas | Implementado | Contado, crédito, límites, excepción auditada, concurrencia, respuesta perdida, anulación y devolución comercial transaccional conforme a CL-12. |
| Cuentas, caja, flete y estiba | Implementado | Vencimientos, aplicación al más antiguo, excedentes, reintentos, reversos, liquidaciones y efectos de caja comprobados. |
| Auditoría | Implementado | Eventos anexables, accesos denegados, filtros por negocio y conservación mínima configurada. |
| Reportes | Implementado | Resumen, stock, saldos, caja, costos, alertas, historial y margen comercial estimado conforme a CL-11, con fecha de corte y operaciones sin costo determinable. |
| Comprobantes | Implementado | PDF de compra, venta y devolución comercial, hash, persistencia, retención, acceso, regeneración e invalidación por versión. |
| Migraciones | Implementado | 19 migraciones ordenadas aplicadas desde una base vacía con `synchronize: false`. |
| Contrato HTTP | Implementado | API `/api/v1`, OpenAPI, Bearer, validación estricta, errores uniformes y `X-Request-Id` comprobados en la aplicación real. |
| Pruebas | Implementado para alcance aprobado | 84 pruebas unitarias, 28 E2E PostgreSQL, typecheck estricto, lint y build aprobados. |
| Respaldo y restauración | Implementado y comprobado | Archivo custom, SHA-256, metadatos sin secretos, destino vacío confirmado y restauración con las 19 migraciones y auditoría. |

## Verificaciones externas al cierre funcional

1. Ejecutar el contenedor preparado en una máquina con Docker. La máquina actual no dispone del ejecutable; el empaquetado permanece definido y esta limitación no cambia las reglas verificadas directamente sobre PostgreSQL 17.11.
2. Ejecutar las pruebas de carga con el volumen y dispositivo definidos en CL-09 dentro del ambiente de despliegue.
3. Validar la composición, lectura y compartición en la aplicación móvil dentro de las tareas de interfaz correspondientes.

CL-11 y CL-12 fueron aprobadas, implementadas y verificadas. La definición vigente y su evidencia de aprobación permanecen en `backend-remaining-decisions.md`.
