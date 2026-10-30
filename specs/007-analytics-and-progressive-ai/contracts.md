# Contrato del primer corte analítico descriptivo



Estado: plan técnico para T706/T707 tras aprobación del 6 de octubre de 2026. Este corte no implementa ni certifica predicciones.



`GET /api/v1/analytics/series?from=YYYY-MM-DD&to=YYYY-MM-DD&varietyId=UUID` exige sesión Mayorista. `varietyId` es opcional en descriptiva; todas las filas se delimitan por negocio central. Periodo válido, ordenado y de máximo 366 días por consulta; se puede consultar otro periodo sin modificar los hechos. Semanas de lunes a domingo en America/Lima.



Cada punto identifica tipo compra/venta, variedad, semana, operaciones distintas, sacos, peso retenido, importe de mercadería, precio pactado equivalente por kg y referencias de operaciones/compensaciones. El precio pactado se calcula como importe bruto de mercadería dividido por peso, antes de descuentos, adelantos y flete; no se rotula como margen ni precio neto. La normalización sirve también para operaciones pactadas por saco: no se promedian directamente precios con unidades diferentes. Usar centavos y gramos enteros para agregación y división con redondeo half-up a cuatro decimales de S/kg.



Compras: usar sacos activos de recepciones y tarifas de liquidaciones confirmadas, agrupados por operación y variedad, conforme al alcance sin inventario aprobado el 7 de octubre de 2026. No consultar lotes ni valoración de existencias. Ventas: usar líneas de ventas confirmadas, descontando pesos/sacos/bruto autorizado de devoluciones comerciales con fecha anterior al cierre del periodo consultado. No contar una devolución como venta nueva; mantener sus referencias. Una devolución física sin autorización comercial no altera el precio comercial. El conjunto descriptivo refleja estados centrales vigentes y compensaciones al corte; no es por sí solo una instantánea histórica apta para backtesting sin fuga de información.



No imputar pesos o importes. Una fila inválida o totalmente compensada se lista como exclusión con motivo y referencia; no produce precio cero inventado. Una semana con pocos datos se muestra con sus cantidades reales. `complete` exige cobertura de toda la semana por el periodo y que la semana haya finalizado; no depende de tener cinco ventas. La evaluación de 26 semanas para pronóstico es otro contrato y no se deduce del periodo seleccionado en el tablero.



Respuesta: `filters`, `timeZone`, `generatedAt`, `priceDefinition`, `points[]` y `excluded[]`. Estados frontend: selección de periodo/variedad, consulta explícita, carga, resultados, ausencia de datos, error y reintento. Los cambios de filtros invalidan la presentación anterior para evitar rotular datos antiguos con un periodo nuevo. Esta infraestructura reutiliza componentes; no certifica aún una pantalla Figma DS-044.



## Filtros descriptivos de participantes — corte del 12 de octubre de 2026



La misma consulta admite `providerId=UUID` y `buyerId=UUID`, opcionales y validados en el servidor. El proveedor filtra exclusivamente compras por el proveedor de la recepción; el comprador filtra exclusivamente ventas por su comprador. Si se eligen ambos, cada serie mantiene su filtro independiente. Si uno no se elige, ese tipo conserva todos sus participantes. No cruzar compras y ventas por un participante ni inferir relaciones entre ellos. La respuesta incluye los dos IDs efectivos en `filters`; toda selección conserva la delimitación por negocio. Un ID ajeno o sin operaciones produce ausencia de filas de ese tipo, sin exponer nombres ni distinguir existencia ajena.



La interfaz rotula «Proveedor de compras» y «Comprador de ventas», explica el efecto separado y permite quitar cada selección. Cambiar cualquier filtro descriptivo descarta el resultado anterior y las respuestas tardías. Los filtros de participante no alteran la ventana ni los criterios de `/analytics/readiness`; seleccionar un subconjunto descriptivo no habilita predicciones. El corte posterior del mismo día sustituye los catálogos comerciales de esta pantalla por filtros históricos con desactivados. Los filtros de calidad/procedencia permanecen pendientes y requieren datos históricos verificables.



## Contrato de disponibilidad del historial predictivo



