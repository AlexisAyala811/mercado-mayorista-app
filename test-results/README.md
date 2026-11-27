# Resultados de pruebas

Evidencia fechada de las pruebas automáticas del backend y de la app ([spec 024](../specs/024-reporte-resultados-pruebas/spec.md)). Cada carpeta es una foto tomada en una fecha, normalmente al cerrar un sprint.

| Carpeta | Qué contiene |
| --- | --- |
| [`2026-11-26/`](2026-11-26/resumen.md) | Sprint 2, con el Administrador de comerciantes (spec 023) |

Cada foto tiene:

- `resumen.md`: suites y pruebas totales, exitosas, fallidas y omitidas, duración y cobertura de cada conjunto, con el total;
- un `*-junit.xml` por conjunto, con el detalle de cada prueba en el formato estándar JUnit.

## Cómo se genera

Primero se corren los reportes de cada proyecto. Cada uno deja sus resultados en `test-results/` dentro del proyecto; esas carpetas no se suben al repositorio.

```powershell
cd backend; npm run test:report; npm run test:report:e2e; cd ..
cd app; npm run test:report; cd ..
node .github/scripts/test-snapshot.mjs
```

`test:report:e2e` necesita un PostgreSQL de prueba (ver `backend/test/database-environment.ts`). Sin él, la foto lleva solo las pruebas unitarias.

En GitHub, cada ejecución de la integración continua publica el resumen en su página y deja `test-results` como artefacto descargable durante 14 días.
