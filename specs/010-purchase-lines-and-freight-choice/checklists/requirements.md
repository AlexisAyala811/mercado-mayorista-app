# Revisión de requisitos de lotes con precio propio y flete elegible

- [x] Trazabilidad a HU02 y RF07, con RF04, RF12, RF14, RF15, HU06 y HU10 relacionados.
- [x] «Lote» definido como línea de la liquidación, sin inventario, existencias ni trazabilidad fuera de la compra.
- [x] Cálculo en céntimos con `bigint`, redondeo por lote mitad hacia arriba y ejemplo verificado a mano.
- [x] Las dos opciones de flete cubiertas por escenarios, con el mismo flete pendiente frente al transportista.
- [x] Cobertura total de sacos: ningún saco sin lote ni repetido.
- [x] Idempotencia y `409 operation-id-conflict` incluyendo lotes, bases, precios y elección del flete.
- [x] Compatibilidad con liquidaciones antiguas y con aplicaciones anteriores.
- [x] Impacto en comprobante, reportes y analítica identificado.
- [x] Anulación sin cambios: solo el Mayorista, con motivo (CL-FM14).
- [x] Aprobación del usuario el 4 de noviembre de 2026.
- [x] Aclaraciones CL-PL01 a CL-PL04 resueltas por el usuario el 4 de noviembre de 2026.

## Artefactos

[Especificación](../spec.md), [plan](../plan.md) y [tareas](../tasks.md).
