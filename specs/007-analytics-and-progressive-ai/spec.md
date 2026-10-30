# Especificación 007: Analítica e inteligencia artificial progresiva

**Estado:** requisitos y decisiones de producto aprobados el 6 de octubre de 2026; implementación y convergencia pendientes.

## Objetivo

Transformar el historial validado de operaciones en indicadores, tendencias y patrones útiles para el Mayorista; habilitar estimaciones semanales de precio únicamente cuando exista evidencia suficiente y comunicar sus límites con claridad.

## Trazabilidad

- HU06: tendencias, patrones y estimación semanal con rango, confianza y comparación con valor real.
- RF17 y RF18: reportes y evolución de precios.
- RF19 y RF20: analítica, estimaciones, variables y seguimiento de error.
- R04: IA por etapas según calidad, continuidad y volumen de datos.
- DA05: proceso analítico separado de transacciones.
- AC04 y AC07: aislamiento por negocio y evolución mantenible.
- CL-08 y CL-10.

## Principios de funcionamiento

1. Las transacciones comerciales confirmadas siguen siendo la fuente de los análisis; el módulo analítico no modifica compras, ventas, inventario, cuentas ni precios.
2. Las primeras capacidades son descriptivas: tendencias, comparaciones y patrones del historial validado.
3. Una estimación de precio se muestra solo después de cumplir criterios aprobados de cantidad, calidad y continuidad de datos.
4. Toda estimación informa periodo, rango, nivel de confianza, variables utilizadas y fecha de generación.
5. El Mayorista mantiene la decisión final sobre precios y operaciones; la estimación es apoyo, no automatización de decisiones.

## Requisitos funcionales verificables

1. El Mayorista puede comparar la evolución de precios por variedad, calidad, procedencia, proveedor, cliente y periodo.
2. El sistema identifica y presenta tendencias y patrones a partir del historial validado del negocio.
3. El sistema distingue visualmente resultados descriptivos de estimaciones predictivas.
4. Una estimación semanal muestra rango, nivel de confianza, periodo, fecha y variables utilizadas.
5. El sistema compara una estimación anterior con el valor real cuando la información posterior está disponible.
6. Cuando el historial no cumple los criterios aprobados, el sistema explica que solo puede mostrar análisis descriptivo o que requiere más datos.
7. Los datos, resultados y archivos analíticos de un negocio no se exponen a usuarios de otro negocio.
8. El sistema conserva trazabilidad de la versión del análisis, datos de entrada aprobados y fecha de generación.

## Criterios de aceptación

### Escenario: Tendencia descriptiva

**Dado** un Mayorista con historial validado de compras y ventas, **cuando** consulta una variedad y periodo, **entonces** el sistema muestra la evolución disponible y deja claros los filtros aplicados.

### Escenario: Datos insuficientes para estimar

**Dado** un historial que no cumple los criterios aprobados para predicción, **cuando** el Mayorista consulta estimaciones, **entonces** el sistema no presenta un precio previsto como resultado y explica el estado de disponibilidad de datos.

### Escenario: Estimación disponible

**Dado** un historial que cumple los criterios aprobados, **cuando** se genera una estimación semanal, **entonces** el sistema muestra periodo, rango, confianza, variables utilizadas y fecha, distinguiéndola de una recomendación obligatoria.

### Escenario: Comparación posterior

**Dado** una estimación con periodo finalizado y valor real registrado, **cuando** el Mayorista revisa su desempeño, **entonces** el sistema muestra la comparación entre previsto y real con la evidencia asociada.

## Diseño y experiencia

- El tablero separa indicadores operativos, tendencias descriptivas y estimaciones predictivas.
- Una estimación debe usar lenguaje de incertidumbre y evitar mostrar un único valor como certeza.
- Los filtros de periodo y variedad deben ser visibles y comprensibles.
- La explicación de datos insuficientes debe orientar al usuario sin prometer una fecha no sustentada.
- Figma requiere un tablero analítico y vistas de tendencia, patrón, estimación y evaluación posterior.

