# Plan técnico 007: analítica e inteligencia artificial progresiva

**Estado:** decisiones de producto aprobadas el 6 de octubre de 2026; planificación técnica por cortes. La publicación predictiva requiere completar contratos, algoritmo reproducible, persistencia y ensayos.

## Objetivo del corte

### Convergencia de fechas — 28 de octubre de 2026

La interfaz valida fechas civiles reales, orden y máximo inclusivo de 366 días antes de consultar la serie, conforme al contrato vigente del servicio. Disponibilidad predictiva valida únicamente su corte `Hasta`, sin depender de `Desde` ni de los filtros descriptivos. El periodo inicial y los instantes de generación, versiones y conservación se presentan en `America/Lima`, independientemente de la zona del dispositivo. Reutilizar funciones de fecha compartidas, conservar mensajes de error/reintento y comprobar el límite bisiesto y la frontera de medianoche UTC. No cambia el algoritmo, la retención ni los criterios de publicación.

Ofrecer análisis descriptivo basado en operaciones confirmadas y habilitar estimaciones semanales solo si los criterios aprobados demuestran suficiencia de datos, protección y evaluación.

## Diseño técnico propuesto

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Datos analíticos | Construir conjuntos derivados a partir de transacciones confirmadas. | No modifica compras, ventas, inventario, cuentas ni precios. |
| Analítica descriptiva | Calcular tendencias, comparaciones y patrones filtrados. | Indica periodo, filtros y actualización. |
| Predicción | Generar rango, confianza, variables, versión y fecha. | No se habilita sin criterios de suficiencia aprobados. |
| Evaluación | Comparar estimación histórica con valor real y conservar evidencia. | No oculta resultados o versiones anteriores. |
| Interfaz | Distinguir indicador, tendencia y estimación; explicar insuficiencia. | Nunca presenta una predicción como decisión automática. |

## Invariantes que se deberán probar

1. Los resultados analíticos y archivos derivados se aíslan por negocio y autorización.
2. Una estimación siempre indica periodo, rango, confianza, variables, versión y fecha de generación.
3. Cuando no existe suficiencia aprobada, la interfaz no muestra un precio previsto como resultado.
4. Los datos analíticos provienen de operaciones confirmadas y trazables.
5. La comparación con valor real conserva la estimación original y la evidencia evaluada.

## Contratos y decisiones previas

1. Umbrales de cantidad, calidad, continuidad y representatividad de datos.
2. Métrica de error, ventana de evaluación y umbral de confianza.
3. Retención, protección y acceso a resultados, modelos y datos derivados.
4. Permisos del Encargado sobre analítica descriptiva y predicciones.
5. Proceso de versionado, regeneración y revisión de una estimación.

## Estrategia de verificación

- Pruebas de filtros, aislamiento y trazabilidad de indicadores descriptivos.
- Pruebas de guardas de suficiencia: sin criterios cumplidos no existe predicción visible.
- Pruebas de metadatos, rango, confianza y evaluación contra valor real.
- Validación de DS-044 y DS-045, con mensajes claros de incertidumbre y datos insuficientes.
- Convergencia con 005 y 006 por auditoría, datos derivados y reportes.

## Primer corte técnico después de aprobación

Separar `AnalyticsModule` de reportes y transacciones. La API protege todo el módulo con el rol Mayorista e identidad central; cada consulta delimita explícitamente `businessId`. El frontend tendrá ruta `/analytics` protegida además por `WholesalerRoute`, servicio API separado, dominio tipado y composición que distingue series descriptivas de disponibilidad predictiva. No copiar los precios unitarios del historial actual como si fueran precios por kg: el contrato de Reportes no incluye pesos suficientes para calcular la serie ponderada.

### Contrato descriptivo por definir e implementar en T706–T707

`GET /api/v1/analytics/series` recibe periodo y variedad y devuelve filtros efectivos, zona horaria comercial `America/Lima`, fecha de generación, semanas completas/incompletas, recuento de operaciones confirmadas distintas, cantidad de sacos, peso neto y precio por kg ponderado por peso. Separar compras y ventas. Cada punto conserva referencias a operaciones de entrada y exclusiones con motivo. Periodos vacíos no producen precios de cero. No mezclar bases por saco y kilogramo sin convertir usando cantidades y pesos centrales reales.

Una anulación excluye el original del conjunto vigente. Una devolución comercial mantiene referencias al original y a sus hechos compensatorios; no se representa como una venta nueva positiva. Antes de fijar SQL y fórmulas, contrastar descuentos y compensaciones con el dominio y los contratos de CL-11/CL-12. Los filtros de calidad/procedencia requieren campos históricos disponibles; no derivarlos del nombre de la variedad ni presentar filtros sin datos.

El corte descriptivo del 12 de octubre añade `providerId` y `buyerId` a la consulta y respuesta efectiva. Se aplican en SQL exclusivamente a recepción/proveedor y venta/comprador, respectivamente, manteniendo el negocio central y las reglas de compensación existentes. Los selectores reutilizan catálogos comerciales, permiten limpiar selecciones independientes y descartan resultados al cambiar filtros. La composición analítica se reinicia por sesión para no conservar filtros o respuestas de otra identidad. La disponibilidad predictiva conserva exclusivamente variedad y corte; no evalúa subconjuntos de proveedor/comprador. Ver contrato y evidencia del corte.

