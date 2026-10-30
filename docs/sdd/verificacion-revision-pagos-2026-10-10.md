# Revisión de pagos y cobros

Fecha: 10 de octubre de 2026. Referencias: 004, HU08 y requisito de mostrar saldo anterior, importe y saldo resultante antes de confirmar.

El diálogo de cuentas solo explicaba el efecto del movimiento y no mostraba sus cifras. Se añadió una revisión de dominio que comprueba cuenta abierta, saldo central interpretable, importe positivo con hasta dos decimales, límite central existente por operación y monto no superior al saldo. El saldo resultante se calcula con BigInt; no modifica la cuenta local ni presenta el cálculo como confirmación central.

La misma validación se ejecuta antes de abrir el diálogo y antes de encolar. El diálogo diferencia pago de cobro y muestra importe, saldo anterior y saldo restante provisional. El importe no se edita mientras el diálogo/envío están activos; cancelar devuelve el formulario a edición. El backend conserva la comprobación de versión y saldo, el orden de aplicación de cuotas y la auditoría; el frontend mantiene el UUID estable, guardado duradero y recuperación ya implementados.

## Evidencia

Nueve casos de dominio cubren importe parcial/total, coma decimal, cero, negativo, decimales excesivos, formato inválido, exceso de saldo, saldo mayor que el entero seguro, cuenta pagada/anulada, saldo ilegible y máximo central de 9.000.000.000.000 centavos (`account.dto.ts`). Tres regresiones de componente comprueban cifras de confirmación, bloqueo/cancelación de edición, exceso de saldo sin diálogo ni encolado incluso ante invocación directa de confirmación, y cobro total con saldo provisional cero.

Tipos y lint aprobados; 318 pruebas frontend en 45 suites aprobadas. Las regresiones de pagos, reversos, guardado fallido, pendiente de sincronización y fallo de consulta después de confirmación siguen pasando. No se creó ni modificó ninguna cuenta persistida. Esta evidencia no acredita todavía diálogo financiero real en Android, lector de pantalla, contraste con Figma ni un saldo que cambia concurrentemente durante una petición real; ese rechazo sigue siendo responsabilidad central y requiere ensayo integrado.
