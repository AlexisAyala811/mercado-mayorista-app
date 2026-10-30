# Cálculo posterior de una publicación — 12 de octubre de 2026

## Primer corte de T710

Se definió primero el contrato de comparación posterior contra HU06/RF20. El cálculo puro conserva el periodo/precio/rango original de la publicación y distingue semana en curso, ausencia de operaciones válidas y real observado. Durante el periodo o sin precio real no devuelve error ni cero imputado.

Cuando el periodo terminó, valida precio real, operaciones y peso positivo; calcula error absoluto exacto en S/kg usando unidades BigInt de cuatro decimales y cobertura inclusiva del rango. Una muestra de una venta válida permite observar un precio y conserva su recuento; no traslada a esta medición el mínimo de cinco ventas del entrenamiento. Un precio realmente registrado de cero sigue siendo comparable. No se denomina al error de una publicación MAE de ocho semanas ni se recalcula su confianza original.

## Verificación

Tipos, lint y compilación aprobaron; 38 pruebas analíticas en diez archivos. Las cinco pruebas nuevas comprueban periodo todavía abierto sin real/error, ausencia de real frente a precio real cero, extremos inclusivos, muestra pequeña identificada, importes mayores que el entero seguro de JavaScript, original congelado sin mutación y rechazo de fecha/rango/precio/peso inválidos.

Este es solo el cálculo de dominio. Persistencia de versiones de comparación, lectura central con corte de operaciones/compensaciones, API y frontend permanecen pendientes; no se alteró una publicación ni se creó una comparación real del negocio. La comprobación HTTP del historial bloqueada previamente se recuperó por revisión normal después de las 11:32; ver `verificacion-historial-publicaciones-2026-10-12.md`.
