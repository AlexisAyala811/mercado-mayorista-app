# Disponibilidad de publicaciones — 12 de octubre de 2026

La disponibilidad ya no devuelve siempre `predictionAvailable=false`. Para un corte igual al día actual de Lima, la API consulta la última publicación del negocio/variedad y revalida su evaluación original con las entradas actuales, en la misma transacción REPEATABLE READ que la consulta de historial. Reutiliza las guardas de versión, huella, reproducción, ventana, suficiencia, mejora y cobertura usadas al publicar.

`availability` distingue ausencia de publicación, publicación vigente, necesidad de reevaluación y consulta histórica. Incluye referencia de publicación/evaluación, instante y explicación. Solo la publicación vigente acredita evaluación/cobertura/revisión y habilita el indicador. Una semana vencida o un cambio comercial suspende su presentación como vigente, conservando el original. Una consulta histórica no afirma vigencia pasada ni actual. Un fallo de base de datos sigue siendo error, no se transforma en insuficiencia.

Frontend conectado: muestra el estado central, motivo, referencia y hora de comprobación. Las versiones originales continúan en el historial. No modifica precios ni publica automáticamente. La consulta de disponibilidad es explícita; después de publicar puede actualizarse con el mismo control.

## Verificación

- TypeScript, lint y compilación backend correctos; TypeScript/lint frontend correctos.
- 40 pruebas analíticas backend en 11 archivos; incluyen aislamiento de consulta y propagación de fallos de infraestructura.
- 36 pruebas analíticas frontend en nueve archivos; incluyen presentación de publicación vigente, reevaluación y consulta histórica.
- PostgreSQL aislado, `test/analytics-evaluation-race.mjs`, evidencia `tmp/analytics-evaluation-race-2026-10-12.json` de las 17:11:57 UTC: antes de publicar no hay versión; tras publicar hay disponibilidad y criterios acreditados; corte pasado no afirma vigencia; siguiente semana requiere reevaluación; cambios comerciales también retiran disponibilidad. El esquema desechable se elimina y no se crean operaciones públicas ni actores.
- La integración positiva utiliza el servicio compilado y conexiones pg transaccionales. No sustituye un recorrido visual real, autenticación positiva de producción ni precisión con datos reales.
- API de pruebas reiniciada con las rutas y lógica actualizadas.

T708/T709 siguen abiertos por convergencia visual/nativa y demás condiciones de aceptación pendientes. Esta evidencia sustituye la reconciliación de disponibilidad marcada como pendiente en cortes anteriores, sin cerrar la meta de frontend.
