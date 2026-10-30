# Propuesta de decisiones para el frontend analítico 007

Fecha de propuesta: 4 de octubre de 2026. Estado: aprobada íntegramente por el usuario el 6 de octubre de 2026 mediante «Apruebo la propuesta analítica completa». Los criterios y permisos de este documento forman parte de las reglas vigentes de 007. La aprobación no acredita todavía precisión, suficiencia del historial ni implementación.

Esta propuesta desarrolla HU06, RF19, RF20 y DA05 de `build_propuesta.py`. Las operaciones confirmadas son la única fuente; el análisis nunca fija precios ni altera transacciones. El paquete comercial aprobado resolvió CL-10 para auditoría y comprobantes. No definió expresamente la conservación de modelos, conjuntos derivados y evaluaciones de 007.

Ratificación del 12 de octubre de 2026: el usuario confirmó de nuevo el paquete completo en respuesta a la consulta de aprobación. No se modifican los umbrales, permisos ni conservación ya aprobados. Las tareas de implementación y verificación permanecen abiertas según `specs/007-analytics-and-progressive-ai/tasks.md`.

## Acceso y presentación

Se recomienda acceso exclusivo del Mayorista tanto a tendencias como a estimaciones. El Encargado conserva sus permisos comerciales actuales. La API valida el permiso y el negocio antes de devolver datos; ocultar una opción del menú no basta.

DS-044 presenta evolución del precio por kg, cantidades y comparación entre periodos, separando compras y ventas. Muestra filtros, fechas de actualización y número de operaciones confirmadas. El peso es el denominador de los promedios ponderados. Se distinguen ausencia de datos, carga, error y reintento. Las anulaciones y devoluciones se reflejan según sus hechos compensatorios, sin sumar importes originales y compensados como operaciones nuevas independientes.

DS-045 muestra estimaciones semanales y evaluación posterior. Una estimación lleva rango, cobertura objetivo, periodo, variables, versión, fecha y referencia a la evidencia evaluada. Si no se cumplen todos los criterios, solo presenta análisis descriptivo y las condiciones faltantes. Nunca muestra cifras de predicción inventadas o generadas con datos de demostración.

## CL-08: criterios propuestos para un piloto

Los siguientes umbrales fueron aprobados como criterios de producto y requieren validación con historial real; no constituyen evidencia de precisión ni prometen representar estacionalidad anual.

| Condición | Propuesta verificable |
|---|---|
| Serie objetivo | Precio semanal de venta por kg ponderado por peso, por negocio y variedad; filtros descriptivos adicionales no crean automáticamente modelos nuevos. |
| Historial mínimo | 26 semanas completas y consecutivas, cada una con al menos cinco ventas confirmadas válidas de la variedad y peso total positivo. No rellenar semanas vacías para aprobar el requisito. |
| Calidad | Fechas, variedad, peso y precio presentes y válidos en todas las operaciones incluidas; registrar y mostrar operaciones excluidas. No imputar precios o pesos. |
| Representatividad | La estimación se limita a la variedad y negocio evaluados. No extrapolar a otra procedencia/calidad/temporada ni presentar el piloto como modelo anual. |
| Evaluación temporal | Ocho semanas finales evaluadas de forma progresiva, entrenando cada predicción únicamente con semanas anteriores. Sin división aleatoria ni información futura. |
| Comparación mínima | Error absoluto medio (MAE, S/kg) al menos 10 % menor que la referencia que usa el precio real de la semana anterior. Publicar ambos errores y las ocho comparaciones. |
| Rango | Cobertura objetivo del 80 %; al menos siete de las ocho semanas evaluadas deben caer dentro del rango. Informar la cobertura observada y el ancho del rango. No denominar a esta muestra pequeña garantía estadística. |
| Habilitación | Todos los criterios deben cumplirse y el Mayorista debe revisar la evidencia del piloto. Una semana incompleta o cambio que invalide los criterios suspende nuevas predicciones y conserva las anteriores. |

Tras aprobación, el plan técnico debe definir el cálculo reproducible del rango, los contratos y los ensayos antes de implementar predicción. Aprobar estos criterios no autoriza sustituir esa etapa por una llamada genérica a un proveedor de IA ni compartir el historial con terceros.

## Conservación de derivados, resultados y versiones

Se recomienda aplicar el aislamiento, cifrado y acceso aprobado en CL-10 a todo el módulo. Conservar cada estimación publicada y evaluación asociada durante al menos cinco años, junto con filtros, versión de algoritmo, parámetros, referencias de entrada y fechas. Guardar una versión nueva al regenerar; nunca reescribir una publicada.

Las copias de trabajo derivadas pueden reconstruirse desde hechos autorizados. No eliminar entradas necesarias para reproducir resultados conservados. La política concreta de limpieza de caché y artefactos temporales se define en el plan, sin confundirlos con evidencia publicada.

## Impacto de aprobación

Actualizar el registro de decisiones, la propuesta documental y los artefactos 007 antes de implementar. T701–T704 deben reflejar los criterios aprobados; T705 debe cubrir DS-044/DS-045 y estados. Luego definir contratos backend y tareas verticales para T706–T710. Los criterios no habilitan predicción si el historial real aún es insuficiente.

La verificación de 001–006 en Android, la integración con el backend real y la convergencia visual completa permanecen pendientes independientemente de esta decisión.
