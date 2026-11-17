# Plan 012: Pruebas de carga con k6

**Especificación:** [spec 012](spec.md) · **Fecha:** 16 de noviembre de 2026

## Pasos

1. **Backend.** `THROTTLE_LIMIT` en el esquema de entorno (entero de 1 a 100000, por defecto 100) y `ThrottlerModule.forRootAsync` leyendo ese valor. El límite de cinco inicios de sesión por minuto no cambia.
2. **Script.** `backend/test/load/consultas.k6.js`: un inicio de sesión en `setup`, siete consultas por iteración con pausa de 2 a 4 segundos, umbrales de AC01 y resumen en texto y en JSON.
3. **Ejecución.** PostgreSQL portable y API en el puerto 3100 con `THROTTLE_LIMIT=100000`, sobre la base de simulación. Dos corridas: 20 y 40 usuarios.
4. **Evidencia.** Documento en `docs/sdd/` con el comando, el equipo, las cifras y el archivo JSON.

## Cómo ejecutarlo

```bash
k6 run -e K6_USERNAME=<usuario> -e K6_PASSWORD=<contraseña> -e SUMMARY=resultado-20.json backend/test/load/consultas.k6.js
```

Para 40 usuarios se añade `-e VUS=40`. Las credenciales de prueba no se escriben en el repositorio.

## Riesgos

- **Equipo de desarrollo, no servidor.** Las cifras valen para este equipo; no predicen el servidor de producción.
- **Pocos datos.** La base de simulación tiene pocas operaciones; con más volumen los reportes tardarán más.
- **Una sola sesión.** Todos los usuarios virtuales comparten un token; no se mide el inicio de sesión.