### Guarda y estimación

El corte posterior del 12 de octubre usa endpoints `/analytics/filters/providers`, `/buyers` y `/varieties`, exclusivos del Mayorista, para selección histórica incluyendo desactivados. Devuelven solamente ID, nombre y estado, con páginas de máximo 100 y orden estable por nombre/ID. La app reúne las páginas mediante el lector de colecciones existente, bloquea selectores durante carga o error y ofrece reintento. Catálogos y formularios de nuevas operaciones no cambian. Contrato y comprobación: `docs/sdd/verificacion-analitica-historicos-2026-10-12.md`.

La suficiencia usa las 26 semanas completas anteriores al corte, excluyendo la semana en curso. Contar ventas distintas, no líneas ni devoluciones. La ventana seleccionada para el tablero no reduce el historial exigido para predicción. El contrato de evaluación devuelve cada criterio aprobado, evidencia y motivos incumplidos; ninguna pantalla genera un valor previsto a partir de las series por sí sola.

La implementación predictiva debe definir un algoritmo determinista versionado, entrenamiento anterior a cada punto evaluado y construcción reproducible del rango sin fuga de información. La referencia es el precio real de la semana previa. Resolver explícitamente errores nulos, exclusiones, redondeo, semana incompleta y ausencia de valor real. El resultado de evaluación es candidato; publicar requiere acción del Mayorista que confirme revisión y revalide el corte vigente.

La primera versión técnica se define en `predictive-engine-plan.md`: media de cuatro precios semanales, rango empírico con residuos anteriores y evaluación de ocho prefijos históricos. El motor puro implementa cálculo y criterios exactos sin consultar datos ni autorizar publicación. Debe integrarse únicamente con instantáneas temporales verificadas, no con la serie descriptiva vigente. Las pruebas sintéticas no acreditan precisión real.

Persistir publicaciones y evaluaciones inmutables mediante migración explícita, con UUID, negocio, variedad, periodo, versión, parámetros, referencias de entradas, métricas, fecha, creador y retención mínima de cinco años. Una evaluación posterior se vincula a la publicación original. No sustituir esta persistencia por caché del teléfono.

La migración 021 y `EvaluationStore` implementan conservación de evaluaciones con UUID por versión, huella canónica, triggers de inmutabilidad, retención y auditoría transaccional. Prueba PostgreSQL aislada: `docs/sdd/verificacion-conservacion-analitica-2026-10-12.md`. No están todavía aplicados al esquema público de integración ni expuestos por HTTP. Completar servicio de reconstrucción/guardado con reintento concurrente y revisión antes de conectar la publicación.

Los cortes posteriores del 12 de octubre aplicaron la migración a la base UI aislada y conectaron POST/GET, panel de evaluación e historial paginado por variedad. El historial obtiene resúmenes mínimos y recupera detalles centrales sin recalcular; es independiente de la suficiencia vigente y se actualiza tras guardar. Evidencias vigentes: `verificacion-evaluacion-api-frontend-2026-10-12.md` y `verificacion-historial-evaluaciones-2026-10-12.md` en `docs/sdd`. La integración positiva de creación/lectura y la carrera concurrente reales, la revisión/publicación y el seguimiento posterior permanecen pendientes.

El ensayo posterior `docs/sdd/verificacion-evaluacion-concurrente-2026-10-12.md` comprobó la carrera real de dos conexiones PostgreSQL, recuperación de una sola versión/auditoría y recorrido HTTP positivo del controlador con fuentes sintéticas aisladas. Detalla el adaptador transaccional pg y la entrada de sesión de prueba; no equivale a datos reales, al pool TypeORM completo o al recorrido positivo frontend/nativo. Revisión/publicación y seguimiento posterior permanecen pendientes.

El corte `docs/sdd/verificacion-publicacion-revisada-2026-10-12.md` completa migración 022, vista previa, declaración de revisión en frontend y confirmación central revalidada con publicación/auditoría inmutables. La vista previa oculta precios objetivo hasta la confirmación. La carrera, replay, rechazo de cambios e inmutabilidad se comprobaron en PostgreSQL aislado. Quedan historial recuperable de publicaciones, seguimiento posterior y reconciliación de disponibilidad, además de la verificación visual/nativa.

El historial recuperable de publicaciones y la evaluación original de solo lectura se implementan en el corte `docs/sdd/verificacion-historial-publicaciones-2026-10-12.md`. Tipos, lint, pruebas y PostgreSQL/controlador aislados aprobaron. La comprobación del endpoint nuevo contra la API de integración quedó pendiente por fallo de revisión automática debido a su límite de uso; no se sustituyó por otra vía. Seguimiento posterior, disponibilidad y verificación visual/nativa continúan pendientes.

