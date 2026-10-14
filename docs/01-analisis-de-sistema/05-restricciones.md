# Restricciones

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.2

| Código | Restricción | Implicación arquitectónica |
| --- | --- | --- |
| R 01 | La primera versión operará en tablets Android y debe admitir conectividad irregular. | Interfaz adaptable, almacenamiento local cifrado y sincronización diferida. |
| R 02 | El registro de pesos se realizará manualmente durante el piloto. | El flujo debe ser rápido, secuencial y permitir corrección trazable antes del cierre. |
| R 03 | La base de datos central será la fuente oficial de operaciones y saldos. | La caché solo almacenará información temporal y podrá reconstruirse. |
| R 04 | La capacidad de la IA dependerá de la cantidad, continuidad y calidad del historial disponible. | Operará por etapas: recolección y validación, tendencias y patrones, y predicción con rango y confianza cuando exista evidencia suficiente. |
| R 05 | Los datos de cada negocio deben permanecer aislados. | Autorización por rol y negocio en todos los servicios y consultas. |
| R 06 | El MVP no incluye facturación electrónica, GPS, pasarela de pagos ni balanzas integradas. | Se conservarán interfaces versionadas para integraciones futuras. |
| R 07 | La solución debe ajustarse al presupuesto y capacidad operativa del proyecto. | Se priorizarán servicios administrados y despliegue gradual. |

## Restricciones técnicas aprobadas derivadas

| Decisión vinculante | Implicación |
| --- | --- |
| Cliente Expo/React Native, TypeScript estricto y Expo Router | Adaptar captura táctil a Android y separar navegación del dominio |
| PostgreSQL central y API REST `/api/v1` | La tablet no abre conexiones SQL ni determina saldos oficiales |
| Monolito modular con NestJS | Un despliegue backend con responsabilidades comerciales delimitadas |
| Migraciones explícitas | No generar cambios automáticos de esquema en operación |
| Git y repositorio GitHub | Versionar requisitos, diagramas y decisiones junto con sus cambios |

Estas decisiones complementan R01–R07 sin renumerarlas. El ejemplo académico usa un marketplace web; aquí no se incorporan carrito, sellers, ERP, courier ni pasarela de pagos porque no forman parte del alcance aprobado.

## Condiciones de habilitación analítica CL-08

La política aprobada exige 26 semanas completas consecutivas por negocio y variedad, con al menos cinco ventas confirmadas válidas por semana. El objetivo es precio semanal de venta por kilogramo ponderado por peso. No se imputan fechas, pesos ni precios y se identifican operaciones excluidas.

Las ocho semanas finales se evalúan progresivamente, sin utilizar datos futuros. El error absoluto medio debe ser al menos 10 % menor que la referencia del precio de la semana anterior, y el rango debe contener al menos siete de los ocho valores reales. La cobertura objetivo del 80 % no es una garantía estadística ni acredita estacionalidad anual. El Mayorista accede a las estimaciones solo cuando hay datos suficientes y evaluación aprobada. La aprobación de criterios no prueba su cumplimiento.
