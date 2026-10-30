# Periodos rápidos y referencia Figma

Figma entregó contexto completo/captura de Reportes 98:304. Referencia textual preservada en `tmp/figma-reportes-context-20261017.txt`; siete SVG originales descargados, dimensiones/hash en `tmp/reports-figma-assets-20261017.json`. La consulta adicional de User 98:308 agotó la cuota Starter, sin eludirla. Los activos aún no están montados: no se acredita fidelidad de la pantalla por haberlos descargado.

Usuario aprobó `propuesta-reportes-figma-2026-10-17.md`: saldo actual de cuentas originadas en el periodo y cuatro descargas agregadas PDF/Excel. Contrato y secuencia en `specs/006-reports-and-receipts/reports-figma-convergence-plan.md`; su implementación completa sigue pendiente.

Implementado selector de mes actual, mes anterior y personalizado, junto con Restablecer período. Editar una fecha cambia a personalizado; seleccionar/restablecer invalida resultados y no consulta automáticamente ni borra filtros de precios. Selección calculada al usarla, preservando edición manual y límite de hoy para el mes actual.

Tipos y lint aprobados. Primer chequeo detectó placeholder obligatorio y se corrigió. Un comando posterior llevaba por error --unused y las pruebas no arrancaron; log `tmp/report-presets-check-20261017.log`. Comando corregido fuera del sandbox: **516 pruebas / 71 suites aprobadas**, código 0, `tmp/report-presets-tests-20261017.log`. Casos incluyen enero/diciembre, febrero bisiesto/no bisiesto, edición manual y restablecimiento sin consulta automática.

Fuente actualizada; el dist vigente continúa siendo `web-export-financial-alerts-20261017` y aún no contiene este selector. Pendiente exportación del nuevo corte, UI real y convergencia completa, además de indicadores/descargas aprobados. No se cierra la meta global.
