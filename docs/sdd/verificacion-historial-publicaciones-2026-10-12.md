# Historial de publicaciones y evidencia original — 12 de octubre de 2026

## Implementación

La API exclusiva del Mayorista lista publicaciones por variedad/negocio con páginas centrales y orden por fecha/UUID descendentes. Página y conteo comparten REPEATABLE READ. Los resúmenes incluyen periodo, algoritmo, revisión, conservación y referencia de evaluación; no contienen el pronóstico completo. GET por UUID recupera el registro original sin revalidarlo como si fuera una publicación nueva.

La interfaz presenta el historial al seleccionar variedad, incluso sin suficiencia actual. Abre una publicación, conserva la página al regresar y permite recuperar la evaluación asociada como evidencia de solo lectura. Consultar evidencia no vuelve a publicar ni habilita otro botón de revisión. Un guardado nuevo actualiza el historial sin desmontar el resultado visible de su confirmación. Las listas de evaluaciones y publicaciones tienen claves distintas para evitar mezclar identidades al actualizarse.

La presentación de la versión publicada se reutiliza en confirmación e historial: algoritmo, periodo, revisión, rango, ancho, cobertura, variables y conservación. Su descripción distingue evidencia original de las condiciones actuales para generar otra estimación.

## Verificación completada

- Frontend: tipos y lint aprobaron; 29 pruebas analíticas en siete suites. Recuperación desde segunda página, evidencia por UUID, retorno a página original, consulta sin acción de publicación, error/vacío y reintento comprobados. La primera ejecución reveló claves duplicadas entre las listas hermanas; se corrigieron y la ejecución posterior terminó sin esa advertencia.
- API: tipos, lint y compilación aprobaron; 33 pruebas analíticas en nueve archivos. El listado conserva los guards Mayorista y el negocio central.
- PostgreSQL/controlador aislados: `test/analytics-evaluation-race.mjs` creó 21 publicaciones sintéticas revisadas exclusivamente en su esquema desechable. Comprobó páginas 20/1, 21 UUIDs distintos, resúmenes sin forecast, cero versiones de otro negocio o variedad y GET HTTP de segunda página. Continuaron pasando concurrencia, inmutabilidad, recuperación de versión y bloqueo ante cambio comercial. Se retiraron esquema y servidor de prueba; cero publicaciones públicas.

Evidencia: `tmp/analytics-evaluation-race-2026-10-12.json`. Se mantienen las limitaciones del adaptador transaccional pg y de la entrada de sesión de prueba de los cortes anteriores. Los precios de los ensayos del renderizador y del esquema son sintéticos, no precisión real ni datos mostrados en la aplicación comercial.

## Comprobación pendiente por revisión automática

La API propia de integración se reinició con la compilación del historial y arrancó correctamente (PID observado 22716, puerto 3000). La ejecución posterior de `test/verify-evaluation-http.mjs`, que debía comprobar el listado con la cuenta ficticia y ausencia de escrituras, no se realizó: la revisión automática informó límite de uso y disponibilidad a las 11:32. El mensaje distingue fallo de revisión de una determinación de inseguridad e indica no eludir el control. No se intentó el mismo recorrido mediante otra vía.

Por tanto, la evidencia HTTP anterior de la API de integración no acredita todavía su nuevo endpoint de listado de publicaciones. Faltan esa comprobación, recorrido visual conectado del historial, evaluación posterior, reconciliación de disponibilidad y convergencia Figma/Android/TalkBack. El objetivo general permanece abierto.

### Comprobación recuperada tras el horario indicado

El 12 de octubre a las 16:39 UTC (11:39 en Lima) se volvió a solicitar la revisión por la vía normal, después del horario indicado. Fue aceptada. La inspección confirmó listeners anteriores ausentes y que el PID 22716 había sido reutilizado por `backgroundTaskHost.exe`; no se detuvo ese proceso ajeno. Se restauraron únicamente PostgreSQL/API propios mediante el runner existente.

El ensayo HTTP pendiente se ejecutó a las 16:42 UTC y aprobó: listado de publicaciones 200, total cero, filtros/validaciones y ausencia de versiones nuevas. Actualizó `tmp/evaluation-http-2026-10-12.json`. Este resultado sustituye la limitación anterior de revisión pendiente; recorrido visual, evaluación posterior y convergencia continúan abiertos. No se eludió el control ni se asumió que un PID antiguo siguiera perteneciendo a la API.
