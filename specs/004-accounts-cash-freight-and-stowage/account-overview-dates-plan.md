# Fechas de consulta de cuentas

Estado: implementación, comprobaciones de código/PostgreSQL, paquete web, activación con HTTP real y recorrido Android tablet 1280×800 en escala 1.0/2.0 completos. Evidencia y límites en `docs/sdd/verificacion-fechas-deudas-2026-10-16.md`. Teléfono y lector de pantalla siguen pendientes.

La especificación004 exige vencimiento y último movimiento en Deudas. Completar la proyección existente, sin comandos financieros, migración ni reconstrucción histórica.

Agregar a la cuenta presentada `nextDueOn: string | null` y `lastMovementAt: string | null`. `nextDueOn` es la fecha mínima de cuotas abiertas con saldo positivo de una cuenta abierta, consultada dentro del negocio de la cuenta. Una cuenta pagada/anulada o sin cuota pendiente devuelve null. Es una fecha civil: no desplazarla por zona horaria.

`lastMovementAt` representa el último cambio confirmado de saldo/estado posterior al origen. Los escritores existentes revisados —pago, reverso, anulación de compra/venta y aplicación de devolución— incrementan versión y guardan la cuenta, actualizando updatedAt. Para versión>0 usar ese updatedAt; para versión0 devolver null y mostrar «Sin cambios posteriores». No usar createdAt ni atribuir pago, cobro o devolución concretos a esa fecha. Etiqueta visible «Último cambio de saldo/estado», hora de Lima. Cambios futuros en escritores de cuentas deben conservar este contrato.

Consultar nombre y próxima cuota en la proyección SQL existente, acotada por negocio/IDs, sin una petición por fila. Incluir versión en esa lectura y comprobar igualdad con la cuenta leída: si cambió, rechazar la consulta con conflicto y permitir su reintento, evitando combinar saldo antiguo con cuotas nuevas. No devolver filas financieras parciales ni cero ficticio.

Mantener compatibilidad de despliegue en frontend con propiedades opcionales: undefined significa «Fecha no disponible», distinto de null confirmado. Permitir varias líneas/crecimiento cuando la información adicional no quepa en la fila, conservando activos y sus dimensiones. Verificar fechas, cuenta sin cambios, estados cerrados, datos ausentes y conflicto de versión; PostgreSQL en consulta de solo lectura con fixtures CTE, regresiones y render nativo. No crear pagos ni cuentas reales para fabricar pruebas.
