# Tareas 016: Segunda instancia del backend

**Especificación:** [spec 016](spec.md) · **Estado:** implementada y verificada el 17 de noviembre de 2026

Cada tarea se marca `[x]` solo con evidencia enlazable.

- [x] **T1601** Balanceador por turnos para medir en un equipo. **Hecho:** `backend/test/load/balanceador.mjs`; repartió 56 137 solicitudes a cada instancia.
- [x] **T1602** Opción `PAUSA` en `consultas.k6.js` para medir la capacidad máxima. **Hecho:** corridas con `PAUSA=0`.
- [x] **T1603** Medición de AC06 con una y dos instancias. **Hecho:** [verificación del 17 de noviembre de 2026](../../docs/sdd/verificacion-segunda-instancia-2026-11-17.md).
- [ ] **T1604** Límite de solicitudes y caché compartidos (Redis) si se despliega más de una instancia.
- [ ] **T1605** Balanceador de producción en el entorno `production`.
