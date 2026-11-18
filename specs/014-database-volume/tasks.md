# Tareas 014: Escalabilidad de la base de datos con volumen

**Especificación:** [spec 014](spec.md) · **Plan:** [plan 014](plan.md) · **Estado:** implementada y verificada el 17 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1401** Script de siembra por copias. **Hecho:** `backend/test/load/sembrar-volumen.mjs`; 2000 copias en 11,1 s, [verificación](../../docs/sdd/verificacion-volumen-bd-2026-11-17.md).
- [x] **T1402** Historial de compras sin agrupar todos los sacos del negocio. **Hecho:** de 327 ms a 23 ms en el mes; `backend/test/stitch-history.e2e-spec.ts` en verde en PostgreSQL.
- [x] **T1403** Migración 030 con el índice por fecha de las liquidaciones de compra. **Hecho:** de 11,4 ms a 0,12 ms en la consulta del mes; `backend/test/migrations.e2e-spec.ts` en verde.
- [x] **T1404** k6 con volumen. **Hecho:** p95 de 41 ms con 20 usuarios y 45 ms con 40, [verificación](../../docs/sdd/verificacion-volumen-bd-2026-11-17.md).
- [ ] **T1405** Medir las cuentas con los parámetros correctos.
- [ ] **T1406** Revisar los reportes por año si el volumen real los acerca a 1 segundo.