`GET /api/v1/analytics/readiness?asOf=YYYY-MM-DD&varietyId=UUID` requiere Mayorista y una variedad del negocio. Rechaza cortes futuros y variedades no disponibles en ese negocio sin distinguir IDs ajenos. La ventana es siempre las 26 semanas completas anteriores a la semana del corte (lunes–domingo, America/Lima), independientemente de Desde/Hasta del tablero. Devuelve cada semana, ventas válidas distintas, peso, referencias, exclusiones y criterios pendientes.



Reconstruir el estado comercial al corte con creación/anulación y compensaciones fechadas: una anulación o devolución posterior no puede modificar una lectura histórica anterior. Para disponibilidad al corte actual, las devoluciones registradas hasta ese corte reducen el peso/importe retenido de la venta original. No contar líneas o devoluciones como ventas distintas; no rellenar semanas vacías ni precios.



La salida separa `dataSufficient` de disponibilidad de predicción. Historial suficiente solo habilita la evaluación técnica, no una estimación publicada. MAE frente a referencia, cobertura 7/8, representatividad limitada y revisión del Mayorista siguen siendo condiciones independientes. En este corte, evaluación/publicación no implementadas se devuelven como pendientes, no como criterios aprobados. T708 permanece parcial hasta integrar evaluación y publicación de T709/T710.



La interfaz pide una variedad específica y un corte, muestra la ventana central, semanas que alcanzan cinco ventas, semanas insuficientes, exclusiones y razones pendientes. Mantener carga/error/reintento y descartar respuestas si cambian variedad/corte. Consultar disponibilidad no publica un precio ni altera operaciones.



La presentación descriptiva calcula variación porcentual únicamente entre semanas completas consecutivas de la misma variedad y tipo. Un vacío o una semana parcial produce un motivo explícito, conservando los precios observados. Las exclusiones descriptivas y de disponibilidad muestran referencia de operación, variedad, semana y motivo central; no se ocultan detrás de un recuento ni se reemplazan por datos imputados.





## Catálogos de filtros históricos



`GET /analytics/filters/providers`, `/buyers` y `/varieties` dentro del mismo prefijo devuelve páginas `{items, total, limit, offset}` con `id`, `name` e `isActive`, de todos los registros del negocio, incluidos desactivados. Máximo 100 por página, orden por nombre e ID. Solo Mayorista, con los mismos guards del módulo. No devuelve teléfonos, límites de crédito ni campos ajenos al análisis. La app carga todas las páginas y marca los desactivados en el selector. Estas consultas sustituyen al catálogo comercial únicamente en Analítica; no reactivan registros ni permiten usarlos en nuevas transacciones. Si falla un catálogo, se ofrece reintento sin mostrar su carga como vacía. Una variedad desactivada puede consultarse en su historial; no se elimina su evidencia.





## Conservación de evaluaciones



`GET /analytics/evaluations?varietyId=UUID&limit=20&offset=0` lista versiones conservadas de esa variedad y negocio, con paginación central de máximo 100 y orden `created_at DESC, id DESC`. Conteo y página usan una lectura coherente. Devuelve solo UUID, variedad, corte, algoritmo, huella y fechas; no transmite observaciones ni comparaciones de todas las versiones. Abrir una fila consulta GET por UUID y muestra su evidencia original. El historial no depende de la suficiencia actual ni de los filtros descriptivos Desde/Hasta/proveedor/comprador. Después de conservar una evaluación se actualiza la lista. Carga, vacío, error y reintento son independientes de la consulta del detalle; volver al listado conserva la página.



`POST /analytics/evaluations` recibe únicamente `{clientOperationId: UUID, varietyId: UUID, asOf: YYYY-MM-DD}`. Mayorista; rechaza cortes futuros, variedades ajenas y prefijos históricos insuficientes. Reconstruye y evalúa dentro de REPEATABLE READ, valida además las 26 semanas de la ventana final y guarda evaluación/auditoría. Reintentos transaccionales acotados ante carrera/serialización; tras agotarlos responde 503 para reintentar con el mismo UUID. La misma petición ya conservada se recupera antes de recalcular. `GET /analytics/evaluations/:id` devuelve la misma evidencia resumida del negocio, sin recalcular ni transmitir todas las observaciones crudas. Respuesta: versión, corte, algoritmo, huella, fechas/retención, ventana, MAEs, mejora, cobertura y ocho comparaciones históricas; `publicationAvailable=false` y revisión requerida. No se devuelve un precio futuro publicado.



