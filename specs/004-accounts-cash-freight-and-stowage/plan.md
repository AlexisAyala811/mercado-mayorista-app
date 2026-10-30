# Plan técnico 004: cuentas, caja, flete y estiba

**Estado:** aprobado para implementación

## Objetivo del corte

### Aislamiento y validación de costos — 26 de octubre de 2026

Montar formularios y consultas de flete/estiba exclusivamente para el Mayorista y separar su estado por credencial de sesión. Una respuesta anterior o un envío que termina después de abandonar la pantalla no debe modificar otra sesión ni su navegación; conservar las operaciones ya guardadas en cola. Consultas concurrentes aplican solo la respuesta más reciente. Validar fecha civil existente, año positivo e importe positivo antes de guardar una nueva estiba. Adaptar los campos al ancho disponible sin desbordamiento. Estos controles refuerzan permisos y reglas vigentes; no crean nuevas operaciones ni cambian efectos financieros.

Mantener cuentas por pagar y cobrar, movimientos de caja, flete, estiba y liquidación diaria con resultados reproducibles, origen identificable e historial inalterable.

## Diseño técnico propuesto

| Área | Responsabilidad | Regla de separación |
|---|---|---|
| Dominio | Cuenta, cuota, vencimiento, abono, cobro, caja, flete, estiba y liquidación. | Todos los saldos e importes se derivan mediante reglas puras. |
| Aplicación | Coordinar creación desde compra o venta, registro de movimiento y liquidación. | No modifica importes de origen para corregir un pago. |
| Datos | Mantener relaciones con operación de origen y estados de cada movimiento. | Nunca elimina el historial como forma de reverso. |
| Auditoría | Conservar usuario, fecha, motivo y relación de ajuste. | Un evento financiero confirmado no se duplica. |
| Interfaz | Mostrar saldo anterior, importe y saldo resultante antes de confirmar. | El Encargado no accede a cuentas ni caja. |

## Invariantes que se deberán probar

1. Cada cuenta tiene exactamente una operación de origen y contraparte identificable.
2. Un movimiento confirmado ajusta el saldo una sola vez y genera un movimiento de caja asociado cuando aplique.
3. Una corrección o reverso conserva el evento original y crea un ajuste trazable.
4. La suma de abonos, cobros, adelantos y ajustes explica el saldo actual de una cuenta.
5. La liquidación diaria conserva las operaciones, acuerdos y pagos de flete o estiba que la componen.

## Contratos y decisiones previas

1. Reglas de vencimiento, mora, pago anticipado, aplicación de abonos y excedentes.
2. Política de reverso, anulación, corrección y cierre de caja.
3. Fórmulas, unidades, precisión y redondeo para flete y estiba.
4. Datos de grupo de trabajadores y reglas de liquidación.
5. Permisos y periodos de acceso a reportes y alertas.

## Estrategia de verificación

- Pruebas de dominio con series de abonos, pagos anticipados, excedentes y reversos aprobados.
- Pruebas de integración entre compra o venta, cuenta, caja y liquidación.
- Pruebas de idempotencia para registro y reintento de movimientos.
- Validación de DS-030 a DS-033 con estados accesibles y filtros por vencimiento.
- Convergencia con 002, 003, 005 y 006 para efectos, sincronización y reportes compartidos.

## Bloqueadores

| Decisión | Bloquea |
|---|---|
| Vencimientos y orden de aplicación | Cálculo de saldo y alertas. |
| Excedentes, reversos y anulaciones | Integridad de caja y auditoría. |
| Fórmulas de flete y estiba | Liquidación, costos y reportes. |
| CL-04 | Idempotencia y confirmación de movimientos offline. |




## Trazabilidad complementaria aprobada el 7 de octubre de 2026

Referencia: `specs/user-stories.md`. Integrar en las verificaciones existentes, sin duplicar funcionalidades ni declarar completadas tareas por su documentación.

- [ ] Verificar HU04: Consulta sin modificar saldo.
- [ ] Verificar HU08: Abono idempotente y rechazo de importe superior al saldo.
- [ ] Verificar HU09: Registro y liquidación trazable de estiba por grupo.
## Convergencia de colecciones completas y centavos exactos

### Error de lectura financiera y reintento — 11 de octubre de 2026

Considerar cuentas y caja una lectura conjunta: si falla cualquiera, no presentar totales de cero ni estados vacíos como resultado confirmado. Mostrar error explícito con reintento de ambas colecciones y conservar filtros; solo una consulta completa exitosa habilita totales/listados. El error de abrir una cuenta no invalida una colección ya consultada correctamente. Mantener recuperación del movimiento confirmado si falla su consulta posterior. Rechazo 401 invalida la sesión; otros errores permiten reintentar. Verificar fallo inicial, fallo de una de las dos colecciones y recuperación sin encolar ni enviar operaciones.

Reiniciar el estado de cuentas al cambiar el token de sesión mediante una composición interna con clave. Invalidar la lectura de colecciones anterior por generación; después de desmontar, descartar cambios de estado y navegación de solicitudes pendientes. Si el guardado duradero termina después de desmontar, conservar su resultado en la cola y no iniciar el envío desde la pantalla antigua. Una operación ya enviada conserva su manejo central; no cancelar ni borrar sus efectos para corregir la presentación.

