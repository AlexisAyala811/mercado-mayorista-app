# Tareas 024: Reporte de resultados de pruebas

**Especificación:** [spec 024](spec.md) · **Plan:** [plan 024](plan.md) · **Estado:** implementada en la rama `feat/024-reporte-pruebas` el 26 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T2401** Script `test-report.mjs`: resumen, JSON y JUnit, con el código de salida de Jest. Evidencia: [`test-report.mjs`](../../.github/scripts/test-report.mjs); en local dejó los cuatro archivos en cada proyecto con los mismos números que Jest ([foto del 26 nov 2026](../../test-results/2026-11-26/resumen.md)).
- [x] **T2402** `test:report` en backend y app, y `test:report:e2e` en backend; `test-results/` en `.gitignore`. Evidencia: backend 369/369 unitarias y 76/76 e2e en PostgreSQL portable; app 760/760 ([foto del 26 nov 2026](../../test-results/2026-11-26/resumen.md)).
- [x] **T2403** CI del backend y de la app con artefacto y resumen en la página de la ejecución. Evidencia: con el commit 408d84c, la [ejecución del backend](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/runs/45933420354) dejó los artefactos `resultados-backend-unitarias` y `resultados-backend-e2e`, y la [de la app](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/runs/45933420426) dejó `resultados-app`; las dos terminaron en verde. El resumen en la página de la ejecución no se revisó a ojo, porque requiere iniciar sesión en GitHub.
- [x] **T2404** Script `test-snapshot.mjs` y primera foto `test-results/2026-11-26/`. Evidencia: [`test-snapshot.mjs`](../../.github/scripts/test-snapshot.mjs) y [foto del 26 nov 2026](../../test-results/2026-11-26/resumen.md): 1205 pruebas, 1205 exitosas.
- [x] **T2405** Comprobación de una prueba fallida: el comando falla y el resumen la nombra. Evidencia: el 26 nov 2026, una suite temporal con una prueba fallida y otra exitosa dejó código de salida 1, «❌ hay pruebas fallidas», la prueba nombrada en «Pruebas fallidas» y un `<failure>` en el JUnit; la suite temporal se borró.
