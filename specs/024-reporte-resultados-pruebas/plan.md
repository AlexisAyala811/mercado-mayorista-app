# Plan 024: Reporte de resultados de pruebas

**Especificación:** [spec 024](spec.md) · **Fecha:** 26 de noviembre de 2026

## Enfoque

Un script de Node sin dependencias, `.github/scripts/test-report.mjs`, envuelve a Jest. Le agrega `--json --outputFile`, espera a que termine y con ese JSON (más el `coverage-summary.json` que Jest ya escribe) arma `resumen.md` y `junit.xml`. Sale con el código de Jest. Si existe `GITHUB_STEP_SUMMARY`, también escribe el resumen ahí.

Otro script, `.github/scripts/test-snapshot.mjs`, lee los `summary.json` de cada proyecto y escribe la foto fechada en `test-results/<fecha>/`.

## Comandos

| Proyecto | Comando | Corre | Salida |
| --- | --- | --- | --- |
| Backend | `npm run test:report` | Jest unitarias con cobertura | `backend/test-results/unit/` |
| Backend | `npm run test:report:e2e` | Jest e2e en PostgreSQL | `backend/test-results/e2e/` |
| App | `npm run test:report` | Jest (jest-expo) con cobertura | `app/test-results/unit/` |

`test:cov` se mantiene para quien solo quiera la cobertura.

## CI

- Backend: el paso de pruebas usa `npm run test:report`; el de e2e, `npm run test:report:e2e`. Cada job sube `test-results` con `actions/upload-artifact@v4` y `if: always()`.
- App: igual, con `npm run test:report`.

## Verificación

- Correr los tres comandos en local y comparar los números con la salida de Jest.
- Una prueba que falla a propósito, en una copia temporal, debe dejar el comando en error y nombrarla en el resumen.
- La CI de la rama debe mostrar el resumen y el artefacto.
