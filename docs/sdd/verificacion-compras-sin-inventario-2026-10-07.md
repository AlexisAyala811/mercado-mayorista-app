# Corte técnico de compras sin inventario

La aprobación analítica completa está registrada en `analytics-decision-proposal.md` y no equivale a haber implementado estimaciones. Este corte mantiene los criterios de 007 y adapta su fuente descriptiva de compras al alcance aprobado sin inventario.

## Cambios y evidencia

- Cierre y corrección del pesaje: conserva estados/versiones, UUID de reintento, sacos originales corregidos y auditoría; no crea o modifica lotes.
- Liquidación y anulación: conserva cálculos, flete, caja, cuentas, cuotas, restricciones de pagos y reversos; no crea movimientos o valoraciones de mercadería ni bloquea por movimientos posteriores de stock. No elimina datos históricos.
- Historial de precios: obtiene variedades desde sacos activos, conserva precio/base de liquidación y evita repetir observaciones por saco.
- Analítica de compras: agrega cantidad/peso por operación/variedad y bruto antes de descuentos/flete, sin existencia ni margen.
- Resumen e historial: intervalo diario en America/Lima; las cuentas pendientes siguen siendo saldos vigentes y no una reconstrucción a fecha de corte.

Backend verificado: 106 pruebas en 37 suites, TypeScript, lint y compilación. Cuatro pruebas nuevas de dominio verifican cierre/corrección, liquidación al contado con reverso y liquidación a crédito sin permitir acceso a repositorios de inventario.

`mercado-api/test/purchase-report-no-inventory.mjs` ejecuta las consultas compiladas contra PostgreSQL 17 aislado. Todas las tablas son temporales y terminan con rollback: 2 compras incluidas, 2 observaciones de precio, 4 sacos activos, 60.000 kg, 15000 céntimos, 2.5000 S/kg. Prueba los cuatro extremos de un día local, excluye pesajes corregidos y comprueba aislamiento por negocio. Sin escrituras comerciales persistentes ni predicciones.

## Pendientes de cierre

SI-03 requiere aún recorrido transaccional completo con API/PostgreSQL. SI-04/SI-05 deben adaptar líneas y compensaciones de ventas; las consultas analíticas de ventas siguen usando la relación histórica de lote. No se declaran terminados frontend, predicción, validación Android ni convergencia completa con Figma.
