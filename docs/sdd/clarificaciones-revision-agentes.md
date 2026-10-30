# Registro de aclaraciones de la revisión de cuatro agentes

Fecha: 2026-09-23.
Estado: hallazgos y propuestas pendientes de resolución; no constituye una nueva especificación ni una aprobación de cambios.

## Alcance y coordinación

El usuario solicitó poner a trabajar a Arquitecto, Project Manager, Auditor de Seguridad y Mentor de Framework. Los cuatro realizaron una revisión de solo lectura. Este registro consolida sus resultados para las tareas documental, de diseño y técnica.

Fuentes: AGENTS.md, build_propuesta.py y comprobación textual de las tablas del DOCX vigente. Las referencias de línea corresponden a la revisión de esta fecha. También se consultaron las tareas «Conectar a Figma» y «Analiza el archivo disponible». En la primera consta la decisión del usuario de trabajar sobre un proyecto real completo, no sobre un alcance recortado. El historial reciente accesible de la segunda no expuso contenido suficiente para establecer decisiones editoriales anteriores.

La propuesta sigue siendo la fuente de requisitos. Los hallazgos no autorizan a cambiar actores, reglas o tecnologías. No se modificaron el generador, el Word ni Figma durante esta revisión.

## Estado observado

- Existen propuesta, generador, diagramas y materiales de revisión documental.
- Antes de crear este registro no se encontraron artefactos separados de constitución, especificación, plan o tareas SDD en el directorio.
- No se encontró una aplicación implementada ni configuración de stack. Las carpetas QA existentes no acreditan pruebas de producto.
- La línea base declara que debe validarse con comerciantes (build_propuesta.py:846).
- Actores documentados: Mayorista y Encargado. Las propuestas de aclaración deben respetarlos.

## Aclaraciones compartidas

| ID | Prioridad | Evidencia y pregunta pendiente | Coordinación e impacto |
| --- | --- | --- | --- |
| CL-01 | Alta | build_propuesta.py:940, 1049 y 1065 recorta módulos, aceptación y riesgos con slices. Se confirmó en el Word la ausencia de Cuentas/caja y Analítica/IA en la tabla de módulos, y de criterios y riesgos posteriores a los cortes. ¿Son decisiones editoriales deliberadas y cómo se preservará la trazabilidad? | Documentación reconcilia fuente y salida. Diseño y técnica no interpretan omisión de una tabla como exclusión funcional. |
| CL-02 | Alta | AGENTS.md contempla comprobantes PDF; RF12 está en build_propuesta.py:862 pero el filtro de 875–878 lo excluye de la tabla generada. ¿Dónde se documenta su alcance vigente y aceptación? | Documentación define trazabilidad; diseño necesita flujo y permisos; técnica necesita contrato y verificación. |
| CL-03 | Alta | AGENTS.md prioriza Expo/React Native y TypeScript estricto; build_propuesta.py:954 ofrece Flutter/Kotlin como referencias sin selección final. Falta una decisión técnica coherente. | Técnica propone una decisión contrastada con requisitos; documentación la refleja y diseño utiliza las restricciones acordadas. No se ha elegido ni instalado un framework. |
| CL-04 | Alta | build_propuesta.py:886 y 960–963 permiten cola y reintentos; 1041 dice transmitir una sola vez. Falta precisar conflictos entre dispositivos, respuesta perdida y rechazo central. | Definir un único efecto confirmado ante reenvíos; acordar conflictos antes de implementar. Diseño debe representar pendientes, confirmados y rechazos. |
| CL-05 | Alta | build_propuesta.py:830 y 850 condicionan permisos del Encargado a la ausencia del Mayorista; 1004 limita sesiones. ¿Cómo comienza y termina el reemplazo y qué ocurre con autorización expirada o revocada durante trabajo offline? | Documentación precisa política; diseño expresa estado y recuperación; técnica comprueba autorización central y tratamiento de pendientes. |
| CL-06 | Alta | build_propuesta.py:898 habla de caché reconstruible, mientras 891 y 960 reconocen operaciones locales no sincronizadas. ¿Qué pérdida es tolerable y qué se preserva al cerrar sesión, reiniciar o reconstruir caché? | Separar datos descargados de operaciones pendientes únicas. Especificar recuperación local y límites ante pérdida de tablet. |
| CL-07 | Alta | build_propuesta.py:856 genera lote al cerrar pesaje; 919 fija precio y pago después. Faltan disponibilidad del lote, estados de confirmación y reglas de precisión, tara, redondeo y correcciones. | Documentación acuerda reglas e invariantes; diseño refleja estados; técnica deriva transacciones y pruebas con ejemplos aprobados. |
| CL-08 | Media | build_propuesta.py:967–973 condiciona pronósticos a datos suficientes sin umbrales; 1018 prevé cuatro semanas de IA. | Definir criterio de habilitación y evaluación. El calendario no demuestra suficiencia de datos; conservar distinción entre analítica descriptiva y pronóstico. |
| CL-09 | Media | build_propuesta.py:884–891 fija objetivos de calidad; 977–983 describe despliegue gradual. Faltan dispositivo representativo, volumen de prueba y topología mínima por etapa. | Técnica propone ambiente y pruebas; diseño valida tamaños y orientación; documentación conserva criterios medibles. |
| CL-10 | Media | build_propuesta.py:900, 970–973, 984–985 y 1006–1010 define aislamiento y auditoría, pero faltan comprobaciones para derivados analíticos, archivos y registros. | Completar escenarios de acceso entre negocios, conservación y protección de auditoría; no son vulnerabilidades de código demostradas. |

## Próximo trabajo propuesto

