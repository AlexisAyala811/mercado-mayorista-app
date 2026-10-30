# Diseño interno de módulos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

La lista de módulos está en [componentes arquitectónicos](../../02-arquitectura-software/componentes-arquitectonicos.md). Este documento describe las reglas comunes a todos ellos y detalla un módulo de referencia: **Recepción y compras**, en su parte de liquidación.

## Reglas comunes

- **Negocio:** toda consulta recibe el negocio desde la identidad autenticada, nunca desde la solicitud.
- **Operaciones:** cada orden lleva un UUID de cliente y, cuando corresponde, la versión esperada del registro.
- **Precisión:** peso con tres decimales; dinero en céntimos con redondeo mitad hacia arriba.
- **Atomicidad:** la operación comercial y sus efectos financieros se confirman en la misma transacción.
- **Compensación:** anulaciones y devoluciones conservan el origen; no se borran hechos confirmados.
- **Errores:**

| Situación | Respuesta |
| --- | --- |
| Sesión inválida o vencida | `401`; la aplicación pide iniciar sesión |
| Rol o reemplazo sin permiso | `403`; la sesión se conserva |
| Recurso de otro negocio o inexistente | `404` |
| Versión desactualizada o UUID reutilizado con otros datos | `409` con código (`*-version-conflict`, `operation-id-conflict`); la aplicación pide revisión |
| Regla de negocio incumplida | `422` con mensaje en español |
| Falla de red | La orden queda pendiente en la tablet |

## Módulo de referencia: liquidación de compra

Se elige porque une pesaje, flete y obligaciones con el proveedor: una diferencia de cálculo o un reintento duplicado alteraría directamente los saldos.

### Estructura

```text
mercado-api/src/
├── purchase/
│   ├── purchase.module.ts
│   ├── purchase.controller.ts
│   ├── purchase.service.ts
│   ├── purchase.service.spec.ts
│   ├── http/settle-purchase.dto.ts
│   └── entities/purchase-settlement.entity.ts
├── common/domain/
│   ├── commercial-calculation.ts
│   ├── fixed-decimal.ts
│   ├── operation-replay.ts
│   └── proportional-allocation.ts
├── reception/
├── accounts/
├── freight/
└── audit/
```

| Elemento | Responsabilidad | Dependencias |
| --- | --- | --- |
| Controller | Recibir el contrato, aplicar guardas y delegar | Servicio, DTO, guardas |
| DTO | Validar la entrada en la frontera | class-validator |
| PurchaseService | Idempotencia, reglas y transacción | DataSource, AuditService, entidades de recepción, cuentas, caja y flete |
| common/domain | Cálculo decimal, importes por base, reparto proporcional y verificación de reintentos | Funciones puras |
| Entidades y migraciones | Estructura y restricciones persistentes | TypeORM, PostgreSQL |

### Reglas de negocio

| Regla | Comportamiento |
| --- | --- |
| Estado | Solo se liquida una recepción con pesaje cerrado y no liquidada |
| Bruto | Precio × kilos netos, o precio × sacos |
| Flete | Tarifa por kilo o por saco; se registra como costo pendiente de liquidar |
| Líquido | Bruto − flete − adelantos − descuentos; nunca negativo |
| Pago | Contado: salida de caja. Crédito: cuenta por pagar con cuotas que suman el líquido |
| Reintento | El mismo UUID con los mismos datos devuelve la liquidación original; con otros datos, `409` |
| Concurrencia | Versión de recepción desactualizada: `409` |
| Anulación | Solo el Mayorista, sin pagos vigentes ni flete ya liquidado; compensa caja o anula la cuenta |

### Ejemplo de cálculo

100 kg netos × S/ 2,00 = **S/ 200,00** bruto. Flete de S/ 0,10/kg = S/ 10,00; adelanto S/ 20,00; descuento S/ 5,00. Líquido al proveedor: **S/ 165,00**.

### Flujo

```text
validar identidad, negocio, permiso y entrada
iniciar transacción
  bloquear (negocio, UUID)
  si ya existe una liquidación con ese UUID:
    si los datos coinciden → devolverla
    si no → 409 operation-id-conflict
  bloquear la recepción y validar versión y estado
  calcular bruto, flete y líquido en céntimos
  guardar liquidación, cuenta o caja, flete pendiente
  marcar la recepción como liquidada
  registrar auditoría
confirmar transacción
```

![Paquetes del módulo de compras](../../../img/paquetes-modulo-compras.png)

La secuencia y las clases están en el [C4 nivel 4](../../04-modelo-c4/Nivel4-DiagramadeCodigo.md).

## Notas de los demás módulos

| Módulo | Particularidad de diseño |
| --- | --- |
| Identidad y acceso | Token opaco aleatorio; en la base solo se guarda su hash SHA-256. Contraseñas con scrypt. Revocar un reemplazo cierra las sesiones del Encargado. |
| Ventas y despachos | Valida el límite de crédito del comprador; solo el Mayorista autoriza excederlo. Las devoluciones reparten el descuento de la venta en proporción y compensan primero la deuda y luego la caja. |
| Cuentas y caja | Los abonos se aplican a las cuotas por fecha de vencimiento; un reverso restaura exactamente lo aplicado. |
| Costos logísticos | Una liquidación agrupa registros pendientes; un registro liquidado impide anular su operación de origen. |
| Documentos | Cada PDF se guarda con hash, versión de origen y fecha de retención; si la operación cambia, el anterior se invalida y se genera uno nuevo. |
| Mensajería | Solo registra metadatos del intento; el archivo nunca llega al servidor. |

Los estados de recepción, venta y cuenta están en [diagramas de estados](../diagramas-de-estados.md) y las tablas en [modelo de datos](../modelo-de-datos.md).
