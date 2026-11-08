# Especificación 011: Diseño MAÑAY en la app

**Estado:** aprobada por el usuario el 5 de noviembre de 2026; siguiente fase `plan` · **Fecha:** 5 de noviembre de 2026
**Origen:** diseño de Google Stitch del usuario (16 pantallas y `DESIGN.md`) y [aclaraciones del frontend MAÑAY](../../docs/sdd/aclaraciones-frontend-manay-2026-11-04.md), CL-FM01 a CL-FM20 · **Relacionadas:** specs [001](../001-authentication-and-authorisation/spec.md) a [010](../010-purchase-lines-and-freight-choice/spec.md)

## Objetivo

Que la app de la tablet se vea y se use como el diseño MAÑAY aprobado: una sola marca, alto contraste para trabajar a pleno sol, un menú con Compra y Venta a la vista y pantallas que reflejen las reglas del negocio ya decididas. Hoy la app funciona, pero su aspecto viene de un diseño anterior en grises, conserva pantallas que el negocio no usa (inventario, devoluciones) y no muestra funciones que el backend ya ofrece (estado de cuenta, lotes con precio propio).

El cambio es **de presentación y navegación**. Las reglas de negocio, los cálculos oficiales, la cola sin conexión y la API no cambian salvo donde lo indique otra spec (009 y 010).

## Trazabilidad

- **Requisitos:** RF01–RF27 en su forma visible; en particular HU01–HU02 (pesaje y compra), HU03 (venta), HU04 y HU08 (cuentas), HU05 (sin conexión), HU07 y HU12 (acceso y reemplazo), HU16 (estado de cuenta).
- **Calidad:** AC05 usabilidad en tablet, AC06 accesibilidad, AC03 integridad (la pantalla nunca calcula saldos oficiales).
- **Decisiones:** CL-FM01–CL-FM20 del 4 de noviembre de 2026, CL-PL01–CL-PL04 (spec 010).

## Alcance

### Base visual

| Elemento | Regla |
| --- | --- |
| Marca | **MAÑAY** con el logo del usuario en el acceso, el menú y los documentos visibles en la app (CL-FM01, CL-FM02) |
| Tokens | Colores, tipografía Inter, espaciado de 8 pt y radios de `DESIGN.md`, en un solo tema MAÑAY que sustituye las paletas grises actuales (`MenuVisualTheme`, `PurchaseVisualTheme`) |
| Estados comerciales | «Pagado»/«Cobrado» en verde y «Deuda»/«Pendiente» en rojo, siempre con texto además del color |
| Contraste | WCAG AA como mínimo en todo texto; AAA en importes, saldos y estados, porque el uso es mayormente a pleno sol (CL-FM07) |
| Objetivos táctiles | 48 × 48 px como mínimo |
| Números | Cifras tabulares en importes, pesos y sacos |
| Tema oscuro | Fuera de alcance (ver CL-MD03) |

### Menú

- Un solo menú con las secciones **Compra** y **Venta** visibles a la vez, sin interruptor (CL-FM19).
- Compra: Anote, Ver compras, Carros, Deudas (a proveedores). Venta: Ventas, Ver ventas, Cobranzas (de compradores). Comunes: Reportes, Analítica, Pendientes de envío.
- El **Encargado** ve el mismo menú con menos opciones: solo lo que su rol y su reemplazo vigente permiten; la autorización sigue en el servidor (CL-FM03).
- Una barra de estado de sincronización siempre visible: sincronizado, pendientes o sin conexión.

### Pantallas

| Pantalla | Cambio | Spec |
| --- | --- | --- |
| Acceso | Diseño MAÑAY; sin barra de balanza | 001 |
| Menú | Ver arriba | 001 |
| Anote (recepción y pesaje) | Bruto y tara de cada saco en **kilos enteros**, neto visible por saco; captura pensada para 200 o más sacos: lista con totales fijos, ir al saco N, entrada consecutiva con teclado numérico (CL-FM05, CL-FM06, CL-FM11) | 002 |
| Liquidación de compra | Lotes A, B… por variedad y calidad desde `settlement-groups`, base y precio por lote, nombre opcional, flete elegible, vista previa en céntimos (CL-FM08–CL-FM10) | 010 (T1040) |
| Venta | Diseño MAÑAY sobre la captura actual | 003 |
| Ver compras / Ver ventas | Listas con estado pagado o deuda | 002, 003 |
| Deudas / Cobranzas | Dos pantallas separadas, cada una con su confirmación de guardado (CL-FM18); en el comprador, botón **Estado de cuenta** (CL-FM13) | 004, 009 |
| Estado de cuenta | Vista previa, PDF, imagen y compartir por WhatsApp o correo | 009 (T940–T944) |
| Carros | Diseño MAÑAY | 004 |
| Reportes | Diseño MAÑAY; sin «Guías SUNAT» (CL-FM12) | 006 |
| Analítica | Precios sugeridos solo cuando la spec 007 lo permite; si no, «datos insuficientes» con sus condiciones (CL-FM20) | 007 |
| Pendientes de envío | Pantalla de la cola con estado, reintento y descarte con motivo (CL-FM15) | 005 |
| Aviso de conflicto | Ante un `409` la operación no se reintenta sola; se avisa y se pide revisar (CL-FM16) | 005 |
| Autorización de reemplazo | El Mayorista autoriza al Encargado desde la tablet, máximo 24 horas (CL-FM17) | 001 |

