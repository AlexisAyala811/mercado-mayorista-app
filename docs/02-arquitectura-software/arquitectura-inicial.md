# Arquitectura inicial

> **Proyecto:** Gestión mayorista de papa · **Entregable:** 1 · **Versión:** 1.3 · **Actualización:** 8 de octubre de 2026

## Visión de la solución

Mercado registra recepción y pesaje de cargamentos, compras, ventas y despachos, costos y obligaciones comerciales desde una tablet Android. Separa captura e interacción, entrada de API, lógica de negocio y persistencia central. El backend es un monolito modular en capas; el cliente Android conserva órdenes temporales cuando falla la conexión.

Las cantidades y pesos se guardan por operación, sin inventario, saldo de mercadería, descuento de stock o bloqueo de ventas por disponibilidad. Sí se calculan importes y saldos financieros de pagos, cobros y deudas.

## Diagrama de arquitectura inicial

![Arquitectura inicial de Mercado con colores por responsabilidad](../../img/arquitectura-inicial.png)

Fuente editable: [arquitectura-inicial.svg](../../img/fuentes-svg/arquitectura-inicial.svg).

## Capas y colores

| Grupo | Color | Responsabilidad |
| --- | --- | --- |
| Actores | Azul índigo | Mayorista y Encargado con reemplazo autorizado |
| Presentación y entrada API | Azul | Android captura y presenta resultados; REST valida identidad, permisos y entrada |
| Lógica de negocio | Verde | Reglas de pesaje, compra, venta, cuentas, costos, historial, auditoría y analítica |
| Datos locales y centrales | Ámbar | Pendientes cifrados en el dispositivo; hechos confirmados y comprobantes en PostgreSQL |
| Sistema externo | Violeta | Aplicación de comunicación elegida para compartir un PDF |

El color facilita lectura, pero cada responsabilidad tiene etiqueta. La agrupación de presentación y entrada API es conceptual: Android y NestJS son aplicaciones distintas. No significa que se desplieguen juntas ni que sus datos se compartan directamente.

## Módulos del negocio

- Identidad y reemplazos: acceso individual, sesión, rol, negocio y autorización temporal.
- Recepción y pesaje: detalle saco por saco, tara, neto, totales y cierre trazable.
- Compras: precio negociado, flete, adelantos, descuentos y monto líquido.
- Ventas y despachos: registro de cantidades enviadas, destino y condiciones comerciales, sin validar existencias.
- Cuentas y caja: cuotas, abonos, pagos, cobros, vencimientos y saldos de dinero.
- Flete y estiba: registro y liquidación de costos de transporte y grupos de trabajadores.
- Historial y comprobantes: búsqueda, consultas comerciales, reportes y PDF interno.
- Auditoría y analítica: responsables, acciones y análisis del historial validado; estimaciones condicionadas a criterios y evaluación aprobados.

Estas agrupaciones resumen responsabilidades, no crean servicios independientes ni sustituyen la organización actual del código.

## Persistencia y continuidad

Android conserva sesión y pendientes cifrados por usuario/negocio. La API es la autoridad para confirmar operaciones, permisos y saldos; PostgreSQL conserva operaciones, pesajes, cuentas, costos y auditoría. El contenido PDF también se persiste en PostgreSQL con sus metadatos, hash, versión y estado.

Una orden pendiente no equivale a confirmación central. Al recuperar conexión, el cliente reenvía por REST usando el mismo UUID; el servidor revalida sesión, reemplazo, negocio y versión. Los reintentos recuperan el resultado sin duplicar sacos o efectos financieros. Los conflictos se revisan sin sobrescritura silenciosa. La tablet nunca accede a PostgreSQL por SQL.

## Recorrido de recepción y compra

1. Registrar proveedor, fecha, vehículo, conductor y variedades.
2. Ingresar cada saco con peso bruto y tara cuando corresponda; revisar neto y totales.
3. Cerrar el pesaje y conservar el detalle individual del cargamento, sin crear existencias.
4. Registrar precio, modalidad de flete, adelantos, descuentos y pago al contado o cuotas.
5. Confirmar liquidación, cuenta/caja, costos y auditoría en la transacción central correspondiente.
6. Consultar el resultado y generar el comprobante interno; el Mayorista puede compartirlo desde Android.

## Integración externa y límites

La compartición PDF usa la aplicación que el usuario elige en su dispositivo. No se presupone integración automática de mensajería desde el backend. El canal externo de avisos de vencimiento HU14 sigue por definir. La solución inicial no incorpora pasarela de pagos, ERP, courier, facturación electrónica, GPS ni balanzas integradas.

La analítica tiene criterios aprobados, pero su habilitación requiere datos suficientes, implementación y evaluación verificables. La ilustración no acredita despliegue productivo, precisión predictiva o cierre funcional. La evolución de interfaces y adaptación del código debe verificarse mediante SDD, conservando datos históricos.

## Vistas relacionadas

- [Componentes arquitectónicos](componentes-arquitectonicos.md).
- [Enfoque arquitectónico](enfoque-aquitectonico.md).
- [Estilo arquitectónico](estilo-arquitectonico.md).
- [C4 nivel 1 Contexto](../04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md).
- [C4 nivel 2 Contenedores](../04-modelo-c4/Nivel2-DiagramadeContenedores.md).

## Organización vigente de los datos comerciales

Proveedores, compradores, variedades, vehículos y transportistas son datos de recepción, compras y ventas. No constituyen módulos independientes. Recepción conserva proveedor, variedad, vehículo y conductor del cargamento; compras utiliza esos datos para la liquidación; ventas conserva comprador, destino y transporte del despacho. RF03–RF05 mantienen su trazabilidad dentro de esas operaciones. Esta organización es el diseño vigente; no afirma una reorganización ya implementada del código.
