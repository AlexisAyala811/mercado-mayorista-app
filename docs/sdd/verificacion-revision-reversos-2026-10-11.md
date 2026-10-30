# Revisión del reverso de pagos y cobros — 11 de octubre de 2026

## Requisito y comportamiento

Convergencia de 004: correcciones trazables, saldos consistentes y confirmación previa al envío. Antes de confirmar un reverso, el frontend muestra contraparte, referencias de cuenta y movimiento original, importe, saldo anterior, saldo resultante provisional y motivo. Suma los centavos mediante BigInt; no modifica el importe original ni considera la revisión una confirmación central.

Se valida antes de abrir el diálogo y nuevamente antes de encolar: cuenta no anulada, original presente en el historial, original distinto de un reverso, ausencia de compensación relacionada, saldo/importe válidos y motivo de 1–240 caracteres después de trim. Una cuenta pagada sí admite revisar el reverso, acorde al backend. `reversedPaymentId` ya existe en la entidad y respuesta central; se tipó en el cliente sin migración ni cambio de permisos.

El historial conserva el original y su compensación. Un original con reverso relacionado muestra «Movimiento revertido» y no ofrece un segundo reverso. Los controles de selección, motivo, confirmación y salida del detalle se bloquean mientras se confirma o envía. Cancelar el diálogo conserva la revisión; «Cancelar reverso» limpia la selección y el motivo sin efectos comerciales. Seleccionar otro movimiento limpia el motivo anterior.

Se conserva la cola duradera antes del envío, UUID idempotente, versión esperada, validaciones centrales y recuperación del resultado confirmado. El backend comprueba también distribución por vencimiento, permisos e integridad transaccional; la revisión visual no sustituye estos controles ni garantiza que otro usuario no cambie la cuenta antes del envío.

## Evidencia

`npm run check` del frontend: TypeScript, lint y **341 pruebas en 50 suites aprobadas**, con el tiempo predeterminado de Jest.

Las ocho pruebas de dominio nuevas cubren reapertura de cuenta pagada, suma exacta superior al entero seguro, relación de compensaciones, motivo vacío/sobredimensionado/límite, cuenta anulada, original ausente, intento de revertir un reverso y cantidades inválidas. Tres recorridos nuevos de pantalla comprueban revisión/cancelación/bloqueo de edición, rechazo previo al diálogo y al envío, e historial compensado sin segunda acción. Las regresiones existentes verifican guardado previo, recuperación pendiente y reintento de lectura después de éxito central.

No se crearon pagos o reversos persistentes en este corte ni se cambió el backend. No se acredita una nueva verificación HTTP de reversos, interacción Android, lector de pantalla o composición Figma; T413/T414 permanecen pendientes. La convergencia visual de todas las interfaces y el módulo predictivo completo siguen abiertos en el objetivo general.