### Retiros

- **Inventario:** rutas `inventory` e `inventory-adjustment` y sus accesos; el backend ya responde `410 Gone`.
- **Devoluciones:** sin accesos en la app (CL-FM14). La anulación queda solo para el Mayorista, con motivo.
- **Balanza conectada:** ningún texto ni indicador de balanza o báscula conectada (CL-FM04).
- **SUNAT:** ninguna mención de guías o facturas electrónicas (CL-FM12).

## Requisitos funcionales verificables

1. Toda pantalla usa el tema MAÑAY; no quedan colores fuera de los tokens.
2. El menú muestra a la vez las secciones de Compra y de Venta, y el Encargado solo ve las opciones que su rol y su reemplazo vigente permiten.
3. Ninguna pantalla ofrece inventario, devoluciones, balanza conectada ni SUNAT.
4. En el pesaje, bruto y tara aceptan solo kilos enteros; el neto lo calcula la regla común y la pantalla lo muestra por saco.
5. Con 200 sacos o más la captura sigue siendo fluida: totales siempre visibles y desplazamiento sin saltos.
6. Importes, saldos y estados oficiales se muestran tal como los devuelve la API; las vistas previas se calculan en céntimos con `BigInt` y se identifican como tales.
7. La barra de sincronización refleja la cola real: pendientes, sin conexión, conflicto.
8. Un `409` muestra el aviso de conflicto y no reintenta la operación.
9. Los textos están en español, con la marca MAÑAY, y los importes en soles con dos decimales.
10. La app sigue funcionando en teléfono con el ancho mínimo vigente (360 px) aunque el diseño se piense para tablet (ver CL-MD02).

## Criterios de aceptación

### Escenario: menú del Mayorista

- **Dado** un Mayorista con sesión iniciada en la tablet de 1280 × 800
- **Cuando** abre el menú
- **Entonces** ve a la vez Compra (Anote, Ver compras, Carros, Deudas) y Venta (Ventas, Ver ventas, Cobranzas), además de Reportes, Analítica y Pendientes de envío, con la marca MAÑAY y sin ningún acceso a inventario ni devoluciones.

### Escenario: menú del Encargado

- **Dado** un Encargado con reemplazo vigente
- **Cuando** abre el menú
- **Entonces** ve el mismo diseño solo con las opciones que su rol permite, y al vencer el reemplazo esas opciones desaparecen tras la revalidación.

### Escenario: pesaje en kilos enteros

- **Dado** el pesaje de una recepción
- **Cuando** el usuario escribe un bruto de 52 y una tara de 1
- **Entonces** el saco muestra 51 kg netos; si escribe 52,5 la app no acepta el decimal.

### Escenario: 250 sacos

- **Dado** una recepción con 250 sacos pesados
- **Cuando** el usuario se desplaza o salta al saco 180
- **Entonces** los totales de sacos y kilos siguen visibles y la pantalla responde sin trabarse.

### Escenario: sin conexión

- **Dado** que la tablet pierde la conexión con operaciones pendientes
- **Cuando** el usuario abre Pendientes de envío
- **Entonces** ve cada operación con su estado, puede reintentar o descartar con motivo, y la barra del menú indica que hay pendientes.

### Escenario: conflicto

- **Dado** una compra modificada desde otra tablet
- **Cuando** la cola recibe `409 reception-version-conflict` u `operation-id-conflict`
- **Entonces** la operación queda en revisión con un aviso claro y no se reintenta sola.

### Escenario: contraste a pleno sol

- **Dado** cualquier pantalla
- **Cuando** se mide el contraste
- **Entonces** el texto cumple AA y los importes, saldos y estados cumplen AAA.

## Requisitos de calidad

