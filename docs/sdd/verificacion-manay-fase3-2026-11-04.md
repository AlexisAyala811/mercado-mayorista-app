# Verificación del diseño MAÑAY, fase 3: compra

**Fecha:** 4 de noviembre de 2026 · **Especificaciones:** [spec 011, T1120–T1124](../../specs/011-manay-app-design/tasks.md) y [spec 010, T1040](../../specs/010-purchase-lines-and-freight-choice/tasks.md) · **Rama:** `feat/011-fase3-compra`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1120 | Cabecera y navegación de la compra con los tokens MAÑAY: marca, etapa, proveedor, celular y fecha en campos con etiqueta; botones «Historial», «Menú» y la acción principal de 48 px. Se retiran las tipografías y las imágenes del Figma anterior en pesaje y liquidación |
| T1121 | `domain/reception/whole-kilograms.ts`: bruto y tara solo en kilos enteros (teclado numérico); «52,5» se rechaza con un mensaje y no se envía. El envío sigue siendo `"52"` y el backend conserva tres decimales. Netos, totales y correcciones se muestran en kilos enteros; el promedio, con un decimal, sale del total exacto en gramos |
| T1122 | Pesaje en dos columnas: a la izquierda la captura, el resultado y el cierre; a la derecha la lista. La lista es un `FlatList` con filas de 64 px (`getItemLayout`), 20 filas iniciales y ventana de 7 pantallas. «Ir al saco» busca por número de saco, desplaza la lista y resalta la fila |
| T1123 | Liquidación por lotes (T1040 de la spec 010). `groupPurchaseLots` agrupa los sacos vigentes por variedad y calidad con la misma regla de letras que `GET settlement-groups`, para funcionar también sin conexión. Cada lote tiene su base, su precio, un nombre opcional y su importe, redondeado por lote con `BigInt`. El flete es opcional y se elige quién lo asume: si lo paga el Mayorista se muestra como informativo y no se descuenta. La orden envía `lots` y `freightChargedTo` |
| T1124 (parcial) | La confirmación muestra cada lote con su cantidad, precio e importe, y el flete «descontado» o «a cargo del Mayorista» |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck` y `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 627 pruebas en 87 suites |
| `tests/reception/whole-kilograms.test.ts` | Acepta 52; rechaza 52,5, 52.5, 52.0, negativos y texto; tara vacía igual a 0; bruto mayor que tara; redondeo solo en pantalla |
| `tests/reception/purchase-settlement-flow.test.tsx` | «55,5» no se envía y muestra el aviso; la orden lleva `lots` con un lote por variedad y calidad |
| `tests/reception/tablet-weighing-list.test.tsx` | 250 sacos: menos de 250 filas montadas, altura fija, totales fuera de la lista; «Ir al saco» 200 llama a `scrollToIndex(199)`; un número inexistente muestra «No hay un saco 300 vigente.» |
| `tests/reception/purchase-preview.test.ts` | Letras como el servidor (variedad, calidad, sin calidad al final, ids); redondeo por lote; base por lote; precios pendientes por lote; flete del Mayorista sin descuento; importes exactos sin punto flotante |
| `tests/reception/tablet-settlement.test.tsx`, `purchase-confirmation.test.tsx` | Campos por lote, flete informativo y confirmación con lotes; confirmaciones antiguas sin lotes siguen legibles |

## Recorrido en el emulador

`Mercado_Tablet_API36` (1280 × 800), API local y PostgreSQL portable. Se cargó por la API una recepción con 250 sacos de 48 a 54 kg brutos y 1 kg de tara, en tres grupos: Canchán 1ra, Canchán 2da y Amarilla Tumbay sin calidad.

1. **Pesaje:** «Saco 251», totales fijos (250 sacos, 12 495 kg, promedio 50.0 kg) y lista a la derecha. «Ir al saco» 200 llevó la lista al saco 200 y lo resaltó.
2. **Cierre del pesaje** con la confirmación existente.
3. **Liquidación:** la app mostró los lotes A Amarilla Tumbay (50 sacos, 2501 kg), B Canchán 1ra (100, 4995 kg) y C Canchán 2da (100, 4999 kg). Son los mismos que devuelve `GET /purchases/receptions/:id/settlement-groups`. Precios usados: A S/ 1.80 por kg, B S/ 95 por saco con el nombre «Selecta», C S/ 1.50 por kg, y flete por saco de S/ 2 pagado por el Mayorista. Vista previa: S/ 4501.80 + S/ 9500.00 + S/ 7498.50 = S/ 21 500.30 brutos; flete informativo S/ 500.00; líquido S/ 21 500.30.
4. **Confirmación:** el servidor devolvió `grossAmountCents` 2150030, `freightAmountCents` 50000, `freightChargedTo` `wholesaler` y `liquidAmountCents` 2150030, con los lotes A 450180, B «Selecta» 950000 y C 749850. Coincide con la vista previa.

## Observaciones

- La primera versión del pesaje dejaba la lista sin altura en 1280 × 800. Se corrigió con las dos columnas y la variedad y los pesos arriba en la captura.
- El mensaje de confirmación decía «flete S/ 500.00» aunque no se descontaba. Ahora indica el número de lotes y si el flete se descuenta, es del Mayorista o no hay flete.
- En la tarifa de flete el valor inicial «0» queda delante de lo que se escribe («02»). Se interpreta bien (S/ 2.00), pero conviene vaciar el campo; queda para la fase 5.

## Pendiente

- **T1124, «Ver compras» con estado pagado o deuda:** el listado de recepciones no trae el estado de la cuenta por pagar y `GET /accounts` no filtra por compra. Hace falta un dato nuevo en el backend, que primero se aclara en la spec.
- **T1041 y T1042 de la spec 010:** prueba específica de la cola con lotes, y detalle de compra y comprobante con lotes en «Ver compras».
- Teléfono de 360 px, texto al 200 % y TalkBack (T1150).
