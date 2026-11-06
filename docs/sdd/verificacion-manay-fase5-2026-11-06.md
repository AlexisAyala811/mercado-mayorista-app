# Verificación del diseño MAÑAY, fase 5: resto de pantallas

**Fecha:** 6 de noviembre de 2026 · **Especificación:** [spec 011, T1140–T1143](../../specs/011-manay-app-design/tasks.md) · **Rama:** `feat/011-fase5-resto`

## Qué cambió

| Tarea | Cambio |
| --- | --- |
| T1140 | Venta y Ver ventas ya usaban los tokens MAÑAY desde la fase 1 y, para Ver ventas, desde la fase 2 (sin devoluciones). No hubo cambios de código; se revisaron en el emulador |
| T1141 | **Carros:** `reference-logistics-screen.tsx` deja la maqueta del Figma anterior (colores grises fijos, tipografía Inter cargada aparte, imágenes SVG de flechas, casa y lupa). Ahora tiene una cabecera con la marca, búsqueda con etiqueta, botones de texto («Limpiar búsqueda», «Actualizar logística», «Nuevo», «Volver», «Menú», «Siguiente»), tarjetas con nombre, teléfono y placa, y la misma paginación de cuatro registros. **Reportes:** la cabecera muestra la marca, el título «Reportes» y el usuario en tamaño normal, en lugar del ícono genérico con el nombre a 40 px; «Consultar» pasa de pizarra al verde de la marca. **Analítica:** ya mostraba «Historial insuficiente para estimar» y solo ofrece evaluar y publicar con datos suficientes; está cubierto por `tests/analytics/analytics-screen.test.tsx` |
| T1142 | Pendientes de envío y el aviso de conflicto ya usaban los tokens. Un `409` queda «en revisión» sin reintento; está probado en `tests/sync/sync-provider.test.tsx` y `tests/sync/purchase-lots-queue.test.tsx` |
| T1143 | **Reemplazos (CL-FM17):** las dos fechas ISO 8601 que se escribían a mano se reemplazan por una duración desde ahora (2, 4, 8, 12 o 24 horas). La pantalla muestra el fin aproximado en hora de Lima. `domain/administration/replacement-window.ts` calcula la ventana al confirmar y no permite pasar de 24 horas. El servidor sigue validando el límite |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 649 pruebas en 92 suites |
| `tests/logistics/*` | 45 pruebas en verde con la vista nueva: búsqueda, limpiar, paginación, nuevo, editar, desactivar y salida |
| `tests/administration/replacement.test.tsx` | La ventana empieza ahora y dura como máximo 24 horas. En la pantalla no hay campos ISO; se elige al Encargado y «24 h», y se envía `startsAt` y `expiresAt` con 24 horas de diferencia y el motivo |
| Emulador `Mercado_Tablet_API36` (1280 × 800) | Nueva venta, Carros, Reportes (marca, título y «Consultar» en verde), Analítica, Pendientes de envío y Administración con el formulario de reemplazo por duración |

## Observaciones

- Reportes conserva su distribución (pestañas Compra y Venta, filtros y descargas) y sus íconos de línea. Solo cambian la cabecera y el botón principal, para no rehacer una pantalla de 600 líneas que ya está probada.
- La vista de Carros ya no trae su propia tipografía; usa la del sistema, igual que el resto de la app.

## Pendiente

- Comparación píxel a píxel con Stitch.
- Teléfono de 360 px, texto al 200 % y TalkBack (T1150).
