# Periodo y actualización de Reportes

Implementado conforme a `specs/006-reports-and-receipts/report-freshness-plan.md`. La pantalla presenta periodo y marca `generatedAt` del resumen central en hora de Lima. La etiqueta limita su alcance al resumen; no atribuye esa fecha a los demás conjuntos. Al editar periodo/filtros se retira con los resultados. Una marca inválida informa fecha no disponible.

Fechas civiles imposibles se rechazan antes de las tres consultas del reporte. Se acepta el 29 de febrero de año bisiesto; no se depende de la normalización automática de Date ni se cambia la validación del servidor.

Tipos y lint aprobados en `tmp/report-freshness-check-20261016.log`. Las pruebas de ese comando no arrancaron por EPERM en caché temporal del sandbox. Con caché de trabajo, la primera ejecución registró 509 aprobadas y dos fallos relacionados: timeout de un caso previo de editor contextual y su llamada tardía afectando al siguiente. Se conserva ese resultado en `tmp/report-freshness-tests-20261016.log`; no se cambió el timeout ni se omitieron pruebas. Repetición completa con la caché preparada: **511 pruebas / 70 suites aprobadas**, código 0, `tmp/report-freshness-tests-repeat-20261016.log`. Incluye regresiones nuevas de fecha imposible, año bisiesto, marca central en Lima y retirada de resultados.

Estos resultados no acreditan todavía presentación real de la marca en dispositivos, teclado ni convergencia con el marco Reportes de Figma. La cuota previa de Figma no se eludió ni se implementaron detalles visuales desde metadatos.

Exportación `web-export-report-freshness-20261016` concluida con código 0 e instalada localmente a las 2026-10-17T01:26:48Z (16 de octubre en Lima). 270 archivos cotejados por hash, respaldo `tmp/web-before-report-freshness-20261016`, activos anteriores conservados; evidencia `tmp/report-freshness-web-activation-20261016.json`. PDF.js 6.4.299: 200 recursos por raíz verificados. No hubo navegación de navegador ni publicación externa.