- Tablet de referencia 1280 × 800 (emulador `Mercado_Tablet_API36`) y verificación en 2560 × 1600.
- Texto ampliado al 200 % sin cortes ni superposiciones; lector de pantalla con etiquetas en cada control y estado.
- Sin regresiones: tipos, lint y las 602 pruebas actuales siguen en verde, más las nuevas.
- Cada pantalla rediseñada se compara con su captura de Stitch y se documenta la diferencia que se acepte.

## Fuera de alcance

- Cambios de reglas de negocio o de API fuera de las specs 009 y 010.
- Tema oscuro, animaciones decorativas y modo de alto contraste conmutable.
- Balanza conectada, SUNAT, inventario y devoluciones.
- Publicación en Play Store (se planifica con la puesta en producción).

## Aclaraciones

Resueltas por el usuario el 5 de noviembre de 2026.

| ID | Pregunta | Decisión |
| --- | --- | --- |
| CL-MD01 | Archivo del logo MAÑAY | **Entregado:** PNG de 1254 × 1254 con canal de transparencia, guardado en `app/assets/brand/manay-logo.png` (isotipo y nombre MAÑAY en verde) |
| CL-MD02 | ¿La app también se usa en teléfono? | **Tablet y teléfono:** se mantiene el ancho mínimo de 360 px, aunque el diseño se piense para tablet |
| CL-MD03 | ¿Hace falta tema oscuro? | **No:** solo el tema claro de alto contraste |
| CL-MD04 | ¿Orden de las pantallas? | **Base visual, acceso y menú primero;** luego Anote y liquidación; luego Deudas, Cobranzas y estado de cuenta; al final Reportes, Analítica, Carros y pantallas de cola y conflicto |

## Ampliación del 5 de noviembre de 2026: estado de pago en Ver compras

**Aprobada por el usuario el 5 de noviembre de 2026.** «Ver compras» debe mostrar si cada compra está pagada o tiene deuda (menú: «Compras pagadas y con deuda»). Hoy el listado de recepciones no trae ese dato y `GET /accounts` no filtra por compra, así que esta spec suma **una consulta de solo lectura** al backend. Es la única excepción a «sin cambios de API fuera de las specs 009 y 010».

**Regla (CL-MD05, derivada de las reglas vigentes de la spec 002 y de cuentas):**

| Situación de la compra | Estado mostrado | Saldo |
| --- | --- | --- |
| Recepción sin liquidar | Sin estado de pago | — |
| Liquidada al contado | **Pagada** | S/ 0.00 |
| Liquidada a crédito con saldo pendiente | **Con deuda** | Saldo de la cuenta por pagar |
| Liquidada a crédito con saldo cero | **Pagada** | S/ 0.00 |
| Liquidación anulada | **Anulada** | — |

**Criterios de aceptación:**

1. Cada compra liquidada de «Ver compras» muestra «Pagada», «Con deuda» (con su saldo) o «Anulada» con los colores de estado de la fase 1 (pagado `#065F46` sobre `#ECFDF5`, deuda `#991B1B` sobre `#FEF2F2`) y el texto, no solo el color.
2. El estado sale del servidor; la app no lo calcula a partir de pagos locales.
3. La consulta filtra por el negocio de la sesión, acepta solo las recepciones pedidas (hasta 100) y la usan el Mayorista y el Encargado, como el listado.
4. Sin conexión, «Ver compras» sigue funcionando sin el estado y lo indica.

## Artefactos SDD relacionados

[Plan](plan.md), [tareas](tasks.md) y [checklist de requisitos](checklists/requirements.md). Siguiente fase: aprobación del plan.

## Convergencia con Stitch — 7 de noviembre de 2026

**Estado:** especificada el 7 de noviembre de 2026; plan aprobado el mismo día («Sí, apruebo»); en implementación. **Origen:** [comparación con Stitch](../../docs/sdd/comparacion-stitch-manay-2026-11-07.md) (brechas B1–B8 y resto R1) y [aclaraciones CL-ST01–CL-ST10](../../docs/sdd/aclaraciones-convergencia-stitch-2026-11-07.md).

### Objetivo

Que cada pantalla se lea como su maqueta de Stitch en lo que las reglas aprobadas permiten: la misma cabecera y la misma barra de navegación en toda la app, un menú que diga cómo está el negocio, listas que muestren primero lo que el Mayorista busca (quién debe, cuánto y de qué) y consultas que abran con números y barras. Las diferencias aprobadas (CL-FM01–20) y las aceptadas el 7 de noviembre (CL-ST03) se mantienen.

### Requisitos

