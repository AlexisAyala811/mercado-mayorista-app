# Aclaraciones del frontend MAÑAY

**Fecha:** 4 de noviembre de 2026 · **Fase SDD:** `clarify` · **Origen:** diseño de Google Stitch entregado por el usuario (16 pantallas, `DESIGN.md` «AgroGestión Terra») y respuestas del usuario a 20 preguntas de mejora más 4 aclaraciones.

El diseño de Stitch es la referencia visual de la app Expo existente. No se integra su HTML: las pantallas se rehacen en React Native sobre la lógica, la cola sin conexión y la API actuales.

## Respuestas

| ID | Pregunta | Respuesta del usuario | Consecuencia |
| --- | --- | --- | --- |
| CL-FM01 | Nombre del producto | **MAÑAY** es el nombre definitivo | Unificar la marca en todas las pantallas; quitar «AgroGestión Terra», «AgroPapa», «AgroControl» y «Bodega central» |
| CL-FM02 | Logo | El usuario tiene logo propio | Pedir el archivo; no usar el ícono generado por Stitch |
| CL-FM03 | Quién usa la tablet | Mayorista y Encargado | El Encargado ve **el mismo menú con menos opciones**: solo las que su rol y su reemplazo vigente permiten; la autorización sigue en el servidor |
| CL-FM04 | Balanza | Se lee **a mano** | Quitar «Báscula conectada», «Calibrada» y «Balanza electrónica» de todas las pantallas; se mantiene el pesaje manual del MVP |
| CL-FM05 | Tara | Se registra **la tara de cada saco**; la compra muestra el neto por saco | Coincide con el backend (`grossWeightKg`, `tareKg`, `netWeightKg` por saco). La pantalla de Stitch solo tiene un campo por saco: hay que añadir bruto y tara |
| CL-FM06 | Muchos sacos | Con 200 o más, repensar la cuadrícula de 5 columnas | Diseñar captura para cargas grandes: lista virtualizada, ir al saco N, totales fijos y entrada consecutiva con teclado numérico |
| CL-FM07 | Condiciones de uso | La mayoría de las veces **a pleno sol** | Alto contraste por defecto (WCAG AA como mínimo, AAA en importes y estados), números grandes y objetivos táctiles de 48 px |
| CL-FM08 | «Lote A / Lote B» dentro de una compra | Está bien | Se conserva la palabra en la interfaz. **No es un lote de inventario**: es una línea de la compra (variedad y calidad) con su precio. No se crea entidad de lote, stock ni existencias |
| CL-FM09 | Base del precio | A veces por kilo, a veces por saco, a veces ambos. **Aclarado: cada lote elige su base** | **Cambio de backend.** Hoy la liquidación de compra tiene una sola base (`priceBasis`) y un solo precio (`unitPriceCents`); hay que pasar a precio y base por línea |
| CL-FM10 | Flete en la compra | Se descuenta al proveedor o lo paga el Mayorista. **Aclarado: se elige en cada compra** | **Cambio de backend.** Hoy el flete de compra siempre se resta del líquido; la venta ya tiene `freightIncludedInTotal`. Añadir la elección en la liquidación |
| CL-FM11 | Decimales de peso | Sin decimales, son exactos. **Aclarado: solo kilos enteros** | La app acepta bruto y tara solo en kilos enteros y los muestra sin decimales. El backend sigue guardando tres decimales (los enteros son válidos) y no cambia; los datos ya registrados con decimales se muestran redondeados solo en pantalla, nunca en los cálculos |
| CL-FM12 | Guías y facturas SUNAT | Fuera del alcance; tal vez a futuro | Quitar «Guías SUNAT» de Reportes. Una integración con SUNAT requiere su propia especificación |
| CL-FM13 | Estado de cuenta HU16 | Un botón dentro de «Deudas» y una pantalla propia | Botón «Estado de cuenta» en el comprador dentro de Deudas, que abre una pantalla propia con vista previa, PDF, imagen y compartir (spec 009, T940–T944) |
| CL-FM14 | Devoluciones y anulaciones | **Aclarado: en el negocio no se usan.** Confirmado el 4 de noviembre: la anulación se conserva **solo para el Mayorista** | La app no muestra devoluciones. Anular compra, venta o recepción queda solo para el Mayorista, como corrección de errores con motivo obligatorio |
| CL-FM15 | Sin conexión | Pantalla de cola | Pantalla «Pendientes de envío» con estado de cada operación, reintento y descarte con motivo (spec 005) |
| CL-FM16 | Conflicto con otra tablet | Se avisa | Al recibir `409` (`*-version-conflict` u `operation-id-conflict`) la operación no se reintenta sola: se muestra un aviso y se pide revisar |
| CL-FM17 | Reemplazo del Encargado | El Mayorista lo autoriza desde la tablet | Pantalla de autorización de reemplazo para el Mayorista (máximo 24 horas, HU12) |
| CL-FM18 | Dos «Deudas» y dos «Guardado» | Una es Deudas (a proveedores) y otra Cobranzas (de compradores), cada una con su confirmación | Dos pantallas y dos confirmaciones distintas; no son variantes |
| CL-FM19 | Menú Compra / Venta | Menú con **las dos secciones visibles** | Sustituir el interruptor Compra/Venta por un menú con ambas secciones a la vista |
| CL-FM20 | Precios de mercado en Analítica | Son **precios sugeridos** | Solo se muestran como estimación cuando la spec 007 lo permite (26 semanas, evaluación y revisión); si no, la pantalla muestra «datos insuficientes» con sus condiciones |

## Cambios de backend que piden estas respuestas

Se especificarán antes de implementarse:

1. **Compra con varias líneas de precio** (CL-FM08, CL-FM09). Cada lote de la compra tiene variedad, base (kilo o saco) y precio propios; el bruto es la suma de las líneas. Debe convivir con las liquidaciones existentes de una sola base sin modificarlas (migración compatible) y conservar idempotencia, versión y auditoría.
2. **Flete de compra a cargo del Mayorista** (CL-FM10). Una marca en la liquidación decide si el flete se descuenta del líquido del proveedor o se registra solo como costo logístico del Mayorista.
3. **Ocultar devoluciones** (CL-FM14). Sin cambio de backend: anular ya es exclusivo del Mayorista (`@Roles(UserRole.Wholesaler)` en compra, venta y recepción) y exige motivo de 1 a 240 caracteres.

## Decisión: devoluciones y anulaciones — 4 de noviembre de 2026

Las specs 003 y 004 tienen implementadas la anulación de compras y ventas y la devolución comercial, con sus pruebas. Sin anular, un error ya confirmado (proveedor equivocado, precio mal escrito) no se podría deshacer, porque la regla es no borrar hechos.

El usuario aprobó la recomendación:

- **Devoluciones:** no se muestran en la app.
- **Anulación:** se conserva solo para el Mayorista, como corrección de errores con motivo obligatorio. El Encargado no la ve.
- **Backend:** sin cambios. Los endpoints de devolución se mantienen para no romper la historia, las migraciones ni las pruebas; la app simplemente no los usa.

## Correcciones visuales detectadas en las 16 pantallas

- Íconos que no cargan en el menú («Ver compras», «Analítica») y textos cortados («Compr a», «ONLIN E», «Atrá s», «Siguient e»).
- Bloques vacíos de proveedor y de resumen en la compra.
- En Carros, el peso se superpone al nombre del chofer.
- Fechas de 2024 en los datos de ejemplo.
- Cálculos con `parseFloat` y `toFixed`: en la app los importes se calculan en céntimos y los saldos oficiales los devuelve la API.
