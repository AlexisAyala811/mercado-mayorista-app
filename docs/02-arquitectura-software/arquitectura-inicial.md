# Arquitectura inicial

> **Proyecto:** Gestión mayorista de papa · **Entregable:** 1 · **Versión:** 1.3 · **Actualización:** 13 de octubre de 2026

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

## Responsabilidades del negocio

| Responsabilidad backend | Función | Historias y requisitos |
| --- | --- | --- |
| Identidad y reemplazos | Sesiones, permisos y reemplazos | HU07, HU12; RF01–02 |
| Recepción y pesaje | Proveedor, variedades, transporte, sacos, bruto/tara/neto y cierre | HU01; RF03–06B |
| Compras | Proveedor, precio, flete, adelantos, descuentos y liquidación | HU02; RF03, RF07, RF14 |
| Ventas y despachos | Comprador, variedades, destino, transporte y compensaciones | HU03; RF03–04, RF10–11, RF13 |
| Cuentas y caja | Pagos, cobros, cuotas, saldos y avisos de vencimiento | HU04, HU08, HU14; RF13–16, RF23 |
| Flete y estiba | Costos de transporte y liquidación de grupos | HU09; RF15 |
| Historial comercial | Búsqueda y detalle por fecha o participante | HU11; RF24 |
| Reportes y comprobantes | Consultas comerciales y generación/compartición PDF | HU10; RF12, RF17–18 |
| Auditoría | Usuario, fecha, acción, motivo y origen | HU13; RF22 |
| Analítica | Tendencias y estimaciones condicionadas a CL-08 | HU06; RF18–20 |

Los nombres son responsabilidades del backend, no servicios desplegados por separado. **Cola y sincronización** pertenece al cliente Android (HU05; RF21): conserva órdenes cifradas y las reenvía a los contratos centrales. Los avisos financieros pertenecen a Cuentas y caja; Analítica analiza el historial. Las devoluciones y anulaciones son operaciones compensatorias dentro de Ventas y despachos o Compras, no módulos nuevos.

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
