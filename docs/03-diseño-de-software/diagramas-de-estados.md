# Diagramas de estados

> **Proyecto:** Gestión comercial mayorista de papa · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026 · **Fuente:** enumeraciones y servicios de `mercado-api`

Cada cambio de estado incrementa la `version` del registro y queda en auditoría. Ningún estado final borra datos: las anulaciones conservan la operación con su motivo.

## Recepción (Recepción y compras)

```mermaid
stateDiagram-v2
    [*] --> Borrador: registrar recepción
    Borrador --> Pesaje: primer saco
    Pesaje --> Pesaje: agregar, corregir o retirar saco
    Pesaje --> Pesada: cerrar pesaje (≥ 1 saco)
    Pesada --> Pesada: corregir saco con motivo (solo Mayorista)
    Pesada --> Liquidada: liquidar compra
    Borrador --> Anulada: anular (solo Mayorista)
    Pesaje --> Anulada: anular (solo Mayorista)
    Pesada --> Anulada: anular (solo Mayorista)
    Liquidada --> Anulada: anular la compra (sin pagos vigentes ni flete liquidado)
```

| Estado | Código | Qué se puede hacer |
| --- | --- | --- |
| Borrador | `draft` | Agregar el primer saco o anular |
| Pesaje | `weighing` | Agregar, corregir o retirar sacos; cerrar el pesaje |
| Pesada | `weighed` | Liquidar la compra; el Mayorista puede corregir un saco con motivo |
| Liquidada | `settled` | Consultar; anular solo a través de la anulación de la compra |
| Anulada | `voided` | Solo consulta |

## Venta (Ventas y despachos)

```mermaid
stateDiagram-v2
    [*] --> Confirmada: registrar venta
    Confirmada --> Confirmada: devolución comercial (solo Mayorista)
    Confirmada --> Anulada: anular (sin cobros vigentes, sin devoluciones, flete sin liquidar)
```

Una devolución no cambia el estado de la venta: crea un registro de devolución, incrementa la versión de la venta y compensa la cuenta por cobrar o devuelve dinero de caja.

## Cuenta por pagar o por cobrar (Cuentas y caja)

```mermaid
stateDiagram-v2
    [*] --> Abierta: compra o venta a crédito
    [*] --> Pagada: crédito por importe cero
    Abierta --> Abierta: abono parcial o devolución parcial
    Abierta --> Pagada: abono o devolución que deja saldo cero
    Pagada --> Abierta: reverso de un abono
    Abierta --> Anulada: anulación de la operación de origen
    Pagada --> Anulada: anulación de la operación de origen
```

| Estado | Código | Saldo |
| --- | --- | --- |
| Abierta | `open` | Mayor que cero; admite abonos |
| Pagada | `paid` | Cero; admite el reverso de un abono |
| Anulada | `voided` | Cero; no admite movimientos |

Las cuotas tienen dos estados, `open` y `paid`, según su saldo. Para anular la operación de origen, primero hay que revertir los abonos vigentes.

## Registro de flete y estiba (Costos logísticos)

```mermaid
stateDiagram-v2
    [*] --> Pendiente: compra o venta con flete / registro de estiba
    Pendiente --> Liquidado: liquidación (salida de caja)
    Pendiente --> Anulado: anulación de la operación de origen (solo flete)
```

## Intento de envío (Mensajería)

```mermaid
stateDiagram-v2
    [*] --> Preparado: archivo y destinatario validados
    Preparado --> CompartirSolicitado: se abrió WhatsApp o el correo
    Preparado --> Fallido: no se pudo abrir la aplicación externa
```

«Compartición solicitada» no significa entregado ni leído: el envío final lo confirma el Mayorista en la aplicación externa.