La comprobación HTTP pendiente se recuperó por el control normal después del horario indicado; evidencia actualizada. La consulta posterior ya conecta dominio, ventas centrales y panel del detalle publicado (`docs/sdd/verificacion-consulta-posterior-2026-10-12.md`). Distingue periodo abierto, falta de real y comparación calculada sin alterar la publicación. Falta conservar/recuperar versiones posteriores, además de disponibilidad y convergencia visual/nativa.

### Secuencia verificable

1. Alinear fuente documental y DOCX con la aprobación; verificar el documento generado.
2. Definir contratos de series y compensaciones; implementar conjunto y pruebas de aislamiento/filtros/ponderación.
3. Implementar tablero, carga, vacío, error, reintento y comparaciones descriptivas con API real.
4. Implementar evaluación de suficiencia y motivos, sin cifras predictivas cuando falte un criterio.
5. Definir algoritmo/rango, evaluación progresiva y publicaciones inmutables; probar versiones y revisión.
6. Integrar estimaciones y evaluación posterior en tablet; completar convergencia visual de DS-044/DS-045 con la tarea de diseño.

## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU06: Aplicar criterios aprobados CL-08; no publicar predicción sin datos/evaluación suficientes.


## Fuente descriptiva de compras sin inventario — 7 de octubre de 2026

La aprobación analítica completa permanece vigente conforme a `docs/sdd/analytics-decision-proposal.md`; la adaptación al alcance sin inventario no cambia los umbrales aprobados ni habilita predicciones. Para compras confirmadas, agregar los sacos activos por operación/variedad y sumar sus pesos netos. El importe bruto descriptivo por variedad conserva la regla anterior: redondeo half-up del peso agregado por tarifa si la base es kilogramo; cantidad de sacos por tarifa si es saco. La definición sigue siendo mercadería antes de descuentos y flete. No consultar valoración ni existencia por lote. Las correcciones anuladas se excluyen y se conserva trazabilidad a la liquidación.

### Comparaciones y exclusiones del tablero — 11 de octubre de 2026

Comparar porcentualmente solo semanas completas consecutivas de la misma variedad y tipo de operación. Si falta la semana anterior o cualquiera de las dos es parcial, conservar el precio observado y explicar por qué no se calcula variación. Ordenar una copia de los puntos antes de comparar; no depender del orden de transporte ni modificar la respuesta. Verificar discontinuidad, semanas parciales, separación por variedad/tipo y cálculo exacto con pruebas de dominio e integración de pantalla.

La disponibilidad predictiva debe permitir inspeccionar cada exclusión con referencia de operación, semana, variedad y motivo central, además del recuento agregado. No convertir exclusiones en ventas válidas ni en precios imputados. Esta presentación consume el contrato vigente; no publica predicciones ni modifica permisos o transacciones.

Verificación real de SQL con PostgreSQL 17 mediante tablas temporales: dos compras sin lotes, cuatro sacos activos y 60.000 kg producen 15000 céntimos y precio ponderado 2.5000 S/kg; el saco corregido de 999 kg se excluye. No se persistieron transacciones ni estimaciones. La fuente de ventas y suficiencia aún requiere reconciliación con SI-04/SI-05. Evaluación, versionado, conservación de cinco años y publicación predictiva siguen pendientes de implementación y verificación.


## Conservación posterior implementada — 12 de octubre

Migración 023, POST/GET por publicación, instantánea y resultado inmutables, retención mínima de cinco años, auditoría atómica y recuperación idempotente. Frontend con acción explícita, reintento, detalle e historial paginado. Sustituye la persistencia posterior pendiente en cortes anteriores; ver `docs/sdd/verificacion-historial-comparaciones-2026-10-12.md`. Persisten validación visual/nativa, concurrencia específica y reconciliación de disponibilidad; no cerrar T710 por pruebas sintéticas.


## Disponibilidad publicada reconciliada — 12 de octubre de 2026

T708/T709 incorporan disponibilidad central de la última publicación para el corte actual: revalidación transaccional, referencia e instante, estado vigente/reevaluación/ausencia y distinción de cortes históricos. Frontend conectado y casos PostgreSQL verificados en `docs/sdd/verificacion-disponibilidad-publicada-2026-10-12.md`. Sustituye la reconciliación de disponibilidad pendiente de cortes anteriores. Permanecen abiertos recorridos visuales/nativos, Figma y requisitos restantes.
## Referencias descriptivas consultables

Presentar las operationIds/compensationIds ya incluidas en cada punto del contrato central mediante expansión explícita por semana/tipo/variedad. Mostrar operaciones y devoluciones por separado, páginas locales de 20 referencias, conteos/rangos y controles accesibles. Cerrar o consultar otro conjunto retira sus referencias; un conjunto reducido no puede dejar una página vacía por un offset anterior. No consultar otras APIs, modificar importes o usar estas referencias para habilitar estimaciones. Esto cubre trazabilidad del punto, no filtros de calidad/procedencia comercial ni una instantánea de entrenamiento. Mantener abiertos sus requisitos y DS-044/DS-045.

## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