La pantalla solicita conservar evidencia solo para una variedad específica con historial suficiente, ofrece carga/error/reintento con el mismo UUID y muestra los criterios y ocho filas históricas de la versión. Cambiar variedad, corte o sesión descarta respuestas tardías de esa vista; una evaluación guardada permanece centralmente. La publicación y la lista recuperable de versiones se completan en cortes posteriores.



Cada evaluación almacenada tiene UUID de versión, negocio, variedad, corte civil, versión de algoritmo, creador, fecha central, UUID de petición, huella SHA-256 de las entradas y evidencia JSON reproducible. La conservación mínima es de cinco años desde su creación. UPDATE y DELETE se rechazan mediante trigger; regenerar requiere UUID nuevo y crea otra fila. Un reintento de la misma petición devuelve su versión original si variedad y corte coinciden; reutilizar ese UUID con otros filtros es conflicto. La reconstrucción y el INSERT se ejecutan dentro de la misma transacción, junto con auditoría. No recalcular una versión ya guardada al consultarla. Consultas siempre por negocio y UUID; un ID ajeno se presenta como no disponible. Este contrato conserva evaluaciones, pero todavía no habilita publicación, ni define que aprobar una evaluación sustituya la revisión del Mayorista.





## Revisión previa a publicación



`GET /analytics/publications?varietyId=UUID&limit=20&offset=0` recupera versiones publicadas de la variedad y negocio, ordenadas por fecha/UUID descendentes y con página/conteo coherentes. Los resúmenes contienen referencia de evaluación, algoritmo, semana objetivo, revisión y fechas; el detalle GET por UUID devuelve el rango y variables originales. La interfaz conserva la página al abrir/cerrar, separa error/vacío y permite abrir la evidencia asociada mediante su UUID. No repite revisión ni publica al consultar. El historial permanece accesible con datos actuales insuficientes y no presenta su versión como prueba de elegibilidad actual.



`GET /analytics/evaluations/:id/publication-preview` prepara y revalida el candidato, pero devuelve al Mayorista solo periodo, versión, huella, variables y métricas de las ocho semanas para revisión. Los precios de la semana objetivo no se muestran antes de confirmar la revisión. `POST /analytics/publications` recibe `{clientOperationId: UUID, evaluationId: UUID, reviewed: true}`; rechaza ausencia/falsedad de la declaración, vuelve a verificar los hechos centrales y guarda publicación y auditoría dentro de una transacción. El UUID repetido devuelve el resultado original; otro UUID crea otra versión sin sobrescribir. La publicación contiene rango, cobertura objetivo/observada, ancho, variables, periodo, algoritmo, fecha, revisor y referencia de evidencia; retención mínima de cinco años, sin UPDATE/DELETE/TRUNCATE. GET por UUID conserva la versión original aunque luego cambien los criterios. Historial y evaluación posterior se completan aparte.



La estimación de `weekly-mean-4-v1` corresponde a la semana comercial que sigue a las 26 semanas completas de su evaluación. La revisión se limita a esa semana vigente; después debe generarse una evaluación nueva. Los precios de la semana objetivo en curso no se usan para calcularla. Antes de mostrar el rango para revisión y nuevamente al confirmar, el servidor verifica versión/huella/evaluación y reconstruye las operaciones de la ventana histórica con los hechos conocidos en ese instante, usando un corte timestamp exclusivo. El cambio de cantidades, importes, participantes de la serie o compensaciones obliga a evaluar otra vez; un cambio de nombre de catálogo no altera las entradas numéricas ni la identidad de variedad.



