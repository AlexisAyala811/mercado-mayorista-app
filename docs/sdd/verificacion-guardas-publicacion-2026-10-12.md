# Guardas de revisión previa a publicación — 12 de octubre de 2026

## Corte contra criterios aprobados

La preparación interna del candidato verifica algoritmo registrado, huella de entradas, reproducción exacta de evaluación, mejora mínima, cobertura, ventana comercial vigente, identidad de negocio/variedad y una lectura actual del instante solicitado. Devuelve periodo objetivo, rango, ancho, variables, MAEs y cobertura solo si todo cumple. Mantiene revisión requerida y publicación no disponible; no existe aún comando o persistencia de publicación.

La ventana objetivo es la semana comercial posterior a las 26 semanas completas evaluadas. Pasar a otra semana exige evaluar de nuevo. El lector actual reutiliza las reglas centrales de ventas/anulaciones/devoluciones, con timestamp exclusivo en lugar de corte civil, sobre la misma ventana histórica. No incorpora ventas de la semana objetivo en curso. El lector histórico conserva sus cortes de lunes; no se relajaron sus guardas.

Se comparan hechos de las observaciones —IDs, variedad, semana, cantidades, pesos, importes y compensaciones—, sin convertir un cambio del nombre de catálogo en cambio de precio. Las entradas y resultados conservados se verifican por huella canónica; no se modifican ni recalculan silenciosamente para hacer que cumplan.

## Verificación

Tipos, lint y compilación aprobaron; 33 pruebas analíticas en nueve archivos. Las nuevas pruebas comprueban candidato de semana vigente con revisión todavía requerida, rechazo de semana vencida/negocio/variedad/lectura antigua, rechazo de hechos comerciales cambiados, aceptación de renombre del catálogo, huella incorrecta, resultados no reproducibles y referencia perfecta sin mejora relativa.

El ensayo `test/analytics-evaluation-race.mjs` volvió a ejecutar fuentes sintéticas, servicio y controlador con PostgreSQL real en un esquema desechable. Preparó un candidato apto. Una devolución registrada exactamente en el timestamp de revisión quedó fuera por el límite exclusivo; un milisegundo después entró en la lectura y bloqueó el candidato. Cambiar un importe también lo bloqueó. Las versiones originales se conservaron, y los ensayos de concurrencia/HTTP anteriores siguieron pasando. No hubo publicación ni escrituras públicas. Se cerró el servidor de prueba y se retiró el esquema.

Evidencia: `tmp/analytics-evaluation-race-2026-10-12.json`. Conserva las limitaciones del adaptador pg transaccional y de la entrada de sesión de prueba documentadas en `verificacion-evaluacion-concurrente-2026-10-12.md`; no demuestra precisión con historial real ni una interacción de revisión en Android.

## Pendientes

Migración/retenedor inmutable de publicaciones, servicio autorizado de vista previa/confirmación con revalidación, declaración de revisión del Mayorista, historial de publicaciones, evaluación posterior y su frontend. Las guardas internas de este corte no equivalen a publicación habilitada. Figma y verificación nativa permanecen abiertos.
