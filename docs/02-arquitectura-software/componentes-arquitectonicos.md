# Componentes arquitectónicos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.3

| Componente | Responsabilidad | Corte / requisitos |
| --- | --- | --- |
| Identidad | Sesiones, roles, negocio y reemplazos | 001; RF01–02 |
| Recepción y pesaje | Proveedor, variedades, transporte, sacos, bruto/tara/neto, corrección y cierre | 002; RF03–06B |
| Compras | Precio, flete, descuentos y liquidación | 002; RF07, RF14 |
| Ventas y devoluciones | Despacho y compensación comercial | 003; RF10–12 |
| Cuentas y caja | Cuotas, pagos, cobros y reversos | 004; RF13–15 |
| Flete y estiba | Costos y liquidación de grupos | 004; RF15 |
| Cola y sincronización | Órdenes locales, dependencias y conflictos | 005; RF21 |
| Auditoría | Hechos anexables y consulta protegida | 005; RF22 |
| Reportes y comprobantes | Resumen de importes, costos, precios y PDF interno | 006; RF12, RF16–18 |
| Analítica predictiva | Estimaciones condicionadas a CL-08 | 007; RF19–20 |

Los nombres representan responsabilidades; la cola pertenece al cliente y la predicción aún no es un contenedor desplegado. RF23 permanece requisito documental: no se acredita aquí un canal de notificaciones configurables implementado.

## Relaciones y propiedad de responsabilidades

| Origen | Destino | Propósito | Comunicación |
| --- | --- | --- | --- |
| Pantalla | Servicio API/cola | Enviar o conservar la orden del usuario | Llamada local |
| Cliente | REST/identidad | Autenticar y ejecutar contratos protegidos | HTTPS/JSON en despliegue |
| Recepción | Historial | Conservar el detalle del cargamento al cerrar pesaje | Coordinación central |
| Compra | Historial/cuentas/caja/flete | Liquidar y registrar obligaciones/costos | Transacción PostgreSQL |
| Venta | Historial/cuentas/caja | Validar datos comerciales y confirmar despacho | Transacción PostgreSQL |
| Módulos operativos | Auditoría | Registrar hechos y compensaciones | Persistencia central |
| Reportes | Datos confirmados | Consultar importes, costos, precios y cuentas | Lectura por negocio |

La partición expresa responsabilidades. El código actual utiliza entidades compartidas para transacciones entre dominios; no se promete propiedad exclusiva de tablas ni eventos internos independientes que aún no existen.

## Imágenes del proyecto

![Diagrama nivel3-componentes de gestión mayorista de papa](../../img/nivel3-componentes.png)

Los diagramas representan las responsabilidades descritas en este documento. Cada imagen dispone de una fuente SVG editable en `img/fuentes-svg`, incluida la secuencia. Las fuentes SVG permiten editar los diagramas.

## Cobertura de las historias complementarias

| Componente existente | Historias | Responsabilidad |
| --- | --- | --- |
| Identidad y administración | HU07, HU12 | Inicio/cierre, revocación y reemplazos |
| Cuentas y caja | HU08, HU14 | Registrar abonos; consultar vencimientos para avisos |
| Estiba | HU09 | Registrar costos por grupo y liquidar |
| Comprobantes | HU10 | PDF interno y compartición autorizada |
| Historial comercial | HU11 | Búsqueda paginada y detalle por negocio |
| Auditoría | HU13 | Consultar cambios, usuario y motivo |

HU14 no introduce un proveedor externo contratado ni un servicio desplegado nuevo. RF16 cubre avisos internos; RF23 conserva el canal configurable pendiente. Las historias amplían la trazabilidad de responsabilidades existentes, sin modificar las unidades de despliegue.

## Lectura de la vista de componentes

La vista sigue la organización de la referencia académica: cliente Android, límite del backend, componentes comerciales, persistencia e integración externa. Cada rectángulo dentro de la API expresa una responsabilidad del monolito; no representa un servicio desplegado por separado. Recepción, compras y ventas conservan participantes, variedades y datos de transporte dentro de cada operación. Historial conserva las cantidades de cada operación, sin calcular remanentes.

La identidad protege todos los contratos; auditoría es transversal. Los avisos HU14 consultan vencimientos financieros; su canal externo aún no se selecciona. La analítica HU06 está condicionada a los criterios aprobados y su validación, sin afirmar precisión ni disponibilidad operativa. La compartición del PDF la realiza Android por decisión del usuario, no el backend mediante un proveedor de mensajería supuesto.

La persistencia es compartida dentro de una base transaccional. Esta documentación no impone propiedad exclusiva de tablas, una caché Redis, JWT, ERP, pasarela de pagos ni courier. El monolito existente utiliza entidades cruzadas en varias transacciones; las flechas expresan colaboración lógica y no garantizan interfaces públicas independientes ya implementadas.

La vista de componentes utiliza colores por responsabilidad y se mantiene alineada con C4 nivel 3. El contenido PDF se almacena en PostgreSQL con hash, versión y estado; no corresponde a un almacén externo independiente. La compartición parte del dispositivo Android.

## Organización vigente de los datos comerciales

Proveedores, compradores, variedades, vehículos y transportistas son datos de recepción, compras y ventas. No constituyen módulos independientes. Recepción conserva proveedor, variedad, vehículo y conductor del cargamento; compras utiliza esos datos para la liquidación; ventas conserva comprador, destino y transporte del despacho. RF03–RF05 mantienen su trazabilidad dentro de esas operaciones. Esta organización es el diseño vigente; no afirma una reorganización ya implementada del código.
