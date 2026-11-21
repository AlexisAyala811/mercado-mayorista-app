# Especificación 020: Pruebas del backend con Jest

**Estado:** aprobada por el usuario el 21 de noviembre de 2026 («Migrar a Jest ya») · **Fecha:** 21 de noviembre de 2026
**Origen:** consigna del Sprint 2, actividad 7 y entregable «Pruebas automatizadas con Jest y reporte de cobertura»

## Objetivo

La consigna pide pruebas con Jest. La app ya las tenía; el backend usaba Vitest. Esta spec pasa las pruebas del backend a Jest sin cambiar qué comprueban: las mismas 365 pruebas unitarias y 68 e2e, con cobertura en la CI.

## Alcance

| Elemento | Regla |
| --- | --- |
| Ejecución | Jest 30 en modo ESM nativo (`node --experimental-vm-modules`), porque NestJS 12 solo se distribuye como ES modules |
| TypeScript | `@swc/jest` compila a ESM y conserva los metadatos de los decoradores que usa la inyección de dependencias de Nest |
| Objeto `jest` | En ESM no es global: `test/setup.ts` y `test/database-setup.ts` lo exponen desde `@jest/globals`, y las pruebas lo usan como en CommonJS |
| Mocks de módulo | `jest.unstable_mockModule` con `await import()` para el único caso (`receipts-characteristics.spec.ts`) |
| Scripts | `npm test`, `test:cov` y `test:e2e` mantienen su nombre, así que la CI no cambia |
| Configuración | `jest.config.mjs` (unitarias y cobertura) y `jest.config.e2e.mjs` (PostgreSQL, en serie con `--runInBand`) |
| Equivalencias | `vi.*` pasa a `jest.*`; `toHaveBeenCalledOnce()` pasa a `toHaveBeenCalledTimes(1)`; `useFakeTimers({ toFake: ['Date'] })` pasa a `doNotFake` con el resto de los temporizadores |

Fuera del alcance: cambiar lo que comprueba cada prueba o el código de producción.

## Criterios de aceptación

1. `npm test` corre las 77 suites y 365 pruebas unitarias con Jest, todas en verde.
2. `npm run test:e2e` corre las 10 suites y 68 pruebas contra PostgreSQL 17, todas en verde.
3. `npm run test:cov` genera el informe de cobertura que sube la CI.
4. `tsc --noEmit`, lint y `build` sin errores; Vitest no queda en las dependencias.

## Aclaraciones

- **CL-20-01 · Cobertura con otra medida.** Jest y Vitest usan el mismo proveedor (V8), pero cuentan líneas y ramas de otra forma. Con las mismas pruebas, las líneas pasan de 68,2 % a 58,1 % y las ramas de 57,8 % a 83,7 %. No es una pérdida de pruebas: se registra la nueva medida como línea base.
