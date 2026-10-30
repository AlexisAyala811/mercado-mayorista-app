# Referencias descriptivas por semana — 13 de octubre de 2026

Corte de trazabilidad T707/T711 contra el contrato 007 vigente: cada punto ya devuelve operationIds y compensationIds, pero la pantalla solo mostraba conteos. Se incorporó PointSources dentro de su tarjeta, con expansión explícita, grupos separados de operaciones/devoluciones, páginas locales de 20, rango/conteo y controles accesibles identificados por tipo/variedad/semana. Las referencias son seleccionables; no se convierten en nuevas operaciones, filtros, precios ni habilitación predictiva.

Cerrar la expansión desmonta sus páginas. Un conjunto reducido ajusta el offset al rango existente y no sigue mostrando IDs del resultado anterior. Se reutilizan componentes/tokens del proyecto; no se declara diseño DS-044/DS-045 terminado.

## Verificación ejecutada

- TypeScript y lint correctos. La primera comprobación de tipos detectó comparación del host ficticio de ReactTestRenderer con ElementType; se corrigió el selector del test y TypeScript volvió a pasar.
- Analítica enfocada: 39 casos / 10 suites aprobados. Tres regresiones nuevas comprueban expansión sin modificar cantidades, acceso a la referencia 21 y reinicio al cerrar, y reducción del resultado sin referencias anteriores/página vacía.
- Suite completa posterior: **446 pruebas / 66 suites**, código cero.
- Export web aislado con URL QA explícita, 20 rutas, código cero: `tmp/web-export-analytics-sources-2026-10-13`. No se reemplazó `mercado-app/dist` ni la pantalla reservada a la acción humana de devolución.
- Bundle `entry-ce0ce5ef09dfe40b999c43fcdb1f45a8.js`, SHA-256 `02A4D934D74499AF360FDC56D966A5DD52125F42110CC902C002101ACB0B9041`.
- Verificador PDF extendido con --export-root dentro del workspace, manteniendo dist por defecto. Ejecución real sobre el export aislado: 200 archivos por raíz, versión 6.4.299 y hashes iguales a la dependencia instalada a 2026-10-14T02:11:35Z.

## Recorrido posterior con API real

Se añadió a `mercado-app/dist` únicamente el HTML de analítica de este export y dos assets nuevos con nombres por contenido. Los assets existentes se compararon por SHA-256 antes de copiar, sin sustituir ni borrar ninguno. El entry anterior mantiene su hash `6C6FCF71CE1E14F2CAB9212BBE5C1D317EEE3A07ABE1EA1264818E4E570BB45B`; HTML anterior conservado en `tmp/analytics-before-sources-20261013.html`. HTML de analítica nuevo: SHA-256 `895921AE95C8C167A5607F852C8D49AE6393F64EEFE08D47DE94B92BC10D91BA`. Es un corte QA deliberadamente mixto: solo la navegación directa a `/analytics` inicia este bundle; las otras rutas y la pestaña de devolución abierta conservan el anterior. No atribuir la nueva presentación a todo el dist.

Nueva pestaña `/analytics` en el mismo origen permitido, con sesión Mayorista QA existente, sin cambiar CORS, API ni base. Consulta del 1 al 13 de octubre: la semana del 12 mostró una operación, 10 kg, S/2.5000/kg y al expandir su referencia central `108b4b3c-4e51-4aef-9ab5-17bfc10f1678`; devoluciones incorporadas cero. Al cambiar Desde al 5 de octubre, las referencias previas desaparecieron antes de consultar nuevamente. La semana completa del 5 mostró dos referencias distintas, dos operaciones, 33 sacos y 1650 kg. Cerrar y abrir referencias funciona en UI real. No se ejecutó ninguna mutación comercial.

Capturas inspeccionadas: `tmp/analytics-sources-phone-20261013.png` a 360 × 800 y `tmp/analytics-sources-tablet-20261013.png` a 1280 × 800. La referencia larga envuelve dentro de la tarjeta en teléfono; controles, cantidades y grupos son legibles. Se restauró el viewport al finalizar. Inspección dirigida de consola sin errores/avisos. Esto acredita presentación web en esos tamaños, no TalkBack ni ejecución Android.

## Límites actualizados

La página analítica directa sí se inspeccionó con API real y tamaños web móviles según el recorrido anterior. El resto del dist servido conserva el corte de 443 pruebas; Android también precede a PointSources y debe regenerarse antes de verificarla allí. La paginación de más de veinte referencias se acredita por las regresiones, no por esta colección QA pequeña. No hay devolución confirmada en este recorrido para probar un grupo de compensaciones no vacío. Calidad/procedencia comerciales, otros indicadores, predicciones, Figma, Android y accesibilidad global siguen pendientes. Los IDs de operaciones aportan trazabilidad de una agregación; no sustituyen calidad/procedencia comercial ni una instantánea histórica de entrenamiento.

La devolución de la otra comprobación sigue preparada para ejecución humana: se volvió a observar su diálogo y versión cero sin pulsar la confirmación. No se exportó encima ni se envió la operación por otra vía.