### Acceso a cuentas con historial de caja amplio

La comprobación en navegador con la API real mostró que todos los movimientos de caja se presentaban antes de la búsqueda de cuentas. Mantener los totales de la colección completa y ofrecer un control de despliegue explícito con recuento y estado expandido accesible. El historial comienza plegado; al abrirlo se muestran todos los movimientos ya consultados, sin cambiar permisos, cálculos, consulta o filtros de cuentas. Una caja vacía conserva su estado vacío real. Verificar despliegue/cierre y accesibilidad de controles en ancho compacto; esta adaptación no acredita convergencia Figma.

Las consultas compartidas de cuentas, movimientos de caja, transportistas, vehículos, flete, grupos y estiba deben recorrer todas las páginas autorizadas. El servicio frontend ensambla una colección completa conservando el tipo Page para los consumidores existentes; su limit representa los elementos ensamblados y offset es cero. No presentar primeras páginas como historial completo. Validar páginas, total estable y unicidad; ante colección cambiante o incompleta solicitar reintento, sin publicar una respuesta parcial. Las consultas no modifican saldos ni permisos.

Caja suma centavos con BigInt y formatea sus cadenas enteras; evitar Number para acumulados, aunque cada importe individual sea válido. Verificar registros posteriores al 100, página faltante/fallida, colecciones cambiantes y un acumulado superior al entero seguro de JavaScript. No confundir estas comprobaciones de servicio/componente con un ensayo Android o una instantánea transaccional central.

El selector de operación de estiba consume funciones separadas para cargar todas las recepciones y ventas; preservar la paginación explícita de los historiales. La lectura de una liquidación necesaria que falla debe impedir presentar una selección parcial como completa, con error y reintento, conservando los controles centrales de elegibilidad de cada operación.
## Revisión de liquidación de flete y estiba

Antes de abrir la confirmación y nuevamente antes de encolar, validar una fecha civil real YYYY-MM-DD, selección no vacía sin duplicados y registros presentes y pendientes en la colección consultada. Sumar importes en centavos BigInt, sin inferir saldos de caja. Mostrar tipo, fecha, cantidad seleccionada y total provisional de salida; el servidor vuelve a comprobar elegibilidad y evita duplicados. Congelar fecha y selección durante confirmación/envío y conservar selección al cancelar. No añadir restricciones de fechas futuras o importes agregados que no estén en el contrato central.

El retorno principal de 004 debe conservar el historial cuando existe y reemplazar por el menú protegido `/home` tras apertura directa o recarga sin historial. Usar una función compartida en Cuentas, Carros y Flete/estiba; el retorno interno de detalle conserva filtros. Revisar los demás módulos en su convergencia de navegación, preservando advertencias de formularios no guardados.

## Revisión de pagos y cobros antes del envío

Calcular una revisión provisional a partir del saldo central consultado y el importe validado, usando centavos enteros. Rechazar cero, formato inválido, cuenta no abierta e importe superior al saldo antes de mostrar confirmación y antes de encolar. La confirmación muestra saldo anterior, pago/cobro y saldo resultante provisional; el servidor vuelve a validar versión y saldo al recibir. Bloquear edición del importe mientras el diálogo o envío están activos, sin generar un UUID ni efectos para datos inválidos. Mantener envío duradero, idempotencia y consulta del resultado central ya implementados.
## Identificación y búsqueda de cuentas

### Revisión del reverso de pago o cobro — 11 de octubre de 2026

Antes de confirmar y encolar, comprobar que la cuenta no esté anulada, que el original exista en el historial y no sea un reverso ni tenga un movimiento compensatorio relacionado. Consumir `reversedPaymentId`, ya presente en la respuesta central, y conservar todos los originales y compensaciones. Mostrar contraparte, referencias de cuenta/movimiento, importe original, saldo anterior y suma provisional en centavos BigInt. Exigir motivo de 1–240 caracteres tras trim, conforme al DTO central. Bloquear edición/selección mientras se confirma o envía, permitir cancelar la selección y mantener el control central de versión, distribución e idempotencia. Estas guardas visuales no sustituyen las del backend ni autorizan modificar el importe original.

El listado y detalle central añaden counterpartyName mediante una consulta por lote delimitada por businessId e IDs de cuentas previamente autorizadas. Resolver provider/buyer usando counterpartyType e ID existentes; incluir nombres de registros desactivados para consulta histórica, sin devolver contactos ni catálogos de otros negocios. Una relación inexistente devuelve nombre nulo; no inferirlo del tipo de operación. No se requiere migración ni nuevos permisos.

El frontend conserva counterpartyType/Id y presenta nombre y referencia de cuenta en listado, detalle y confirmación de pago/cobro. Buscar por nombre o referencia, sin distinción de mayúsculas/acentos, y filtrar por pagar/cobrar y pendiente/pagada/anulada sobre la colección completa. Distinguir colección realmente vacía de búsqueda sin resultados; filtros de cuentas no cambian totales de caja ni registran efectos. Mantener contexto al consultar y regresar del detalle.
## Convergencia de Carros y búsqueda de logística

