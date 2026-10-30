# Detalle y revisión de cobro con API real — 11 de octubre de 2026

## Escenario aislado

Se preparó mediante la API local una única venta ficticia a crédito de S/50.00, sin pago inicial, para «QA Cuenta Consulta 20261011», con una variedad activa del negocio y un vencimiento del 19 de octubre. La base es la instancia aislada `mercado_ui_test_*`; no se crearon usuarios, delegaciones o permisos. El helper `mercado-api/test/accounts-review-ui-fixture.mjs` recibe las credenciales por variables del proceso, revoca la sesión de preparación/cierre y conserva solo referencias y UUID de operaciones en `tmp/accounts-review-ui-fixture-2026-10-11.json`.

## Recorrido real observado

- «Actualizar» recibió la cuenta central. Buscar `qa cuenta consulta` y abrir detalle conservó comprador, referencia, origen Venta, importe/saldo de S/50.00 y vencimiento pendiente.
- S/50.01 fue rechazado antes del diálogo por superar el saldo.
- S/10.01 abrió revisión con saldo anterior S/50.00 y saldo provisional S/39.99, contraparte y referencia. El campo tenía `readonly` en el DOM y la salida del detalle estaba deshabilitada.
- El diálogo se inspeccionó también a 360 × 800: texto y botones Cancelar/Registrar permanecen dentro del viewport. Se pulsó únicamente Cancelar. Se conservó el importe escrito y regresar a cuentas mantuvo la búsqueda.
- El helper comprobó mediante HTTP que no había pagos y que el saldo seguía siendo S/50.00. Cerró la venta ficticia con anulación trazable y desactivó solo su comprador. La consulta posterior confirmó cuenta anulada, saldo cero, cero pagos y nombre histórico conservado.
- Desde la interfaz se volvió a abrir esa cuenta de comprador desactivado. Se verificó el bloqueo de «Confirmar importe», saldo S/0.00 y nombre original.

## Correcciones descubiertas

El historial vacío no explicaba la ausencia de movimientos: ahora muestra «Sin pagos ni cobros». Un calendario ausente muestra «Sin vencimientos registrados». El vencimiento cerrado por anulación se rotulaba «Pagado» por el estado técnico central de cierre; la presentación ahora dice «Cerrado por anulación» cuando la cuenta está anulada, sin modificar el contrato o saldo. La etiqueta corregida y el historial vacío se verificaron en la interfaz con la API real.

Una recarga presentó un fallo transitorio de lectura. Se verificó que la API y PostgreSQL seguían activos y se reintentó desde la interfaz, sin reiniciarlos; la lectura se recuperó. Metro se restauró en modo de desarrollo con seguimiento de archivos, manteniendo el mismo puerto local y API de prueba.

## Evidencia y límites

TypeScript y lint aprobados tras las últimas correcciones; **20 regresiones existentes de pantalla de cuentas aprobadas**. No se añadieron pruebas nuevas para estos cambios de presentación. La suite completa de 348 casos corresponde al corte anterior, no a una ejecución nueva de toda la suite.

Capturas en `tmp/`: `account-review-real-api-2026-10-11.png`, `account-review-real-api-compact-2026-10-11.png`, `account-closed-real-api-2026-10-11.png` y `account-closed-history-real-api-2026-10-11.png`. Las referencias del caso permanecen en el JSON de fixture con `finished=true`, `reviewOnly=true`, saldo final cero y nombre histórico conservado.

Esta evidencia verifica consulta, validación, revisión y cancelación, no envío efectivo de cobro, reverso, conflicto concurrente ni dispositivo Android. No se declaró una cuenta pagada ni se eliminó el historial para cerrar el escenario. T413/T414, la igualdad visual con Figma y los demás módulos pendientes siguen abiertos.
