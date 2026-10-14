# Decisiones arquitectónicas

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.2

Las decisiones adoptadas se consolidan desde el registro SDD; las versiones son las registradas en el proyecto, no una recomendación de actualización.

| Decisión | Estado y justificación | Trazabilidad |
| --- | --- | --- |
| Tablet Android; Expo, React Native, TypeScript estricto y Expo Router | Aprobada CL-03; captura táctil y separación de interfaz y dominio | R01, DA01; decisión móvil 001 |
| Monolito modular; NestJS y PostgreSQL; REST `/api/v1` | Aprobada plataforma backend; transacciones y menor costo operativo inicial | R03, R07, DA02, DA06; decisión backend 002 |
| Migraciones explícitas y `synchronize: false` | Aprobada; cambios de esquema revisables | AC03, AC08 |
| UUID por orden, resultado idempotente, versión y conflicto 409 | Aprobada CL-04; reintentos sin duplicación ni sobrescritura silenciosa | RF21, AC03, DA02 |
| Encargado con reemplazo autorizado, revocable y máximo 24 h | Aprobada CL-05; se revalida cada orden central | RF02, AC04 |
| Sesión segura y pendientes cifrados por usuario y negocio | Aprobada CL-06; pendientes bloqueados al cerrar sesión | RF01, RF21, R05 |
| Peso con tres decimales y dinero en céntimos | Aprobada CL-07; redondeo y cálculos verificables | RF06B, RF07, AC03 |
| Tablet 1280 × 800 horizontal; revisión 360 × 800 y 1440 × 1024 | Aprobada CL-09; recorridos nativos todavía pendientes de cierre | AC01, AC05 |
| Auditoría inmutable y conservación comercial mínima de 5 años | Aprobada CL-10; aislamiento también en archivos | RF22, AC04 |
| Predicción de precios | Criterios CL-08 aprobados el 6 de octubre de 2026; habilitar solo tras cumplirlos y validar implementación | RF19, RF20, R04, DA05 |

Consecuencias: un despliegue central simplifica operación, pero exige módulos bien delimitados; la cola local agrega estados y resolución de conflictos; el escalamiento horizontal requiere medir concurrencia y mantener la autoridad transaccional central.

Registro completo: decisiones y aprobaciones (documentación compartida del proyecto).

## Alternativas y consecuencias

| Elección | Alternativa considerada | Motivo y costo asumido |
| --- | --- | --- |
| Monolito modular | Microservicios | Equipo y operación inicial acotados; despliegue conjunto y acoplamientos deben vigilarse |
| Persistencia local temporal | Cliente dependiente permanentemente de Internet | La descarga debe continuar; agrega cifrado, reintentos y revisión de conflictos |
| PostgreSQL transaccional | Almacenes separados por cada dominio | Registros comerciales, cuentas y caja necesitan confirmar efectos coordinados |
| Token opaco y sesión central | Dar permisos solo desde el menú | Revocación y reemplazos exigen autoridad central por operación |
| Cálculo decimal determinista | Aritmética monetaria binaria en la pantalla | Evitar diferencias de redondeo y resultados no reproducibles |
| REST versionada | Acceso SQL desde dispositivo | Mantener autorización y reglas en una frontera controlada |

No se declara Clean Architecture completa: el backend actual tiene servicios que utilizan el ORM y entidades de varios dominios. La evolución hacia puertos más aislados requiere plan y verificación de atomicidad, sin alterar reglas comerciales aprobadas.

## ADR · Retiro del control de existencias

**Estado:** aprobado expresamente por el usuario el 7 de octubre de 2026.

Se mantiene historial de cargamentos, sacos, pesos, compras, ventas y despachos, sin inventario, cálculo de remanentes, disponibilidad, descuentos de stock ni alertas de mercadería. Los módulos y restricciones asociados a RF08/RF09 dejan de formar parte del objetivo funcional.

La decisión sustituye los aspectos de CL-07 y CL-11 basados en disponibilidad y valoración por lote. Mantiene precisión monetaria, cuentas, caja, auditoría e idempotencia. El margen calculado por valoración de existencias deja de estar aprobado en este alcance: definir una nueva fórmula requiere aclaración SDD y no se inventa en esta entrega.

Impacto de implementación: retirar navegación y contratos de existencias; adaptar cierre de pesaje, compra, venta y devoluciones; ajustar informes y pruebas; preservar hechos y datos históricos. No eliminar bases ni migraciones históricas para aplicar el cambio documental.

## Decisión de cobertura de historias complementarias

El usuario aprueba añadir HU07–HU14 a las seis historias vigentes el 7 de octubre de 2026. Las nuevas historias reutilizan identidad, cuentas/caja, estiba, comprobantes, historial y auditoría; no crean inventario ni amplían permisos del Encargado. RF24 explicita búsqueda comercial. Canal externo de HU14 permanece por aclarar. La renumeración anterior se documenta en la fuente compartida para evitar que HU07 siga significando analítica.

Actualización de evidencia compartida: la propuesta analítica fue aprobada íntegramente el 6 de octubre de 2026. CL-08 tiene criterios aprobados; la suficiencia real del historial, evaluación, implementación y convergencia no se acreditan por esa aprobación. El canal externo de recordatorios continúa por definir.

## Organización documental aprobada el 13 de octubre

Los nombres son responsabilidades del backend, no servicios desplegados por separado. **Cola y sincronización** pertenece al cliente Android (HU05; RF21): conserva órdenes cifradas y las reenvía a los contratos centrales. Los avisos financieros pertenecen a Cuentas y caja; Analítica analiza el historial. Las devoluciones y anulaciones son operaciones compensatorias dentro de Ventas y despachos o Compras, no módulos nuevos. Los datos de participantes, variedades y transporte se registran dentro de las operaciones comerciales; RF03/RF04 conservan sus campos aprobados. Esta decisión documental no certifica reorganización del código.

## Condiciones de habilitación analítica CL-08

La política aprobada exige 26 semanas completas consecutivas por negocio y variedad, con al menos cinco ventas confirmadas válidas por semana. El objetivo es precio semanal de venta por kilogramo ponderado por peso. No se imputan fechas, pesos ni precios y se identifican operaciones excluidas.

Las ocho semanas finales se evalúan progresivamente, sin utilizar datos futuros. El error absoluto medio debe ser al menos 10 % menor que la referencia del precio de la semana anterior, y el rango debe contener al menos siete de los ocho valores reales. La cobertura objetivo del 80 % no es una garantía estadística ni acredita estacionalidad anual. El Mayorista accede a las estimaciones solo cuando hay datos suficientes y evaluación aprobada. La aprobación de criterios no prueba su cumplimiento.
