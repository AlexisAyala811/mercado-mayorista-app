# Historias de usuario y aceptación

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Contenido derivado de `build_propuesta.py`, conservando los identificadores de la propuesta vigente. Las reglas detalladas se mantienen en las especificaciones aprobadas del proyecto documental compartido.

| Historia y RF | Historia de usuario | Criterio principal de aceptación |
| --- | --- | --- |
| HU 01<br>RF05, RF06, RF06A, RF06B | Como mayorista o encargado que lo reemplaza, quiero registrar al proveedor, las variedades y el peso de cada saco durante la descarga. | El sistema agrupa los pesos por variedad, acumula totales parciales y generales y permite cerrar el cargamento. |
| HU 02<br>RF07, RF14 | Como encargado, quiero registrar el precio acordado, el flete, los adelantos y la forma de pago para calcular el monto líquido del proveedor. | El sistema resta flete y adelantos, registra pago al contado o cuotas y mantiene el saldo pendiente. |
| HU 03<br>RF08, RF10, RF13, RF15 | Como encargado, quiero registrar un despacho mayorista a otro departamento con sacos, variedades y flete acordados. | La venta identifica comprador, destino, vehículo, cantidades y flete; descuenta existencias y genera cobro o saldo. |
| HU 04<br>RF13, RF14, RF15 | Como mayorista, quiero consultar obligaciones y cobranzas por vencimiento para priorizar pagos y seguimiento. | La consulta muestra origen, vencimiento, abonos y saldo actualizado. |
| HU 05<br>RF04, RF08, RF17 | Como mayorista, quiero revisar existencias por variedad y lote para decidir qué mercadería vender o reponer. | El tablero muestra saldo, antigüedad y movimientos trazables. |
| HU 06<br>RF21, RF22 | Como encargado que reemplaza al mayorista, quiero pesar e ingresar compras y ventas cuando se interrumpa Internet. | La operación autorizada queda pendiente y se sincroniza una sola vez al recuperar conexión. |
| HU 07<br>RF19, RF17 | Como mayorista, quiero que la IA analice la información acumulada para descubrir tendencias y patrones y, cuando sea posible, estimar el precio semanal. | El tablero diferencia resultados descriptivos de predicciones e indica periodo, rango, confianza y comparación con el valor real. |

## Recorridos representativos

| Recorrido | Inicio | Resultado observable | Excepción a contemplar |
| --- | --- | --- | --- |
| HU01 Recepción/pesaje | Camión identificado y variedades seleccionadas | Sacos y pesos individuales conservados, totales por variedad y cierre | Peso inválido, corrección, conflicto de versión |
| HU02 Liquidación | Pesaje cerrado y condiciones negociadas | Bruto, flete, descuentos, líquido y pago o cuotas confirmados | Orden duplicada, saldo inconsistente, autorización vencida |
| HU03 Venta/despacho | Comprador y lotes disponibles | Movimiento de stock y cobro o cuenta trazables | Stock insuficiente o modificación concurrente |
| HU04 Obligaciones | Mayorista consulta cuentas | Vencimientos, abonos y saldo por origen | Pago superior al saldo |
| HU05 Existencias | Mayorista consulta variedad/lote | Disponibilidad y movimientos identificables | Lote pendiente de liquidación |
| HU06 Continuidad | Se interrumpe Internet | Órdenes pendientes recuperadas sin duplicar efectos | Reemplazo revocado o conflicto al reconectar |
| HU07 Analítica | Historial validado y acceso del Mayorista | Descriptivos diferenciados de estimaciones | Datos insuficientes; CL-08 pendiente |

Los criterios de la tabla inicial conservan la propuesta. Estos recorridos explican su verificación; no sustituyen las especificaciones detalladas ni autorizan funciones nuevas.
