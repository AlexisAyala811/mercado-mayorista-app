# Nivel 3 Diagrama de componentes

> **Proyecto:** Gestión mayorista de papa · **Modelo:** C4 · **Contenedor:** API Mercado · **Versión:** 1.4

## Objetivo

Abrir el contenedor API Mercado del nivel 2 para mostrar sus componentes comerciales y relaciones. La aplicación Android está fuera del límite de la API; los componentes de negocio se ejecutan dentro del mismo monolito modular NestJS. No hay un servicio desplegado por cada historia o módulo.

## Diagrama de componentes

![Componentes de la API Mercado con colores por responsabilidad](../../img/nivel3-componentes.png)

Fuente editable: [nivel3-componentes.svg](../../img/fuentes-svg/nivel3-componentes.svg).

## Componentes y correspondencia con el proyecto

| Componente o responsabilidad | Código de referencia en `mercado-api/src` | Función y trazabilidad |
| --- | --- | --- |
| API REST | Controladores, DTO y guardas de los módulos | `/api/v1`, sesión, rol, negocio y validación; entrada a los servicios |
| Identidad y reemplazos | `identity` | Sesión, usuarios y reemplazo autorizado; HU07/HU12 |
| Recepción y pesaje | `reception` | Detalle de sacos, tara, neto, totales y cierre; HU01 |
| Compras | `purchase` | Precio, flete, adelantos, líquido y resultado financiero; HU02 |
| Ventas y despachos | `sales` | Operación comercial y cobro o saldo, sin descontar existencias; HU03 |
| Cuentas y caja | `accounts` | Cuotas, abonos, pagos, cobros y saldo financiero; HU04/HU08 |
| Flete y estiba | `freight`, `stowage` | Costos y liquidación trazable por grupo; HU09/RF15 |
| Historial comercial | Consultas de `reception`, `purchase`, `sales` y `operations` | Búsqueda y detalle comercial por negocio; HU11; responsabilidad lógica sin módulo nuevo supuesto |
| Reportes y PDF | `reports`, `receipts` | Consultas, generación y descarga autorizada de comprobantes; HU10/RF12; reportes RF17 |
| Auditoría | `audit` | Registro y consulta de usuario, fecha, acción y motivo; HU13 |
| Analítica | `analytics` | Historial validado, tendencias y estimaciones condicionadas; HU06 |

Los avisos HU14 se basan en vencimientos de cuentas. Su canal externo sigue por definir; no se afirma un módulo de mensajería desplegado. HU05 corresponde a la cola cifrada en Android, que reenvía órdenes a los mismos contratos centrales.

## Relaciones comerciales principales

| Origen | Destino | Relación | Mecanismo |
| --- | --- | --- | --- |
| Android | API REST | Envía órdenes y consulta resultados/archivos | HTTPS/JSON en despliegue |
| API REST | Servicios de los módulos | Valida y delega la operación solicitada | Invocación dentro del proceso |
| Recepción y pesaje | Compras | Conserva detalle de pesaje para liquidar | Colaboración lógica central |
| Compras | Cuentas/caja | Genera obligación o pago según condiciones | Transacción PostgreSQL |
| Ventas | Cuentas/caja | Genera cobro o deuda según condiciones | Transacción PostgreSQL |
| Flete/estiba | Caja | Registra liquidación de costos | Coordinación transaccional |
| Módulos operativos | Auditoría | Conservan el hecho y su responsable | Persistencia coordinada |
| Consultas/reportes | PostgreSQL | Recuperan datos confirmados del negocio | Lectura SQL autorizada |
| Android | Aplicación externa elegida | Comparte el PDF descargado | Panel de compartición del dispositivo |

Las conexiones entre módulos describen responsabilidades y efectos comerciales. El código actual también accede a entidades de dominios relacionados dentro de una transacción; no todas las flechas equivalen a llamadas entre servicios públicos aislados.

## Persistencia y comprobantes

Los módulos utilizan PostgreSQL mediante repositorios, DataSource y transacciones. Se mantienen migraciones explícitas y restricciones centrales. No se afirma propiedad exclusiva de tablas por módulo: los límites y la reducción de acoplamiento requieren evolución y verificación.

El contenido PDF se conserva en PostgreSQL: `receipts/receipt-document.entity.ts` usa un campo `bytea`, y el servicio de comprobantes conserva hash, versión y estado. Por eso esta vista no introduce un almacén de archivos separado ni un proveedor externo. La API autoriza la descarga y Android realiza la compartición por decisión del Mayorista.

## Colores de la vista

Azul identifica Android y entrada REST; índigo, identidad; verde, pesaje/compra/venta; ámbar, cuentas/costos y persistencia; violeta, historial/reportes/analítica; gris, auditoría. Cada elemento mantiene su etiqueta. Avisos de vencimiento pertenece a Cuentas y caja.

## Reglas del monolito y del alcance

1. Los módulos se despliegan juntos dentro de la API; una colaboración interna no es una llamada de red entre microservicios.
2. La API controla sesión, rol, reemplazo, negocio y recurso; la navegación no sustituye autorización.
3. UUID, versión y transacción evitan duplicación y cambios parciales; los conflictos requieren revisión.
4. Pesos y cantidades son detalles comerciales, sin inventario, saldo de mercadería o bloqueo de ventas por disponibilidad.
5. Auditoría y compensaciones conservan hechos, origen y motivo. Los reportes no alteran operaciones.
6. Analítica conserva criterios aprobados, suficiencia de datos y evaluación verificable; dibujar el módulo no acredita precisión ni cierre funcional.
7. No se incorporan Redis, ERP, pasarela de pagos, courier, GPS o balanzas a partir del ejemplo.

## Convergencia

La imagen resume el alcance objetivo y los módulos constatados en el código; no certifica que todos los contratos hayan convergido al retiro de existencias. Las dependencias directas entre entidades y la separación de casos de uso/puertos deben verificarse mediante SDD y pruebas, conservando datos y migraciones históricas.

Anterior: [Nivel 2 Contenedores](Nivel2-DiagramadeContenedores.md). Siguiente: [Nivel 4 Código](Nivel4-DiagramadeCodigo.md).

## Organización vigente de los datos comerciales

Proveedores, compradores, variedades, vehículos y transportistas son datos de recepción, compras y ventas. No constituyen módulos independientes. Recepción conserva proveedor, variedad, vehículo y conductor del cargamento; compras utiliza esos datos para la liquidación; ventas conserva comprador, destino y transporte del despacho. RF03–RF05 mantienen su trazabilidad dentro de esas operaciones. Esta organización es el diseño vigente; no afirma una reorganización ya implementada del código.

## Correspondencia de responsabilidades

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
