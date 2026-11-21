# Tareas 019: Diseño Stitch también en el celular

**Especificación:** [spec 019](spec.md) · **Estado:** en curso desde el 20 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1901** Compra y venta muestran siempre la hoja Stitch (`sheet = true` en `purchase-flow-screen.tsx` y `sale-flow-screen.tsx`). **Hecho el 20 nov 2026:** capturas de la app web a 412 px y a 1280 px contra la API local, sin desplazamiento horizontal de la página en ninguno de los dos anchos.
- [x] **T1902** Hoja apilada en el celular. Por debajo de 760 px, la cuadrícula de sacos usa 2 columnas (`useSheetColumns`, CL-19-02), la tabla de resultados se desliza de lado dentro de su tarjeta (`SheetTable`, 880 px mínimo), los campos no pasan del ancho de su tarjeta (`maxWidth: '100%'`) y la caja del peso se encoge dentro de la casilla (`minWidth: 0`). **Hecho:** `app/tests/reception/purchase-sheet.test.tsx` comprueba la cuadrícula virtualizada con 5 columnas en tablet y con 2 en celular. En la tablet la hoja se ve como antes.
- [x] **T1903** Pruebas del asistente anterior pasadas a la hoja. **Hecho:**
  - `app/tests/reception/purchase-sheet-guards.test.tsx` (30 pruebas): guardias de salida, recuperación, fallos de almacenamiento, cuotas a crédito, corrección de saco, características del saco y fecha a medianoche.
  - `app/tests/sales/sale-sheet-guards.test.tsx` (9 pruebas).
  - Se retiraron `purchase-settlement-flow.test.tsx` y `sale-flow.test.tsx`. No se trasladaron:
    - los casos que gestionaban proveedores, calidades o compradores desde enlaces que la hoja no tiene (CL-ST23, CL-ST28);
    - el resumen por variedad del asistente;
    - la línea en edición del formulario anterior;
    - los casos que la hoja ya cubría en `purchase-sheet-flow.test.tsx` (identidad local sin conexión, no liquidar si falla el cierre, retomar un pesaje cerrado).
  - Suite completa: 108 archivos y 742 pruebas en verde; `tsc` y `expo lint` sin errores.
- [ ] **T1904** APK con la hoja para celular; prueba de compra y venta en el celular del usuario contra la API de Render, con capturas.
- [ ] **T1905** Retirar el código del asistente anterior (`ReceptionDetailsScreen`, `WeighingScreen`, `SettlementScreen` como pasos y la rama del formulario de venta), una vez cerrada T1904.
