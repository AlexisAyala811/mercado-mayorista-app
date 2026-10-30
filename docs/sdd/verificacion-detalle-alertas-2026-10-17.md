# Detalle de alertas financieras

HU14/RF16/RF23, contrastados con build_propuesta.py, exigen aviso vinculado a cuenta y vencimiento. El contador anterior no permitía conocer qué cuota requería atención. Implementación según `specs/006-reports-and-receipts/financial-alert-detail-plan.md`: referencias de cuenta/cuota, pagar/cobrar, vencimiento civil, estado al corte Hasta y saldo de cada cuota. Se conservan cuotas distintas con fecha/importe iguales y se identifica el resultado vacío. No hay escrituras comerciales ni avisos externos.

Tipos y lint aprobados en la ejecución de comprobación. La suite dentro del sandbox terminó con 511 aprobadas y dos fallos del editor contextual preexistente: timeout de cinco segundos y llamada tardía que contaminó la prueba posterior (salida del proceso 56073, código 1). Las pruebas nuevas de Reportes pasaron. No se cambiaron aserciones ni tiempos límite.

La misma suite completa fuera del sandbox pasó: **513 pruebas/70 suites**, código 0, `tmp/financial-alert-tests-outside-20261017.log`. Esto acredita el resultado de esa ejecución, no elimina la inestabilidad observada en el entorno restringido. Las regresiones cubren identidad de cuotas de una misma cuenta, vencimiento/saldo, retirada al cambiar corte y vacío posterior a consulta.

Pendiente: UI real con alertas positivas, adaptación de texto y dispositivos, identidad descriptiva de contraparte y convergencia con Figma. La referencia de cuenta es la identificación actualmente disponible en este listado; no se inventa un nombre ni se cierra HU14 completo por este corte.

Paquete web `web-export-financial-alerts-20261017` exportado e instalado en dist a las 2026-10-17T15:36:54Z: 270 archivos cotejados, activos anteriores preservados y respaldo `tmp/web-before-financial-alerts-20261017`. Evidencia `tmp/financial-alerts-web-activation-20261017.json`. PDF.js 6.4.299, 200 recursos por raíz verificados. No hubo navegación nueva de navegador ni publicación externa.