## Artefactos SDD relacionados

- Plan técnico: `plan.md`.
- Tareas verificables y sus bloqueos: `tasks.md`.

## Decisiones aprobadas

La aprobación íntegra de `docs/sdd/analytics-decision-proposal.md` resuelve CL-08, los permisos y la conservación específica de 007. El módulo completo es exclusivo del Mayorista; el backend debe impedir también el acceso directo del Encargado.

La serie objetivo es el precio semanal de venta por kilogramo ponderado por peso, por negocio y variedad. Se exigen 26 semanas completas consecutivas con al menos cinco ventas confirmadas válidas y peso total positivo por semana. No imputar fechas, pesos ni precios; mostrar las operaciones excluidas. La muestra no acredita estacionalidad anual ni se extrapola a otra variedad, calidad, procedencia o temporada.

Evaluar las ocho semanas finales de forma progresiva, usando únicamente información anterior a cada semana. El MAE en S/kg debe ser al menos 10 % menor que el de la referencia de precio de la semana anterior. Publicar ambos errores y las ocho comparaciones. El rango tiene cobertura objetivo del 80 % y debe contener al menos siete de los ocho valores reales evaluados; mostrar cobertura observada y ancho, sin prometer una garantía estadística.

Todos los criterios y la revisión de la evidencia por el Mayorista son necesarios antes de publicar una estimación. Una semana incompleta o un cambio que invalide los criterios suspende nuevas predicciones y mantiene las publicadas. Ninguna cifra de demostración ni un proveedor genérico de IA sustituye estas guardas.

Conservar estimaciones publicadas, evaluaciones, versión del algoritmo, parámetros, filtros y referencias de entrada durante al menos cinco años, con aislamiento y protección de CL-10. Regenerar crea una nueva versión; no reemplaza una publicada. Las copias de trabajo se pueden reconstruir sin eliminar entradas necesarias para reproducir evidencia conservada.

### Escenario: Revisión y cambio de disponibilidad

**Dado** un historial suficiente y una evaluación aprobada, **cuando** el Mayorista revisa y confirma la evidencia, **entonces** puede publicar una estimación versionada. Si después los criterios dejan de cumplirse, no se publica otra estimación; las anteriores siguen disponibles con su evidencia y evaluación posterior.

### Escenario: Acceso del Encargado

**Dado** un Encargado con reemplazo comercial vigente, **cuando** intenta consultar el tablero o una estimación por ruta directa, **entonces** la API deniega el acceso y no devuelve datos analíticos. El reemplazo no amplía estos permisos.

## Alineación de historias del 7 de octubre de 2026

HU06: tendencias/estimaciones (antes HU07); criterios CL-08 aprobados el 6 de octubre de 2026, implementación y validación pendientes. Referencia vigente: `specs/user-stories.md`, con RF y aceptación. Incorporar esta trazabilidad en diseño, planes y tareas del corte sin declarar nueva funcionalidad implementada.

## Características comerciales RF04 / CL-13 — 14 de octubre de 2026

Calidad comercial y lugar de origen de la papa se capturan por saco de compra y línea de venta, de forma independiente de proveedor, comprador y variedad. El Mayorista administra las dos listas y el Encargado selecciona opciones existentes solo en sus operaciones autorizadas. «No informada» es una opción explícita; no reconstruir características históricas a partir de otros campos. Conservar etiquetas en el hecho, herencia de devoluciones y consultas/PDF trazables aunque se edite o desactive el catálogo. Sin inventario ni cambios de criterios predictivos. Decisión y secuencia de confirmación: `docs/sdd/propuesta-calidad-procedencia-2026-10-14.md`. Contratos y plan transversal: `specs/007-analytics-and-progressive-ai/commercial-characteristics-plan.md`. Implementación y convergencia todavía pendientes; no declarar RF04 terminado por el catálogo.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
