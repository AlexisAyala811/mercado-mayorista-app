# C4 nivel 4: código de pesajes y liquidación de compras

> **Proyecto:** Gestión mayorista de papa · **Versión:** 1.4 · **Referencia técnica:** código inspeccionado el 8 de octubre de 2026

## Objetivo y alcance

Mostrar las clases, contratos de entrada, funciones y dependencias que colaboran al ingresar el peso de un saco (HU01) y liquidar una compra (HU02). HU05 permite preparar órdenes sin conexión en Android; la confirmación central conserva autorización, versión e idempotencia.

## Diagrama de código

![C4 nivel 4: clases de pesajes y liquidación de compras](../../img/nivel4-clases.png)

Fuente editable: [nivel4-clases.svg](../../img/fuentes-svg/nivel4-clases.svg).

La organización visual sigue cuatro columnas: presentación azul, servicios de aplicación verdes, reglas y modelos ámbar e infraestructura violeta. Los nombres corresponden al código existente. Las entidades son modelos persistentes con anotaciones TypeORM; su ubicación visual no implica un dominio independiente del ORM. `WeighingService` y `PurchaseService` reciben directamente `DataSource` y `AuditService`. No se representan puertos, repositorios propios o casos de uso extraídos como si ya estuvieran implementados.

| Elemento | Responsabilidad | Referencia técnica |
| --- | --- | --- |
| ReceptionController / AddSackDto | Recibir y validar la orden de ingreso de peso | `src/reception/reception.controller.ts`, `src/reception/http/weighing.dto.ts` |
| WeighingService | Coordinar alta, cierre y correcciones del pesaje | `src/reception/weighing.service.ts` |
| ReceptionSackEntity | Conservar variedad, secuencia, pesos, UUID y responsable | `src/reception/entities/reception-sack.entity.ts` |
| calculateWeights | Validar bruto/tara y calcular peso neto a tres decimales | Función en `weighing.service.ts` |
| PurchaseController / SettlePurchaseDto | Recibir condiciones y versión de la recepción | `src/purchase/purchase.controller.ts`, `src/purchase/http/settle-purchase.dto.ts` |
| PurchaseService | Recuperar una liquidación previa o confirmar una nueva | `src/purchase/purchase.service.ts` |
| PurchaseSettlementEntity | Conservar precio, flete, adelantos, líquido y estado | `src/purchase/entities/purchase-settlement.entity.ts` |
| calculateAmountByBasis | Calcular importes por kilogramo o saco | `src/common/domain/commercial-calculation.ts` |
| parseFixedDecimal / formatFixedDecimal | Convertir cantidades decimales con precisión definida | `src/common/domain/fixed-decimal.ts` |
| DataSource / EntityManager | Ejecutar transacciones y acceder a repositorios | Dependencias TypeORM de ambos servicios |
| AuditService | Registrar hechos en la transacción correspondiente | `src/audit/audit.service.ts` |

Las rutas de esta tabla son relativas a `mercado-api` del proyecto técnico compartido. La vista es selectiva: omite campos y métodos secundarios para conservar legibilidad. No representa una relación de composición UML entre recepción y saco: la asociación se conserva mediante `receptionId`.

## Recorrido de ingreso de pesos

1. Mayorista o Encargado con reemplazo vigente envía variedad, peso bruto, tara opcional, UUID y versión esperada.
2. El controlador aplica las guardas y validación de entrada y delega en `WeighingService.add`.
3. El servicio abre una transacción y consulta un resultado previo por negocio y UUID; si existe, lo devuelve sin otro saco.
4. Para una orden nueva valida recepción, versión, estado y variedad. `calculateWeights` exige bruto positivo y tara no negativa menor al bruto.
5. Confirma saco, secuencia, versión de recepción y auditoría juntos. Los pesos tienen tres decimales; por ejemplo, 52.500 − 0.500 = 52.000 kg.

## Recorrido de liquidación de compra

La compra utiliza una recepción con pesaje cerrado. `PurchaseService.settle` recupera primero una liquidación existente por UUID o valida recepción y versión. Calcula importes con aritmética decimal exacta y confirma liquidación, registros financieros y flete según las condiciones. Las dependencias a entidades de otros módulos permanecen explícitas; no se afirma propiedad exclusiva de tablas ni comunicación exclusivamente por una API pública de módulo.

![Secuencia de liquidación de compra](../../img/nivel4-secuencia.png)

Fuente editable: [nivel4-secuencia.svg](../../img/fuentes-svg/nivel4-secuencia.svg).

| Situación | Resultado esperado |
| --- | --- |
| Sin conexión | Orden autorizada pendiente en el cliente; no equivale a confirmación central |
| Respuesta perdida y UUID repetido | Recuperar resultado previo sin duplicar efectos |
| Versión desactualizada | Conflicto y revisión, sin sobrescribir |
| Permiso o reemplazo inválido | Rechazo central sin efectos comerciales |
| Error en la transacción | Rollback, sin confirmación parcial |
| Anulación posterior | Compensación autorizada con motivo y auditoría |

## Alcance y verificación

Las cantidades y pesos son registros históricos de cada operación. No hay saldo de mercadería, validación de disponibilidad, descuento de stock ni valoración de lotes. Se mantienen cuentas por pagar y cobrar, caja, pagos y deudas.

La inspección actual identifica cambios sin inventario y casos en `purchase-without-inventory.spec.ts`. Su existencia no acredita la ejecución de las pruebas: esta actualización documental verifica imágenes, fuentes y enlaces, sin declarar convergencia completa de la aplicación. Verificaciones funcionales pertinentes: precisión, UUID repetido, versión, permisos, atomicidad y compensación.

La extracción hacia casos de uso y puertos sigue siendo una dirección de diseño descrita en [principios de diseño](../03-diseño-de-software/diseño-interno/principios-de-diseño.md). Esta vista muestra el código actual.

Anterior: [nivel 3: componentes](Nivel3-Diagrama-de-Componentes.md). Detalle: [diseño interno](../03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md).