1. Resolver con la tarea documental CL-01 y CL-02, manteniendo el alcance completo solicitado y registrando decisiones explícitas.
2. Formalizar constitución y especificaciones desde las fuentes vigentes, sin duplicar requisitos independientes.
3. Aclarar reglas bloqueantes de permisos, cálculos y sincronización antes del plan técnico.
4. Documentar la decisión de tecnologías y preparar tareas verificables vinculadas a requisitos y diseño.
5. Implementar por cortes verticales sin recortar el alcance global; comparar requisito, diseño, código y evidencia al cerrar cada corte.

## Verificaciones técnicas propuestas, aún no ejecutadas

- Captura secuencial, corrección y cierre en tablet representativa; medir guardado local contra AC01.
- Captura offline, cierre abrupto y recuperación de pendientes; verificar separación por usuario/negocio y protección local.
- Cinco reenvíos, respuesta de confirmación perdida y conflictos de stock: verificar un único efecto confirmado y resolución visible.
- Ejemplos aprobados de tara, flete, adelantos, liquidación y abonos mediante pruebas de dominio independientes de la interfaz.

Cada resolución debe registrar decisión, evidencia, artefactos afectados y validación correspondiente. Hasta entonces estos puntos permanecen abiertos.

## Seguimiento coordinado del 23 de septiembre

El usuario dio conformidad al diagnóstico y a la prioridad de reconciliar la documentación. Esto permite avanzar en la corrección editorial; no fija por sí mismo las respuestas a las preguntas de negocio o la selección de tecnologías.

### Contexto editorial confirmado

La tarea documental «Analiza el archivo disponible» confirmó que el usuario había fijado un máximo estricto de 15 páginas para el Word. Los recortes de tablas y el filtro de requisitos se utilizaron para cumplir ese límite de maquetación, sin aprobar una reducción funcional. CL-01 y CL-02 tienen ahora una causa editorial conocida; permanecen abiertas hasta verificar que la versión condensada conserva su trazabilidad dentro de las 15 páginas.

La misma tarea confirmó que Flutter/Kotlin y las tecnologías de servidor eran referencias neutrales, no una selección aprobada. CL-03 continúa pendiente de una decisión técnica SDD coherente con las instrucciones vigentes.

### Artefactos disponibles después de la revisión inicial

- `.specify/memory/constitution.md`: principios y proceso del proyecto.
- `specs/001-authentication-and-authorisation/spec.md`: borrador de autenticación y autorización; mantiene preguntas abiertas.
- `specs/001-authentication-and-authorisation/checklists/requirements.md`: revisión de requisitos del borrador.

La observación inicial de ausencia de artefactos describe el momento de aquella revisión; estos archivos se crearon posteriormente por la tarea coordinada de diseño. Su existencia no acredita aprobación de todas las reglas ni implementación del producto.

### Responsabilidad de los cambios en curso

- Documentación: propiedad exclusiva de `build_propuesta.py`, el DOCX y sus salidas de revisión durante la reconciliación; condensar y reorganizar sin omisiones silenciosas, respetando 15 páginas.
- Diseño: mantener constitución y borrador de autenticación alineados; el inicio de sesión del Encargado no debe resolver implícitamente cuándo está vigente su reemplazo. CL-05 sigue abierta.
- Esta tarea: consolidar aclaraciones y comprobar el resultado documental; no editar simultáneamente los archivos asignados a documentación.

### Cierre de CL-01 y CL-02

La tarea documental reconcilió `build_propuesta.py` y regeneró `Propuesta_Aplicacion_Movil_Gestion_Comercial_Papa.docx` sin cambiar reglas de negocio ni seleccionar tecnologías:

- matriz condensada de RF01 a RF23, incluyendo RF12 y conservando RF06A/RF06B;
- nueve módulos, incluidos Cuentas y caja y Analítica e IA;
- nueve filas de aceptación que conservan seguridad, usabilidad, rendimiento, disponibilidad, caché, observabilidad y recuperación;
- ocho grupos de riesgos que conservan adopción, conectividad, datos y pesaje, pérdida de tablet, saldos e inventario, IA, caché y complejidad operativa.

Se verificaron estructuralmente 25 entradas de requisitos, nueve módulos, nueve criterios consolidados y ocho grupos de riesgos. La revisión visual independiente de las 15 páginas no mostró tablas partidas, texto superpuesto ni contenido fuera de página. CL-01 y CL-02 quedan cerradas como divergencias editoriales resueltas. Las demás aclaraciones conservan su estado pendiente.

## Cambio de alcance aprobado el 7 de octubre de 2026

La decisión registrada en `docs/sdd/cambio-alcance-sin-inventario.md` sustituye las conclusiones anteriores que asumían inventario o saldo de mercadería. El sistema conserva cantidades y pesos dentro del historial de compras, pesajes, ventas y despachos, pero no calcula existencias restantes, no descuenta stock, no bloquea ventas por disponibilidad y no genera alertas de bajo stock. Los saldos financieros permanecen en alcance.

- RF08 y RF09 quedan retirados sin reutilizar sus códigos.
- RF06B conserva el detalle de pesaje y deja de crear existencias.
- RF16, RF17 y RF23 excluyen stock.
- CL-07 queda sustituida en lo relativo a disponibilidad y valoración por lote. Continúan pendientes o vigentes sus aspectos de tara, precisión, redondeo, correcciones y estados de confirmación que no dependan de inventario.
- La verificación propuesta de conflictos de stock queda retirada. La sincronización debe verificar que reintentos no dupliquen compras, ventas, pesajes, pagos ni saldos financieros.
- CL-08 continúa pendiente para definir cuándo puede habilitarse la predicción.

La reconciliación editorial del 23 de septiembre fue correcta para el alcance de ese momento, pero no acredita el nuevo alcance. `build_propuesta.py` y el DOCX deben regenerarse desde la decisión vigente antes de volver a declararlos convergentes.
