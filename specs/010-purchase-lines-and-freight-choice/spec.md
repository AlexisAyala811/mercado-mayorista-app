# Especificación 010: Lotes con precio propio y flete elegible en la compra

**Estado:** aclaraciones resueltas; pendiente de aprobación (`clarify`) · **Fecha:** 4 de noviembre de 2026
**Origen:** [aclaraciones del frontend MAÑAY](../../docs/sdd/aclaraciones-frontend-manay-2026-11-04.md), CL-FM08, CL-FM09 y CL-FM10 · **Spec afectada:** [002 Recepción, pesaje y liquidación de compra](../002-reception-weighing-and-purchase-settlement/spec.md)

## Objetivo

Que el Mayorista liquide una compra como se negocia en la cancha: un mismo proveedor trae, por ejemplo, Canchán de primera y Peruanita, y cada uno se paga a un precio distinto, a veces por kilo y a veces por saco. Además, que decida en cada compra si el flete se le descuenta al proveedor o lo asume él.

Hoy la liquidación admite **un solo precio y una sola base** para toda la compra, y el flete **siempre** se resta del líquido del proveedor. Con eso, el Mayorista tiene que promediar precios a mano o partir una entrega en varias compras, y pierde la trazabilidad de lo que realmente acordó.

## Trazabilidad

- **HU02:** liquidar la compra con bruto, flete, adelantos, descuentos y líquido calculados en céntimos.
- **RF07:** registrar el precio negociado y calcular importe bruto, flete por kilos o sacos, adelantos, otros descuentos y monto líquido por pagar al proveedor.
- **Relacionados:** RF14 (cuentas por pagar), RF15 (liquidación de flete), RF12 y HU10 (comprobante interno), RF04 (calidad y procedencia por saco), HU06 y spec 007 (precios para analítica).
- **Módulos:** Recepción y compras (dueño de la liquidación), Costos logísticos (registro del flete), Cuentas y caja (pago o deuda), Documentos (comprobante), Reportes y analítica (precio por variedad).
- **Calidad:** AC03 integridad (importes exactos y sin duplicados), AC07 mantenibilidad (las compras ya registradas no cambian).

## Términos

| Término | Significado |
| --- | --- |
| **Lote** | Línea de la liquidación de una compra: un grupo de sacos de la recepción con su variedad, su base y su precio. Es el nombre que usa la interfaz (CL-FM08). **No es un lote de inventario:** no tiene existencias, no se descuenta al vender y no existe fuera de su compra. |
| **Base** | Cómo se calcula el importe del lote: **por kilo** (peso neto × precio por kg) o **por saco** (cantidad de sacos × precio por saco). |
| **Flete a cargo del proveedor** | El importe del flete se resta del líquido que se paga al proveedor. Es el comportamiento actual. |
| **Flete a cargo del Mayorista** | El importe del flete no se resta al proveedor; queda solo como costo logístico del Mayorista frente al transportista. |

## Actores

| Actor | Participación |
| --- | --- |
| Mayorista | Arma los lotes, fija base y precio de cada uno, elige quién asume el flete y confirma la liquidación. |
| Encargado con reemplazo vigente | Igual que hoy en la liquidación de compra (spec 002); no obtiene permisos nuevos. |
| Proveedor | Recibe el comprobante interno con el detalle por lote; no usa la aplicación. |

## Flujo principal

1. La recepción tiene su pesaje cerrado: cada saco con variedad, calidad, procedencia, bruto, tara y neto.
2. El Mayorista abre la liquidación. La aplicación forma **un lote por cada combinación de variedad y calidad** presente en los sacos activos (CL-PL01), con su número de sacos y su peso neto, y le asigna una letra (A, B, C…). El Mayorista puede darle un nombre (CL-PL02).
3. Para cada lote elige la base (kilo o saco) y escribe el precio. La aplicación muestra una vista previa del importe de cada lote y del total.
4. Indica el flete (base y tarifa, como hoy) y elige **quién lo asume**: el proveedor (opción por defecto) o el Mayorista.
5. Registra adelantos, otros descuentos y la forma de pago (contado o crédito con cuotas), como hoy.
6. Confirma. El servidor recalcula todo, confirma la liquidación en una sola transacción con su cuenta o caja, su registro de flete y su auditoría, y devuelve el resultado oficial.

## Reglas de cálculo