Mejora inferior al 10 %, referencia perfecta sin reducción relativa, cobertura menor a 7/8, semana insuficiente, ventana vencida, otra variedad/negocio o entrada alterada impiden preparar la publicación. Se conserva la evaluación original. Una vista previa apta contiene rango, semana objetivo, algoritmo, variables, fecha, MAEs, cobertura y referencia de evaluación; sigue requiriendo revisión explícita del Mayorista. El cliente no fija precios/rangos ni declara cumplidos los criterios. La confirmación, persistencia y revisión frontend utilizan estas guardas; recuperación del historial de publicaciones y evaluación posterior permanecen pendientes.





## Comparación posterior de una publicación



`GET /analytics/publications/:id/outcome` consulta, con sesión Mayorista y negocio central, la publicación original y ventas de su semana en una lectura coherente. Devuelve corte, estado, valor real/error/cobertura cuando corresponde y referencias/exclusiones. Es una consulta calculada, todavía sin conservación de una nueva versión posterior. La interfaz la incorpora al detalle publicado, con consulta explícita, carga, error/reintento y mensajes distintos para semana en curso y falta de real. La lectura no recalcula ni modifica el rango publicado.



La comparación usa el periodo y precio/rango originales de la publicación, por negocio y variedad. Antes de terminar su domingo en America/Lima devuelve semana en curso, sin precio real ni error. Al cerrar, agrega ventas confirmadas con cantidades retenidas y compensaciones conocidas en el corte de consulta. Sin operaciones/peso válidos informa ausencia de valor real; no lo sustituye por cero. Un precio real cero con peso positivo es un valor registrado válido y puede compararse.



El resultado informa precio semanal real ponderado, número de ventas distintas, peso, referencias/exclusiones, fecha del corte, error absoluto en S/kg y si el real está dentro de los límites inclusivos. Se necesita una operación válida para observar un precio; no se impone a la medición posterior el mínimo de cinco ventas exigido al entrenamiento, pero se muestra el tamaño de muestra. El error de una semana no se denomina MAE de ocho semanas ni garantía de confianza. Regenerar comparación conserva otra versión vinculada a la misma publicación; jamás actualiza la estimación original. Persistencia/API/frontend y ensayos de corte comercial se completan en T710.







### Versiones conservadas de comparación posterior



POST `/analytics/publications/:id/outcomes` recibe solo `clientOperationId` UUID. Mayorista y negocio central; reconstruye la comparación y su instantánea completa dentro de la transacción de conservación/auditoría. Semana abierta responde 409; una semana cerrada sin operaciones puede conservar la ausencia observada. Cada UUID nuevo conserva otra versión, mínimo cinco años; el mismo UUID recupera su resultado original, incluso si después cambian los hechos. Reutilizarlo para otra publicación responde 409. GET en esa ruta lista páginas de versiones; GET `/analytics/publications/:id/outcomes/:outcomeId` recupera la versión original, sin recalcular. Historial ordenado por fecha/UUID descendentes, máximo 100 por página, aislado por negocio y publicación. No se actualiza ni elimina evidencia ni estimación original. La consulta singular `/outcome` sigue siendo una medición sin persistencia; conservar es una acción explícita distinta.



### Reconciliación de disponibilidad actual

En `/analytics/readiness`, un corte igual al día actual de Lima verifica además la última publicación de la variedad/negocio, su evidencia original y las entradas comerciales actuales, dentro de REPEATABLE READ. `availability` distingue `not_published`, `current`, `requires_reevaluation` y `not_checked_historical`, con referencias, instante y explicación. Solo `current` pone `predictionAvailable=true` y acredita evaluación/cobertura/revisión. Las consultas de días pasados reconstruyen historial sin afirmar vigencia pasada o actual. Una versión vencida o con entradas modificadas permanece accesible, pero no se presenta como vigente. Los fallos de infraestructura se propagan como error, no como insuficiencia. No cambia precios, publica automáticamente ni impide recuperar versiones originales.
## Consulta de referencias descriptivas

La tarjeta semanal permite desplegar operationIds y compensationIds ya presentes en el punto, en grupos separados y páginas locales de 20. El cierre retira sus páginas; cambiar el resultado no conserva referencias ajenas ni offset fuera de rango. Controles identificados por semana, variedad y compra/venta, estado expandido y rango legible. No añade rutas ni modifica el contrato de lectura, los criterios predictivos o la autorización Mayorista. No sustituye los filtros pendientes de calidad/procedencia comercial.
