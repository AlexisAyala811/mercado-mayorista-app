# Motor predictivo puro — 12 de octubre de 2026

## Alcance comprobado

Primera parte técnica de T709/T710, contra `specs/007-analytics-and-progressive-ai/predictive-engine-plan.md` y los criterios CL-08 aprobados. El motor `weekly-mean-4-v1` recibe prefijos históricos explícitos; no accede a la base, no usa servicios externos y no se expone en una ruta pública ni en la pantalla.

Calcula la media de cuatro precios semanales ponderados previamente por peso, con unidades enteras de 0.0001 S/kg. El rango usa residuos anteriores del prefijo, percentil empírico 80, límites inclusivos y piso cero. Conserva periodo objetivo, versión, cantidad de residuos y ancho. La evaluación conserva ocho comparaciones y calcula MAE, referencia de la semana anterior, mejora exacta y cobertura observada. Retorna siempre revisión requerida y publicación no disponible.

## Pruebas ejecutadas

Tipos, lint y compilación aprobaron. El conjunto analítico aprobó 22 pruebas en seis archivos, incluidas ocho nuevas del motor:

- Serie alternante: MAE modelo S/ 1.0000 frente a referencia S/ 2.0000, ocho valores dentro del rango, sin autorización de publicación.
- Referencia perfecta: ambos errores cero no se interpretan como reducción relativa del 10 %.
- Cambiar el último real conserva los siete resultados anteriores y la predicción/rango del último objetivo.
- Rechazo de fechas inválidas, huecos, ventas insuficientes, peso cero, precio inválido, ventanas de menos de 18 o más de 26 semanas.
- Rechazo de objetivo incluido en entrenamiento, objetivos discontinuos y evaluación de menos de ocho semanas.
- Precios mayores que el entero seguro de JavaScript mantienen cálculo exacto y redondeo half-up; entradas congeladas no se modifican.
- Piso inferior cero y cobertura insuficiente ante dos objetivos fuera de rango.
- Siete de ocho cumplen cobertura (87.5 %); una tendencia creciente con MAE de modelo S/ 2.5000 frente a referencia S/ 1.0000 rechaza mejora.

Estas cifras pertenecen exclusivamente a pruebas sintéticas, no a operaciones ni a predicciones reales del negocio. No se mostraron en la aplicación ni se publicaron estimaciones.

## Trabajo necesario para integración

Construir y verificar instantáneas centrales antes de cada objetivo y al cierre de cada semana, con anulaciones y devoluciones fechadas. El motor por sí solo no prueba que el llamador entregue esas instantáneas: pasar la disponibilidad actual o la serie descriptiva permitiría fuga temporal. Persistir entradas, evaluaciones y versiones inmutables con retención aprobada; añadir revisión/revalidación del Mayorista y contratos API; integrar DS-045 y evaluación posterior. Sin esas piezas, T709/T710 y el objetivo general siguen abiertos.