Todos los importes en céntimos (`bigint`); pesos con tres decimales guardados, capturados en kilos enteros (CL-FM11).

| Concepto | Regla |
| --- | --- |
| Importe de un lote por kilo | `peso neto del lote × precio por kg`, redondeado mitad hacia arriba al céntimo |
| Importe de un lote por saco | `sacos del lote × precio por saco` (exacto) |
| Bruto de la compra | Suma de los importes de los lotes. Cada lote se redondea por separado antes de sumar |
| Flete | Igual que hoy: tarifa por kilo o por saco sobre **todos** los sacos activos de la recepción |
| Líquido, flete a cargo del proveedor | `bruto − flete − adelantos − otros descuentos` |
| Líquido, flete a cargo del Mayorista | `bruto − adelantos − otros descuentos` |
| Líquido negativo | Se rechaza con `422`, como hoy |
| Registro de flete | Se crea igual en ambos casos, pendiente de liquidar al transportista, con su importe completo |

### Ejemplo

Una recepción con 32 sacos de Canchán 1ra (1 612 kg netos) y 20 sacos de Peruanita (1 000 kg netos), flete de S/ 2,50 por saco:

| Lote | Variedad y calidad | Sacos | Neto | Base | Precio | Importe |
| --- | --- | --- | --- | --- | --- | --- |
| A | Canchán 1ra | 32 | 1 612 kg | Kilo | S/ 1,45 / kg | S/ 2 337,40 |
| B | Peruanita | 20 | 1 000 kg | Saco | S/ 90,00 / saco | S/ 1 800,00 |
| | **Bruto** | 52 | 2 612 kg | | | **S/ 4 137,40** |

| | Flete a cargo del proveedor | Flete a cargo del Mayorista |
| --- | --- | --- |
| Flete (52 sacos × S/ 2,50) | S/ 130,00 | S/ 130,00 |
| Adelanto | S/ 100,00 | S/ 100,00 |
| **Líquido al proveedor** | **S/ 3 907,40** | **S/ 4 037,40** |
| Flete pendiente con el transportista | S/ 130,00 | S/ 130,00 |

## Requisitos funcionales verificables

1. Una liquidación tiene **un lote por cada combinación de variedad y calidad** de sus sacos activos (CL-PL01); un saco sin calidad informada forma su propio grupo con su variedad. Cada lote declara su base, su precio entero en céntimos mayor que cero y, opcionalmente, un nombre de hasta 60 caracteres (CL-PL02).
2. La orden declara exactamente esos grupos: si falta uno, sobra uno o se repite, se rechaza con `422` y no se guarda nada. Así cada saco pertenece a un solo lote y ninguno queda fuera.
3. Sacos, peso neto e importe de cada lote los calcula el servidor a partir de los sacos activos; la aplicación solo los muestra como vista previa.
4. El bruto es la suma exacta de los importes de los lotes; el líquido sigue las reglas de la tabla según quién asume el flete.
5. La elección del flete es obligatoria cuando hay flete y vale «proveedor» si una aplicación anterior no la envía.
6. El registro de flete pendiente con el transportista se crea con el mismo importe en ambos casos, de modo que la liquidación de fletes (spec 004) no cambia.
7. Un reintento con el mismo `clientOperationId` y los mismos datos —incluidos lotes, bases, precios y elección del flete— devuelve la misma liquidación; con datos distintos responde `409 operation-id-conflict`.
8. Las liquidaciones ya registradas con una sola base **no se modifican**: se leen como una liquidación de un único lote con todos sus sacos, y sus importes, comprobantes y reportes siguen iguales.
9. Una aplicación anterior que todavía envía un solo precio y una sola base sigue funcionando: el servidor lo interpreta como un único lote con todos los sacos activos.
10. El comprobante interno de la compra muestra cada lote (nombre o variedad y calidad, sacos, neto, base, precio, importe). Cuando el Mayorista asume el flete, muestra la línea informativa «Flete asumido por el comprador: S/ …» sin restarla del líquido (CL-PL03).
11. Reportes y analítica calculan el precio por variedad con los importes de cada lote, no con un precio promedio de la compra.
12. La anulación de una compra con varios lotes funciona como hoy: solo el Mayorista, con motivo, y revierte cuenta o caja y flete pendiente.
13. Creación y anulación quedan en auditoría con los lotes, la elección del flete y el usuario.

