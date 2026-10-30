# Conservación de comparaciones posteriores — 12 de octubre de 2026

T710 incorpora versiones posteriores inmutables vinculadas a la publicación original. La migración 023 conserva resultado e instantánea completa, autor, UUID de petición, fecha y retención mínima de cinco años. La clave foránea delimita negocio/publicación; UPDATE, DELETE y TRUNCATE se rechazan. Una reversión de migración con evidencia existente también se rechaza.

POST `/analytics/publications/:id/outcomes` exige Mayorista y UUID de petición. La semana abierta responde 409. La semana cerrada puede conservar tanto un precio observado como la ausencia de operaciones válidas; cero observado con peso positivo sigue siendo precio válido. Cada nueva petición crea otra versión. Reintentar una petición recupera el original antes de reconstruir los hechos; cambiar publicación con ese UUID responde 409. Conservación y auditoría comparten transacción REPEATABLE READ y reintentos acotados. GET de historial/detalle devuelve versiones por negocio y publicación; el detalle no transmite las entradas crudas conservadas.

Frontend: acción explícita tras consultar una semana cerrada, explicación de que el corte se vuelve a medir al guardar, reintento con el mismo UUID, resultado conservado y fecha de retención. Preparar otra versión genera una petición distinta. Historial independiente de la consulta actual con páginas de 20, detalle original, retorno a la página y actualización explícita. Se reutilizan componentes y tokens existentes; no acredita convergencia con Figma.

## Evidencia

- TypeScript y lint backend/frontend correctos; compilación backend correcta.
- Backend: 39 pruebas en 11 archivos (analítica y registro de migraciones).
- Frontend: 33 pruebas analíticas en nueve archivos. Nuevos recorridos: respuesta perdida/mismo UUID/nueva versión explícita y paginación/detalle/retorno sin escritura.
- `mercado-api/test/analytics-evaluation-race.mjs`: PostgreSQL en esquema desechable de la base UI, evidencia `tmp/analytics-evaluation-race-2026-10-12.json`, 17:07:55 UTC. Conservación de ausencia seguida de cero real sin alterar la primera versión, entradas retenidas, aislamiento, prohibición de mutación, fallo de auditoría con rollback, páginas 20/1, recuperación HTTP 200/201, semana abierta 409 y UUID inválido 400. El esquema y servidor HTTP de prueba se eliminan al terminar. Sin nuevas operaciones comerciales públicas, usuarios ni permisos.
- La integración usa conexiones pg transaccionales y controlador compilado con entrada de sesión de prueba explícita; no acredita autenticación real del recorrido positivo. Las carreras concurrentes existentes verifican evaluación/publicación; todavía no hay una carrera simultánea dedicada a conservación posterior.
- Migración 023 aplicada exclusivamente en la base UI tras comprobar que era la única pendiente. API local propia reiniciada; rutas nuevas registradas.

Pendiente: recorrido visual real y Android del historial posterior, convergencia DS-044/045, prueba concurrente específica de comparación, reconciliar disponibilidad predictiva y conservación operativa de producción. T709/T710 y la meta completa de frontend permanecen abiertos.
