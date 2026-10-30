# Corte vertical de ventas sin inventario

Fecha: 7 de octubre de 2026. Fuente aprobada: `cambio-alcance-sin-inventario.md`; especificación 003 reconciliada antes de implementar. El objetivo completo de frontend sigue activo.

## Comportamiento implementado

- POST /sales recibe variedad, sacos, peso, base y tarifa por línea; valida catálogo activo del negocio. No requiere compra, recepción, lote, disponibilidad o versión de stock. Los contratos antiguos de lote son rechazados en el límite HTTP, sin conversión silenciosa de dinero pendiente.
- Migración 020 añade variedad y la rellena desde relaciones históricas compatibles por negocio. Conserva lotes/versiones originales y admite referencias nulas en ventas nuevas. Índice parcial evita repetir variedad en una venta nueva sin prohibir líneas históricas de distintos lotes. Reversión rechazada si perdería ventas independientes. No elimina datos históricos.
- Confirmación conserva UUID/advisory lock, cálculo half-up por línea, caja o cuenta/cuotas, límites de crédito, flete y auditoría. No crea movimientos ni coste por lote. Anulación conserva controles financieros y versiones sin restaurar stock.
- Devolución comercial valida acumulados contra cantidades/importes originales, sin reposición física previa ni valoración. Conserva descuento prorrateado, flete explícito, reducción de saldo/cuotas, egreso por excedente, UUID, versión, invalidación del PDF y comprobante.
- Comprobantes e historial de precios/series/suficiencia leen variedad de línea, conservando cantidades e importes por operación. Los endpoints antiguos /inventory responden 410 autenticado sin ejecutar servicio de existencias.
- Formulario selecciona variedades del catálogo, no consulta /inventory, muestra cálculo provisional y acuerdo concreto, valida dinero/peso/sacos/cuotas, conserva cola duradera, envío y recuperación del detalle central. Carga fallida ofrece reintento y catálogos vacíos enlazan su gestión. Historial ya no exige devolución física.

## Evidencia actual

Frontend: TypeScript, lint y 211 pruebas en 35 suites. Backend: TypeScript, lint, build y 117 pruebas en 39 suites. Hubo un timeout transitorio en menú durante la primera corrida; la repetición completa pasó sin modificar ese test ni aumentar su timeout.

PostgreSQL aislado: 9 pruebas de `test/commerce-without-inventory.e2e-spec.ts`, mediante `tmp/run-no-inventory-e2e.ps1`: migración/backfill y reversión protegida; venta sin compras/reintentos concurrentes; corrección, cierre, liquidación y anulación de compra; anulaciones al contado y crédito/versiones; aislamiento; devolución al contado y acumulados; compra 100/venta 30 sin saldo de 70; devolución a crédito aplicada a vencimientos más lejanos. No se crean lotes, movimientos de stock, valoraciones o costes de lote en esos negocios ficticios. La suite histórica basada en stock se conserva como `.ts.txt` en `test/historical`; no es aceptación vigente. Esto no acredita todos los escenarios financieros/regresiones del proyecto.

Migración 020 aplicada también a la base aislada de la interfaz, conservando datos anteriores. API local actualizada. Metro en modo CI entregó inicialmente un bundle antiguo; se identificó su proceso exacto y se recargó ese servicio para verificar el código actual.

Navegador: seleccionó Comprador QA y Canchán QA, agregó 30 sacos/1500 kg a S/1.50 por kg, revisó S/2250.00 al contado y confirmó mediante la cola y API local. El servidor devolvió venta confirmada y la cola quedó sin pendientes. Captura: `tmp/sale-without-inventory-confirmed-web-2026-10-07.png`.

API/PostgreSQL de esa venta: `tmp/sale-without-inventory-api-2026-10-07.json`, venta c0c84f51-f954-40a1-ada0-294674e59acb. Línea con lote nulo, un cobro y una confirmación auditada; cero movimientos/coste de stock. Reenvío HTTP mismo UUID retorna la venta original; contrato con lotId/expectedLotVersion responde 400, /inventory/lots autenticado 410. Los scripts no conservan tokens ni credenciales en la evidencia.

## Pendientes antes de cerrar el frontend

Convergencia visual exacta de Venta y demás marcos con Figma, tamaños y recorridos Android, nuevas exportaciones, recorridos offline de ventas sin inventario y revisión de operaciones antiguas pendientes, protección de cambios sin guardar, todos los controles financieros de cobros/flete liquidado, paginación y búsquedas completas, y predicción/evaluación/publicación 007. La documentación académica se mantiene en la tarea documental; no se regeneró el DOCX antiguo. No hay despliegue de producción.