## Criterios de aceptación

### Escenario: dos lotes con bases distintas

- **Dado** una recepción con pesaje cerrado de 32 sacos de Canchán 1ra (1 612 kg) y 20 de Peruanita (1 000 kg)
- **Cuando** el Mayorista liquida el lote A por kilo a S/ 1,45 y el lote B por saco a S/ 90,00, sin flete ni adelantos, al contado
- **Entonces** el bruto y el líquido son S/ 4 137,40 y la salida de caja es de S/ 4 137,40.

### Escenario: el Mayorista asume el flete

- **Dado** la misma recepción, con flete de S/ 2,50 por saco y adelanto de S/ 100,00
- **Cuando** el Mayorista elige que el flete corre por su cuenta
- **Entonces** el líquido al proveedor es S/ 4 037,40, se registra un flete pendiente de S/ 130,00 con el transportista y el comprobante no resta el flete al proveedor.

### Escenario: flete a cargo del proveedor

- **Dado** los mismos datos
- **Cuando** el flete se descuenta al proveedor
- **Entonces** el líquido es S/ 3 907,40 y el flete pendiente con el transportista sigue siendo S/ 130,00.

### Escenario: sacos sin lote

- **Dado** una recepción con sacos de dos variedades
- **Cuando** la liquidación solo declara el lote de una de ellas
- **Entonces** se rechaza con `422` indicando que hay sacos sin lote, y no se guarda nada.

### Escenario: reintento

- **Dado** una liquidación confirmada
- **Cuando** la tablet reenvía la misma orden cinco veces tras perder la respuesta
- **Entonces** existe una sola liquidación, una sola cuenta o salida de caja, un solo flete pendiente y un solo evento de auditoría; y si reenvía el mismo identificador con otro precio, recibe `409 operation-id-conflict`.

### Escenario: compra antigua

- **Dado** una liquidación registrada antes de este cambio, con una sola base y un solo precio
- **Cuando** se consulta, se descarga su comprobante o entra en un reporte
- **Entonces** muestra exactamente los mismos importes que antes.

### Escenario: aplicación anterior

- **Dado** una tablet con la versión anterior de la aplicación
- **Cuando** envía una liquidación con un solo precio y una sola base
- **Entonces** el servidor la confirma como un único lote con todos los sacos activos y el flete a cargo del proveedor.

## Requisitos de calidad

- Migración compatible y sin pérdida: tablas o columnas nuevas; ninguna liquidación existente cambia de importe.
- La liquidación de una compra de 300 sacos en 5 lotes responde en menos de 1 segundo en el servidor (AC01).
- Todo cálculo de dinero con `bigint`; ningún importe pasa por punto flotante ni en el servidor ni en la vista previa de la aplicación.

## Fuera de alcance

- Inventario, existencias o trazabilidad de un lote más allá de su compra.
- Precios por saco individual, descuentos por lote o mermas por lote.
- Varias tarifas de flete en una misma compra o flete por lote.
- Cambiar la venta: ya tiene base y precio por línea y la opción `freightIncludedInTotal`.
- Facturación electrónica (CL-FM12).

## Aclaraciones

Resueltas por el usuario el 4 de noviembre de 2026.

| ID | Pregunta | Decisión |
| --- | --- | --- |
| CL-PL01 | ¿Cómo se forman los lotes? | **Automáticamente por variedad y calidad** de los sacos ya pesados; el Mayorista solo pone base y precio. |
| CL-PL02 | ¿Se puede nombrar un lote? | **Sí, opcional** (por ejemplo «Canchán #1»); si no, se muestra la variedad y la calidad. |
| CL-PL03 | Si el Mayorista asume el flete, ¿el comprobante del proveedor lo muestra? | **Sí, como dato informativo:** «Flete asumido por el comprador: S/ 130,00», sin restarlo. |
| CL-PL04 | ¿Cambia algo de la anulación? | No: solo el Mayorista, con motivo, como hoy (CL-FM14). |

Consecuencia de CL-PL01: dos grupos de sacos de la misma variedad y calidad no pueden tener precios distintos en una misma compra. Si se necesitara, la diferencia debe registrarse como otra calidad.

## Artefactos SDD relacionados

[Checklist de requisitos](checklists/requirements.md). Siguientes fases, después de la aprobación: `plan` y `tasks`.
