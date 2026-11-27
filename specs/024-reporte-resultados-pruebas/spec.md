# Especificación 024: Reporte de resultados de pruebas

**Estado:** aprobada por el usuario el 26 de noviembre de 2026 («haz lo que me propusiste»)
**Origen:** el usuario pidió una carpeta de resultados de pruebas «donde se contemplarán todo el número de pruebas, pruebas exitosas, pruebas fallidas» para mostrar la evidencia de calidad a la docente.

## Objetivo

Que cualquier persona pueda ver, sin correr nada, cuántas pruebas tiene el proyecto, cuántas pasan, cuántas fallan o se omiten, cuánto tardan y qué cobertura dejan, tanto del backend como de la app. Hoy esos números están repartidos en notas de verificación escritas a mano.

## Funcionalidades

1. **Comando por proyecto.** `npm run test:report` en `backend/` y en `app/`, y `npm run test:report:e2e` en `backend/` para las pruebas contra PostgreSQL. Cada uno corre las pruebas de siempre y escribe en `test-results/`:
   - `resumen.md`: suites y pruebas totales, exitosas, fallidas y omitidas; duración; cobertura de líneas, sentencias, funciones y ramas; fecha y lista de las pruebas fallidas, si las hay;
   - `jest-results.json`: el resultado completo de Jest;
   - `junit.xml`: el mismo resultado en el formato estándar JUnit.
   El comando termina con el mismo código que Jest: si una prueba falla, falla.
2. **En la integración continua.** Las CI del backend y de la app usan esos comandos. Cada ejecución adjunta `test-results/` como artefacto descargable y publica el resumen en la página de la ejecución en GitHub, aunque las pruebas fallen.
3. **Foto fechada por sprint.** `node .github/scripts/test-snapshot.mjs` junta los resultados del backend y de la app en `test-results/<fecha>/` en la raíz del repositorio, con un `resumen.md` común y los `junit.xml`. Esta carpeta sí se sube al repositorio como evidencia.

## Decisiones

- **CL-24-01 · Dónde va cada cosa.** Aprobado el 26 nov 2026: los resultados de cada corrida van en `backend/test-results/` y `app/test-results/`, fuera de git. La foto por sprint va en `test-results/<fecha>/` en la raíz, porque reúne a los dos proyectos. La spec queda en `specs/024-…` y enlaza a la foto como evidencia.
- **CL-24-02 · Sin dependencias nuevas.** El JUnit XML se arma a partir del JSON que Jest ya produce, con un script propio sin paquetes nuevos.
- **CL-24-03 · Qué no se sube.** Los JSON completos no se suben al repositorio: son grandes y cambian en cada corrida. La foto lleva el resumen y los XML.

## Fuera del alcance

- Pruebas de Playwright de la app web y colecciones de Postman: ya tienen sus propios resultados.
- Paneles externos de reportes o servicios de terceros.

## Criterios de aceptación

1. `npm run test:report` en `backend/` y en `app/` deja `resumen.md`, `jest-results.json` y `junit.xml` con números iguales a los que muestra Jest.
2. Si una prueba falla, el comando termina con error y `resumen.md` nombra la prueba fallida.
3. Las CI del backend y de la app publican el artefacto `test-results-…` y el resumen en la página de la ejecución.
4. `test-results/2026-11-26/` contiene el resumen común del backend (unitarias y e2e) y de la app.
5. Las carpetas `test-results/` de cada proyecto están en `.gitignore`.

## Documentos afectados

`backend/package.json`, `app/package.json`, `.gitignore` de cada proyecto, `.github/workflows/backend-ci.yml`, `.github/workflows/app-ci.yml`, `.github/scripts/`, `test-results/README.md` y el índice de specs.
