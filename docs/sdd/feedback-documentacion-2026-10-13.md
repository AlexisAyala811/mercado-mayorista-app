# Feedback integral de la documentación de Mercado

Fecha: 13 de octubre de 2026.

## Evaluación general

La documentación describe un problema comercial reconocible y una solución adecuada para registro de pesajes, compras, ventas y obligaciones de un mayorista de papa. Las historias distinguen correctamente consulta de cuentas, registro de abonos, búsqueda comercial y auditoría. El alcance conserva cantidades y pesos como historial y mantiene los saldos financieros sin calcular existencias.

El entregable tiene una base defendible, pero necesita una revisión de coherencia entre tablas, imágenes y fuente documental antes de considerarlo consolidado. La revisión es documental: no certifica funcionamiento de la aplicación ni cumplimiento medido de los atributos de calidad.

## Cobertura revisada

README y los 19 documentos académicos: actores, historias, requisitos, atributos, restricciones, drivers, decisiones, escenarios, arquitectura inicial, componentes, enfoque, estilo, diseño interno, patrones, principios y niveles C4 1–4. Se contrastan con build_propuesta.py, la propuesta Word y las fuentes de los diagramas afectados. El repositorio conserva 11 PNG y 11 SVG. Las referencias locales Markdown revisadas no presentan destinos inexistentes.

## Aspectos sólidos

- Problema y procesos vinculados al negocio real: descarga, peso por saco, precio, flete, adelantos y liquidación.
- Actor Encargado con identidad individual y reemplazo temporal restringido, sin administración financiera directa.
- Distinción entre saldo monetario y cantidad de mercadería en una operación.
- Trazabilidad HU–RF y retiros RF08/RF09 sin reutilización silenciosa de identificadores.
- Criterios de calidad medibles y declarados como objetivos, no resultados ya logrados.
- Idempotencia, versión, autorización central y transacciones adecuados a reintentos offline.
- Monolito modular en capas justificado para el proyecto y separación del cliente Android.
- Diferenciación explícita entre código constatado y extracción propuesta de puertos o casos de uso.

## Hallazgos y correcciones recomendadas

### 1. Prioridad alta: el nivel 3 repite la arquitectura inicial

Las fuentes SVG actuales de arquitectura-inicial y nivel3-componentes contienen los mismos actores, bloque combinado Android/REST, tarjetas y conexiones, salvo el título. El nivel 3 no representa las colaboraciones entre módulos que su documento describe. Se aprecia un inventario de responsabilidades, no una apertura detallada de los componentes de la API.

Referencia: docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md, líneas 7 y 35–45; img/fuentes-svg/nivel3-componentes.svg.

Corrección: mantener una visión general en arquitectura inicial. En nivel 3 separar Android de la entrada REST del backend, abrir el contenedor API y representar relaciones etiquetadas entre recepción, compras, ventas, cuentas, costos y auditoría. No reincorporar los módulos retirados.

### 2. Prioridad alta: tablas y diagramas no usan una organización común

La tabla de componentes y diseño interno incluye Cola y sincronización, Reportes y comprobantes y Analítica predictiva. La imagen presenta Historial y PDF y Analítica y avisos, omite la cola visible y agrupa avisos junto con analítica, aunque el documento atribuye vencimientos a cuentas. Las agrupaciones pueden variar por nivel, pero falta una correspondencia que justifique esas variaciones.

Referencia: docs/02-arquitectura-software/componentes-arquitectonicos.md, tabla inicial; docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md, líneas 24–31; imágenes arquitectura-inicial y nivel3-componentes.

Corrección: utilizar un vocabulario principal uniforme. Mostrar sincronización como responsabilidad del cliente, vencimientos como responsabilidad financiera y analítica como análisis del historial. Mantener identificadores HU/RF en las agrupaciones.

### 3. Prioridad alta: RF03 y RF04 difieren de la fuente de verdad

El entregable de GitHub describe RF03 como conservación de participantes y RF04 como datos de la operación. build_propuesta.py y el Word conservan contacto, ubicación, crédito y estado para RF03, y precio referencial para RF04. Retirar un módulo independiente no resuelve qué capacidades y campos deben mantenerse. La fuente y el entregable ya no expresan el mismo detalle funcional.

Referencia: docs/01-analisis-de-sistema/03-requisitos-funcionales.md, líneas 7–8; build_propuesta.py, requisitos RF03/RF04.

Corrección: reconciliar campos y capacidades dentro de recepción, compras y ventas. Conservar lo aprobado o registrar una decisión de alcance antes de suprimir gestión de datos comerciales. No crear otro módulo para resolverlo.

