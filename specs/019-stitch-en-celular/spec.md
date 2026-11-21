# Especificación 019: Diseño Stitch también en el celular

**Estado:** aprobada por el usuario el 20 de noviembre de 2026 (CL-19-01 a CL-19-03 con la respuesta propuesta) · **Fecha:** 20 de noviembre de 2026
**Origen:** prueba de la APK de Render en un celular Android el 20 de noviembre de 2026: el usuario esperaba el diseño de Stitch y vio el asistente anterior de cuatro pasos en «Nueva recepción». Pidió que el diseño sea «para los dos» (tablet y celular). · **Relacionadas:** [spec 011](../011-manay-app-design/spec.md) (diseño MAÑAY), [spec 018](../018-despliegue-supabase-render/spec.md) (despliegue)

## Problema

La spec 011 llevó el diseño de Stitch a la app pensando en la tablet. Dos pantallas eligen su diseño por el ancho:

| Pantalla | Archivo | Regla actual |
| --- | --- | --- |
| Compra (recepción y liquidación) | `app/src/features/reception/screens/purchase-flow-screen.tsx` | `width >= 1100 && fontScale <= 1.2` → hoja Stitch (`PurchaseSheet`); si no, asistente Datos → Pesaje → Liquidación → Confirmación |
| Venta | `app/src/features/sales/screens/sale-flow-screen.tsx` | La misma regla → `SaleSheet` o asistente anterior |

En un celular (≈ 390 px de ancho) se ve el asistente anterior. Las demás pantallas (acceso, menú, Ver compras, Ver ventas, Deudas, Cobranzas, Carros, Reportes, Analítica) ya usan el diseño de Stitch y solo reacomodan columnas según el ancho.

## Objetivo

Que compra y venta muestren la **misma hoja de Stitch** en tablet y en celular, reacomodada para una pantalla angosta en vertical, sin cambiar reglas de negocio, API, cola sin conexión ni cálculos.

## Propuesta

1. Compra y venta usan siempre `PurchaseSheet` y `SaleSheet`, en todos los anchos.
2. En anchos menores a 760 px, la hoja se apila en una columna:
   - datos del proveedor o comprador uno debajo de otro, a ancho completo;
   - pestañas de lote desplazables en horizontal;
   - cuadrícula de sacos en 2 columnas, con casillas de al menos 48 px de alto (CL-19-02, corregida el 20 de noviembre de 2026);
   - flete, resumen y total neto como tarjetas a ancho completo;
   - botón principal fijo al pie, por encima de la barra de navegación.
3. Con letra grande (`fontScale > 1.2`) se mantiene la hoja apilada en una columna. Antes, esa condición devolvía al asistente.
4. El asistente anterior de cuatro pasos deja de mostrarse. Su código se retira en una tarea posterior, cuando el celular esté verificado, para poder volver atrás si hiciera falta.

## Fuera de alcance

- Rediseñar las maquetas de Stitch: se reacomodan; no se dibujan pantallas nuevas.
- Cambios de backend, API o reglas de negocio.
- Orientación horizontal del celular: debe funcionar, pero no se optimiza.

## Criterios de aceptación

1. En un emulador con pantalla de celular (≈ 412 × 915), «Nueva compra» y «Nueva venta» muestran la hoja de Stitch apilada, sin desplazamiento horizontal de la página.
2. En la tablet (1280 × 800) las hojas se ven igual que antes de esta spec.
3. Se puede registrar una compra completa (proveedor, lote, 3 sacos, liquidación) y una venta completa desde el celular contra la API de Render.
4. Las pruebas de la app pasan (`npm run typecheck`, `npm run lint`, `npm test -- --runInBand`), con pruebas nuevas que fijan la hoja en ancho de celular.
5. Capturas de celular y tablet de compra y venta guardadas como evidencia.

## Preguntas para el usuario

| ID | Pregunta | Propuesta |
| --- | --- | --- |
| CL-19-01 | ¿El asistente de cuatro pasos desaparece del todo o queda como opción? | Desaparece; la hoja Stitch es la única forma de registrar |
| CL-19-02 | En el celular, ¿la cuadrícula de sacos en 2 o 3 columnas? | Se aprobó 3; el 20 de noviembre de 2026, al ver que la caja del peso quedaba de 16 px, el usuario eligió **2 columnas** en todo ancho menor a 760 px |
| CL-19-03 | ¿Se prueba en tu celular o basta el emulador con tamaño de celular? | Ambos: emulador para las pruebas y tu celular para la evidencia final |
