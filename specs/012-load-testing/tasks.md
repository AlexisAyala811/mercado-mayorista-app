# Tareas 012: Pruebas de carga con k6

**Especificación:** [spec 012](spec.md) · **Plan:** [plan 012](plan.md) · **Estado:** en curso desde el 16 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1201** `THROTTLE_LIMIT` configurable con 100 por defecto. *Verificación:* prueba del esquema de entorno, tipos, lint, pruebas unitarias y build del backend. **Hecho:** `backend/src/platform/config/environment.schema.spec.ts`; 336 pruebas unitarias y build en verde el 16 nov 2026.
- [x] **T1202** Script `backend/test/load/consultas.k6.js` con los umbrales de AC01. *Verificación:* `k6 inspect` o una corrida corta sin errores de script. **Hecho:** dos corridas completas, [verificación del 16 de noviembre de 2026](../../docs/sdd/verificacion-carga-k6-2026-11-16.md).
- [x] **T1203** Corrida de 20 usuarios sobre la base de simulación. *Verificación:* archivo JSON y cifras en el documento de verificación. **Hecho:** p95 de 16 ms y 0 % de fallos, [verificación del 16 de noviembre de 2026](../../docs/sdd/verificacion-carga-k6-2026-11-16.md).
- [x] **T1204** Corrida de 40 usuarios en una instancia, como referencia de AC06. *Verificación:* igual que T1203. **Hecho:** p95 de 18 ms y 0 % de fallos, [verificación del 16 de noviembre de 2026](../../docs/sdd/verificacion-carga-k6-2026-11-16.md). AC06 sigue sin evidencia: falta la segunda instancia.
- [ ] **T1205** Decidir si el límite de solicitudes debe ser por sesión y no por dirección (hallazgo de la spec).
- [x] **T1206** Repetir la prueba con una base sembrada con volumen real (miles de operaciones). **Hecho:** spec 014, [verificación del 17 de noviembre de 2026](../../docs/sdd/verificacion-volumen-bd-2026-11-17.md).