### 4. Prioridad media: trazabilidad de PDF inconsistente

La relación de HU10 establece RF12 como generación/compartición de comprobantes. El nivel 3 atribuye esa responsabilidad a HU10/RF17, pero RF17 corresponde a reportes. Aunque el componente cubra ambas funciones, los identificadores deben distinguirlas.

Referencia: docs/01-analisis-de-sistema/03-requisitos-funcionales.md, línea 69; docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md, línea 27.

Corrección: referenciar RF12 para comprobantes y RF17 para consultas de reportes.

### 5. Prioridad media: criterios analíticos y evidencias no están accesibles en el entregable

CL-08 aparece como condición de habilitación, pero GitHub no muestra sus umbrales. La propuesta compartida sí detalla 26 semanas consecutivas, cinco ventas válidas por semana y evaluación progresiva frente a una referencia. Varias referencias se limitan a decir documentación compartida del proyecto, por lo que un lector externo no puede reconstruir la aprobación o evidencia.

Referencia: requisitos, línea 65; decisiones arquitectónicas; escenarios de calidad, referencia a evidencia histórica; propuesta, sección de política analítica.

Corrección: resumir los criterios en un archivo existente, por ejemplo decisiones o restricciones, y referenciar su sección. Para pruebas, distinguir objetivo, evidencia disponible y evidencia pendiente con ubicación verificable. No añadir nuevas carpetas si se conserva la estructura del entregable.

### 6. Prioridad media: faltan recorridos completos de excepción financiera

La documentación especifica compensación y rechazo de sobrepagos, pero no muestra ejemplos completos de compra a crédito, venta a crédito y anulación después de abonos. Asimismo, la revalidación del reemplazo offline exige explicar qué ve el usuario cuando la orden ya no puede confirmarse.

Referencia: requisitos, líneas 61–68; diseño interno, reglas comerciales; nivel 4, alternativas de recorrido.

Corrección: agregar ejemplos y criterios verificables a archivos existentes. Identificar estados, saldo previo/posterior, origen de la compensación y revisión de pendientes sin decidir nuevas políticas no aprobadas.

### 7. Prioridad baja: metadatos y explicación visual desactualizados

Arquitectura inicial y estilo declaran actualización del 8 de octubre pese a los cambios del 13. Estilo todavía menciona cinco grupos aunque la tabla conserva cuatro y la imagen actual solo muestra capas. Arquitectura inicial describe una sección externa violeta y datos locales que la nueva imagen no dibuja. La paleta descrita en nivel 3 tampoco corresponde a todas las tarjetas actualmente verdes.

Referencia: arquitectura-inicial.md, líneas 3 y 19–25; estilo-arquitectonico.md, líneas 3 y 36; nivel3, sección Colores.

Corrección: actualizar versiones, fechas y texto asociado a cada imagen, después de resolver las vistas arquitectónicas.

### 8. Prioridad baja: términos y repetición editorial

Proveedor/Cliente puede confundirse con comprador en actores. Ventas y devoluciones y Ventas y despachos deben aclarar si son un módulo con operaciones adicionales. RF15 dice pagos de proveedores aunque HU08 se refiere a pagos a proveedores. RF23 incorpora pedidos pendientes sin definir claramente pedido como entidad del alcance. El README presenta una oración extensa sobre CL-08 y convergencia y algunos documentos repiten varias veces límites equivalentes.

Corrección: usar Proveedor y Comprador como roles comerciales inequívocos, aclarar despachos/devoluciones y normalizar pagos a proveedores. Definir qué significa pedido pendiente o alinear ese término con las operaciones existentes. Ordenar RF01–RF24 sin alterar los identificadores retirados. Consolidar explicaciones repetidas.

## Orden recomendado de cierre

1. Reconciliar RF03/RF04 y fijar el vocabulario común de módulos y responsabilidades.
2. Diferenciar arquitectura inicial de C4 nivel 3 y alinear tablas, colores y relaciones.
3. Corregir RF12/RF17 y hacer visibles los criterios CL-08.
4. Completar ejemplos financieros y errores offline contra las reglas aprobadas.
5. Actualizar metadatos y revisar redacción, enlaces y presentación de 10 diapositivas.

No es necesario cambiar el alcance que el usuario confirmó: pagos, abonos, deudas, historial de sacos/pesos y ausencia de saldo de mercadería. El objetivo de esta revisión es eliminar contradicciones documentales, no reincorporar inventario ni reorganizar el código.

## Estado

Este archivo registra feedback. La revisión no aplica correcciones a los archivos académicos, no crea un commit y no publica cambios en GitHub.