Se recuperó el contexto completo de Carros 18:459 el 11 de octubre, con búsqueda, filas grises, navegación y seis activos originales. Decisión humana posterior del 14 de octubre: conservar teléfono del transportista y placa del vehículo en campos separados, según la interpretación comunicada de «los dos»; no introducir correlativo ni valor N° combinado. La colocación/composición final requiere resolver el componente conectado User ausente del repositorio. La cuota Starter impidió completar los contextos de instancias. Fuente: `docs/sdd/decision-referencias-en-operaciones-2026-10-14.md`.

Mientras se completa la referencia, implementar la búsqueda funcional ya prevista: nombre/teléfono del transportista y placa/transportista/descripción del vehículo sobre colecciones completas, sin distinguir mayúsculas o acentos. Distinguir vacío real y búsqueda sin coincidencias, permitir limpiar y conservar contexto de edición sin registrar efectos al buscar. El campo N° del marco no se redefine por esta búsqueda y no se declara convergencia visual completa.


## Carga y sesión de logística — 12 de octubre de 2026

Distinguir error de lectura y vacío real; reintentar colecciones completas sin afirmar total cero ante fallos. Cada sesión monta su propio espacio de edición y descarta respuestas tardías. Durante mutaciones bloquear campos y duplicados de petición; 401 invalida la sesión. En teléfono, formularios en columna con ancho disponible y sin base mínima de 360 px. Este corte funcional no resuelve N° ni User conectado de Figma.


## Protección de salida de formularios de logística

Antes de abandonar la pantalla por Volver o retirada de ruta, comparar campos de transportista/vehículo con su registro original o formulario nuevo vacío. Si hay cambios sin guardar, ofrecer cancelar para conservar ambos formularios o salir descartándolos. La lectura, búsqueda y apertura sin modificaciones no requieren aviso. Mientras exista una mutación en curso, bloquear la salida para no perder su resultado. Recarga/cierre web usa advertencia del navegador; no se promete recuperación tras terminar el proceso ni bloqueo universal del historial externo del navegador. Reutilizar el patrón de salida de compra/venta y probar preservación/cancelación/descarte desde el usuario.

Complementar en web con useBrowserTraversalGuard, compartido con compra/venta/historial: detectar Navigation API y cancelar los eventos traverse cancelables antes del cambio de URL; reanudar por la clave original después del descarte. Conservar bloqueos de mutación/reemplazo, formularios independientes, permisos y persistencia de catálogo. No duplicar historial ni sustituir la guarda nativa; navegadores sin esa capacidad y recorridos reales de logística mantienen gates separados.


## Reemplazo de edición de logística

Seleccionar otro registro desde un formulario modificado requiere confirmación antes de reemplazar sus campos. Cancelar conserva el borrador; confirmar carga el registro elegido y conserva el otro formulario. Volver a elegir el mismo registro con cambios conserva la edición. La confirmación solo cambia estado local y nunca escribe el catálogo. Bloquear campos y nuevos reemplazos mientras el diálogo está abierto.

## Conservación de edición de Datos maestros — 14 de octubre

Decisión posterior del usuario: no hay módulo independiente de Catálogo; administración contextual dentro de cada operación, `docs/sdd/decision-referencias-en-operaciones-2026-10-14.md`. Reutilizar conservación/descarte del editor para una lista fija, avisando dirty/busy al formulario que mantiene las guardas de ruta. Cierre del editor vuelve a la operación y recarga opciones tras confirmación central sin perder su acuerdo. No otorgar administración al Encargado. La sección siguiente describe reglas reutilizables, no la navegación móvil vigente.

Aplicar a proveedores, compradores, variedades, calidades y procedencias el mismo criterio de protección local: comparar los campos visibles con el registro original o el formulario vacío. Abrir sin modificar o volver al valor original no genera aviso. Cambiar de lista, elegir otro registro, cancelar una edición o iniciar desactivación de otro registro requiere confirmar descarte cuando hay cambios; cancelar conserva todos los campos. Volver/remover ruta usa guardas nativa y web compartidas; recarga/cierre web usa beforeunload. Confirmar un reemplazo solo cambia el formulario, no envía mutaciones. Durante escritura o diálogo bloquear cambios y nuevos destinos; una escritura fallida conserva datos, y una confirmación central limpia el borrador aunque falle la recarga. SessionWorkspace por token sigue aislando respuestas anteriores. No prometer persistencia de este borrador tras terminar el proceso.


## Impacto de Mensajería y notificaciones — 26 de octubre de 2026

La especificación 008 incorpora HU15/RF25–26 y centraliza avisos HU14. Cuentas conserva saldos y vencimientos; Reportes conserva los endpoints previos por compatibilidad; Android comparte adjuntos por decisión del Mayorista. No ampliar permisos del Encargado, alterar importes ni reutilizar la cola comercial para enviar mensajes. Las referencias previas a canal pendiente se sustituyen por WhatsApp/correo mediante compartición manual; envío automático no aprobado.
