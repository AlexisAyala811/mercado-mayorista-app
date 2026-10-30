# Analítica: periodos civiles, hora de Lima y revisión web

## Alcance implementado

Contra la especificación y contrato 007, la interfaz valida fechas civiles reales, orden y máximo inclusivo de 366 días antes de solicitar la serie descriptiva. Rechaza año cero, fechas imposibles y formatos incompletos. Disponibilidad predictiva valida solo `Hasta`; `Desde` vacío o distinto no reduce su historial. No cambian algoritmo, muestras, filtros predictivos, umbrales, retención ni permisos.

El periodo inicial se calcula en Lima. Generación, publicaciones/evaluaciones/comparaciones conservadas y fechas de conservación se presentan mediante funciones compartidas con `America/Lima`. Una entrada temporal ilegible muestra «Fecha no disponible». La prueba de frontera usa `2026-10-27T00:16:40.371Z`, que corresponde al 26/10 a las 19:16 en Lima. No se convierten las fechas civiles semanales a instantes del dispositivo.

La revisión móvil encontró que el error descriptivo quedaba debajo del bloque predictivo. Se movieron error, reintento y carga al formulario que origina la consulta, antes de su botón. El aviso corregido se inspeccionó visualmente a 360 × 800.

## Comprobaciones del código

- Tipos y lint aprobados en la ejecución original de `npm run check`.
- La primera suite completa terminó con 600 casos aprobados y dos fallidos: timeout de cinco segundos en el editor contextual de listas y una llamada tardía que contaminó el caso siguiente. Registro completo conservado en `tmp/analytics-dates-full-check-20261028.log`.
- Repetición aislada sin modificar código ni timeout: 21/21 casos del editor aprobados (`tmp/analytics-dates-catalog-recheck-20261028.log`).
- Repetición de toda la suite: **602 pruebas, 83 suites, todas aprobadas** (`tmp/analytics-dates-suite-recheck-20261028.log`). No atribuir el timeout inicial a Analítica ni ocultarlo.
- Tras mover únicamente la ubicación visual del error/carga: 56 pruebas de Analítica/fechas en doce suites, tipos y lint aprobados. Registros `tmp/analytics-dates-final-focused-20261028.log`, `tmp/analytics-dates-final-types-20261028.log` y `tmp/analytics-dates-final-lint-20261028.log`. Esta comprobación focalizada no es otra suite completa posterior al ajuste visual.

## Entorno y paquete comprobados

Se confirmó que los servicios QA anteriores no estaban activos. Se recuperó la vista previa y la base existente, sin volver a ejecutar fixtures o migraciones. PostgreSQL terminó su recuperación tras el apagado previo; se observó proceso activo y «ready to accept connections» antes de continuar. El primer lanzador de API falló por una ruta con espacios; se corrigió mediante ruta relativa y directorio de trabajo explícito. La API compilada inició después, sin duplicar PostgreSQL. No se alteraron dependencias del producto ni se actualizaron paquetes por avisos de versión.

Exportación final `tmp/web-export-analytics-dates-final-20261028`, instalada en `mercado-app/dist` con respaldo previo completo `tmp/web-before-analytics-dates-20261028`. Los 281 archivos coinciden por SHA-256 y se conservaron recursos anteriores. Evidencia `tmp/analytics-dates-final-web-activation-20261028.json`. Verificador PDF.js: 200 recursos por raíz y hashes iguales al paquete instalado. Solo QA local, sin publicación de producción.

## Recorrido real en navegador

Acceso con cuenta ficticia Mayorista, revalidación tras recargar y navegación a Analítica correctos. Paquete final recargado después de instalarlo.

1. A 360 × 800, `2026-02-30` se rechaza con mensaje de fecha válida junto al control de consulta. Rango invertido y 367 días también muestran el límite aprobado.
2. Sin variedad específica, el control predictivo está deshabilitado. Con Canchán QA, un corte imposible muestra error local; al corregir solo `Hasta` a 2026-10-28 y conservar `Desde` vacío, la API devuelve el historial de 26 semanas. Se presentan cero semanas suficientes, ausencia de publicación/evaluación y condiciones pendientes; no se ofrece publicación ni precio predictivo.
3. Consulta descriptiva de octubre con variedad Canchán QA y ambas características «No informada»: respuesta con filtros efectivos, semanas/operaciones reales de QA y actualización `28/10/2026, 17:35 (Lima)`.
4. La semana 12–18 de octubre muestra una venta, S/2.5000/kg y su referencia central. Expandir referencias muestra una operación y cero devoluciones. Es una lectura de la venta ficticia reservada; **no se confirmó ni reenvió la devolución**.
5. Ancho de documento 360 en viewport 360, controles medidos de al menos 52 px de alto; referencia UUID se ajusta en varias líneas. Ancho de documento 1440 en viewport 1440 × 1000. Se restauró el tamaño normal del navegador al terminar.

Los selectores tienen animación: se esperó explícitamente que «Cancelar» quedara oculto antes de interactuar con el formulario. No se confunde un árbol capturado durante la transición con un selector permanentemente abierto.

Evidencias: `tmp/analytics-period-error-mobile-20261028.png`, `tmp/analytics-readiness-mobile-20261028.png`, `tmp/analytics-readiness-ui-20261028.txt`, `tmp/analytics-filter-result-ui-20261028.txt`, `tmp/analytics-references-mobile-20261028.png` y `tmp/analytics-references-desktop-20261028.png`.

## Límites

Este corte acredita consultas web y validación local, no precisión predictiva, publicación positiva, Android actual ni TalkBack. Los recorridos nativos de otros cortes conservan su alcance propio. No se crearon ventas, pagos, estimaciones o publicaciones para completar esta evidencia. T707–T715 y la meta global siguen abiertos hasta converger documentación, diseño y recorridos exigidos.