| ID | Requisito |
| --- | --- |
| RQ-ST01 (B1) | Cada tarjeta del menú tiene número de orden, ícono, título, descripción y, cuando la API lo da, un dato vivo (CL-ST08). Sin conexión el dato se oculta; la tarjeta sigue abriendo su pantalla |
| RQ-ST02 (B2) | Todas las pantallas tras el acceso tienen una barra inferior fija con «Atrás» y «Menú principal»; compra y venta agregan «Siguiente» para avanzar de paso (CL-ST07). Se retiran los botones «Volver» y «Menú» sueltos |
| RQ-ST03 (B3) | Todas las pantallas tras el acceso usan la misma cabecera: logo, antetítulo, título y usuario |
| RQ-ST04 (B4) | Al confirmar una compra o una venta, la pantalla muestra una tarjeta con el resumen (variedades, sacos, kilos, total) y las acciones «Compartir comprobante» (PDF por WhatsApp o correo con la hoja de compartir) y «Nueva compra» o «Nueva venta» |
| RQ-ST05 (B5) | Ver compras y Ver ventas abren directamente la lista, con buscador y fecha arriba, filtros Todos / Pagadas / Con deuda / Anuladas con su conteo, tres totales del filtro (total, pagado, saldo) y tarjetas con variedades, sacos, kilos, total, estado de pago y saldo. Una compra o venta con deuda ofrece «Abonar» o «Cobrar», que abre su cuenta |
| RQ-ST06 (B6) | Deudas y Cobranzas muestran arriba tres totales (saldo pendiente, abonado o cobrado este mes, vencido) y los filtros Pendientes / Todos / Al día; cada tarjeta trae «Abonar» o «Registrar cobro» (CL-ST09) además de «Ver detalle» |
| RQ-ST07 (B7) | Reportes abre con cuatro indicadores del periodo (total, volumen, precio promedio por kilo, participantes), barras por día (CL-ST10) y barras por variedad, antes de los filtros de precios y las descargas |
| RQ-ST08 (B8) | Analítica abre con la pizarra: por variedad, el precio pactado de la última semana con datos y sus barras de las últimas 8 semanas (CL-ST06); el precio sugerido solo aparece con datos suficientes (CL-FM20). Los filtros quedan debajo |
| RQ-ST09 (R1) | Ninguna pantalla menciona devoluciones (CL-FM14) |

### Criterios de aceptación

- **Dado** el Mayorista en el menú con conexión, **cuando** hay cuentas por pagar abiertas, **entonces** la tarjeta Deudas muestra «Por pagar S/ X» con el saldo que da el servidor; **sin conexión**, la tarjeta no muestra importe.
- **Dado** cualquier pantalla tras el acceso, **cuando** el usuario toca «Menú principal», **entonces** vuelve al menú; «Atrás» regresa a la pantalla anterior o al menú si no hay anterior.
- **Dado** Ver compras con 2 compras pagadas y 2 con deuda en el filtro, **cuando** abre la pantalla, **entonces** ve «Todas 4 · Pagadas 2 · Con deuda 2», los totales del servidor y cada tarjeta con variedades, sacos, kilos y saldo; al tocar «Con deuda» la lista y los totales se filtran en el servidor.
- **Dado** una cuenta por pagar abierta en Deudas, **cuando** el Mayorista toca «Abonar» en la tarjeta, **entonces** se abre el formulario de pago de esa cuenta con su confirmación, y el pago repetido con el mismo `clientOperationId` no duplica el efecto.
- **Dado** un periodo con compras en tres días, **cuando** se abre Reportes, **entonces** ve tres barras con el valor escrito junto a cada una.
- **Dado** una variedad sin 26 semanas de historia, **cuando** se abre Analítica, **entonces** la pizarra muestra su precio pactado y sus barras, y «datos insuficientes» en lugar del precio sugerido.
- **Dado** un resumen de ventas con devoluciones en el servidor, **cuando** se muestra en Reportes, **entonces** no aparece ninguna mención a devoluciones.

### Calidad

Las de la spec 011: 1280 × 800 y 2560 × 1600, 360 dp, texto al 200 %, contraste AA y AAA en importes, y el valor de cada barra también en texto para el lector de pantalla. Las ampliaciones de la API son de solo lectura, filtran por el negocio de la sesión, usan `@Roles` y no cambian la base de datos.

### Fuera de alcance

Selección rápida de operador, pesaje y liquidación en una sola pantalla y botón flotante en Carros (CL-ST03); gráficos de línea o dona (CL-ST05); serie diaria en Analítica (CL-ST06); impresión directa.
