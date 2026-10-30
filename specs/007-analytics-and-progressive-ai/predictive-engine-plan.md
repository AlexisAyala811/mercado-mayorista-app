# Motor predictivo reproducible 007

Decisión técnica del 12 de octubre de 2026, contra los criterios de producto aprobados. No cambia umbrales ni autoriza publicación automática.

## Entradas y cortes temporales

Cada evaluación conserva 26 semanas completas consecutivas de ventas de una variedad y negocio. Sus ocho últimas semanas son objetivos de evaluación progresiva. Cada objetivo tiene una instantánea de entrenamiento del prefijo anterior, cortada antes de las 00:00 del lunes objetivo en Lima, y otra del valor real al cierre de su domingo. Compensaciones o anulaciones posteriores a cada corte no pueden cambiar ese entrenamiento. No reutilizar el conjunto descriptivo o la disponibilidad actual como si fueran estas instantáneas.

Cada semana incluida requiere cinco ventas distintas válidas, peso positivo y precio por kg válido, sin imputaciones. El prefijo inicial tiene 18 semanas; crece hasta 25 en la evaluación. No exigir 26 semanas adicionales en cada prefijo: el mínimo aprobado es del conjunto completo de 26. Si un prefijo histórico no satisface calidad o continuidad, detener la evaluación y conservar el motivo; no completar huecos con datos conocidos posteriormente.

## Algoritmo fijo de la primera versión

### Lectura central de instantáneas

El lector interno recibe una conexión transaccional, negocio, variedad, ventana comercial y corte exclusivo (lunes a las 00:00 de Lima). Incluye ventas creadas antes del corte y dentro de la ventana, recupera anuladas solo si su anulación ocurrió desde ese corte y resta únicamente devoluciones comerciales anteriores al corte. La igualdad en el límite pertenece al periodo siguiente. Mantiene entradas brutas retenidas, referencias, exclusiones y puntos semanales junto con fechas y zona horaria. Los ocho entrenamientos y ocho valores reales se reconstruyen por separado; la ventana final se reconstruye al lunes posterior a las 26 semanas. Ejecutar todo en una vista transaccional coherente antes de persistir versiones. El lector no publica ni sustituye la conservación inmutable.

Versión `weekly-mean-4-v1`: media aritmética de los cuatro precios semanales ponderados por peso anteriores. Cada precio semanal mantiene la ponderación central por peso; la media temporal concede igual importancia a cuatro semanas, sin presentarla como promedio de todas las ventas. No seleccionar parámetros mirando las ocho semanas de evaluación ni cambiar automáticamente de modelo para aprobar el umbral. Una mejora futura crea otra versión.

Precios y errores se representan en unidades enteras de 0.0001 S/kg usando BigInt. La media y el MAE de presentación se redondean half-up a cuatro decimales. El umbral de mejora se compara con las sumas exactas de errores antes de ese redondeo. Si el error de referencia es cero, no hay evidencia de reducción relativa del 10 % y la evaluación no habilita publicación.

Para el rango, calcular errores absolutos de pronósticos anteriores dentro del prefijo de entrenamiento: cada pronóstico usa solo sus cuatro semanas previas. Tomar el percentil empírico 80 por rango más cercano (`ceil(0.8*n)`), con orden determinista, como semiancho. Límite inferior máximo entre cero y precio menos semiancho; superior precio más semiancho. Informar cantidad de residuos, ancho, cobertura objetivo y cobertura observada. Es un rango empírico de un piloto pequeño, sin garantía estadística ni estacionalidad anual.

## Evaluación y publicación

Guardar ocho filas con corte de entrenamiento, real, estimado, referencia de la semana anterior, rango, errores y cobertura. Se acepta la mejora cuando `10*suma_error_modelo <= 9*suma_error_referencia` y la referencia tiene error positivo. Cobertura requiere siete de ocho valores reales dentro de límites inclusivos. El motor devuelve evidencia y criterios, nunca una autorización por sí solo.

Una publicación necesita, además, entradas centrales trazables e inmutables, persistencia versionada con retención mínima de cinco años, revalidación del historial vigente y revisión explícita del Mayorista. El motor puro no recibe tokens, no consulta terceros ni altera operaciones. Su integración con instantáneas históricas, migración, API y DS-045 permanece en T709/T710; probar el motor con series sintéticas no demuestra precisión real ni habilita cifras en el frontend.
