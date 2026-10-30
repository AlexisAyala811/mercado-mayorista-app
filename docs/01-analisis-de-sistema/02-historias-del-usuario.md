# Historias de usuario

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

| ID | Historia de usuario | Módulo |
| --- | --- | --- |
| HU01 | Como mayorista o encargado con reemplazo autorizado, quiero registrar el proveedor, las variedades y el peso de cada saco durante la descarga, con su calidad y procedencia, para conocer la cantidad y el peso total del cargamento de papa. | Recepción y compras |
| HU02 | Como mayorista o encargado con reemplazo autorizado, quiero registrar el precio acordado, el flete, los adelantos y la forma de pago de una compra, para conocer el monto líquido por pagar al proveedor y el saldo pendiente. | Recepción y compras |
| HU03 | Como mayorista o encargado con reemplazo autorizado, quiero registrar ventas y despachos de papa indicando comprador, destino, variedades, calidad, procedencia, sacos y flete, para mantener el registro de la mercadería enviada y su cobro o saldo pendiente. | Ventas y despachos |
| HU04 | Como mayorista, quiero consultar las cuentas por pagar y por cobrar con sus vencimientos, abonos y saldos, para priorizar los pagos y el seguimiento de las cobranzas. | Cuentas y caja |
| HU05 | Como mayorista o encargado con reemplazo autorizado, quiero registrar pesajes, compras y ventas cuando no haya conexión a Internet, para continuar las operaciones y sincronizarlas sin duplicaciones al recuperar la conexión. | Transversal: sincronización |
| HU06 | Como mayorista, quiero consultar tendencias y patrones del historial comercial y estimaciones semanales de precios cuando exista información suficiente, para apoyar mis decisiones de compra y venta de papa. | Reportes y analítica |
| HU07 | Como mayorista o encargado, quiero iniciar y cerrar sesión con mis credenciales individuales, para proteger la información del negocio y acceder a las funciones autorizadas. | Identidad y acceso |
| HU08 | Como mayorista, quiero registrar pagos a proveedores y cobros a compradores, para mantener actualizados los abonos y saldos pendientes. | Cuentas y caja |
| HU09 | Como mayorista, quiero registrar y liquidar los costos de flete y de estiba por grupo de trabajadores, para controlar los gastos de transporte, carga y descarga de papa. | Costos logísticos |
| HU10 | Como mayorista, quiero generar comprobantes internos de compras, ventas y devoluciones, para entregar una constancia de las operaciones realizadas. | Documentos |
| HU11 | Como mayorista, quiero buscar y consultar el historial de compras, pesajes, ventas y despachos por fecha o participante comercial, para localizar rápidamente una operación. | Reportes y analítica |
| HU12 | Como mayorista, quiero autorizar y revocar el reemplazo temporal de un encargado, para mantener la continuidad del negocio con acceso controlado. | Identidad y acceso |
| HU13 | Como mayorista, quiero consultar quién registró, corrigió o anuló una operación y su motivo, para conocer la responsabilidad de cada cambio. | Transversal: auditoría |
| HU14 | Como mayorista, quiero recibir avisos de pagos y cobranzas próximos a vencer, para atender oportunamente los compromisos del negocio. | Cuentas y caja |
| HU15 | Como mayorista, quiero compartir archivos PDF, documentos Word e imágenes con un comprador o proveedor por WhatsApp o correo mediante confirmación manual, para comunicar documentos relacionados con el negocio. | Mensajería |
| HU16 | Como mayorista, quiero generar el estado de cuenta de un comprador con lo que debe, sus abonos y vencimientos, y enviárselo por WhatsApp, para que conozca su saldo pendiente. | Documentos y Mensajería |

## Notas de alcance

- HU01 y HU03 incorporan calidad y procedencia por saco y por línea de venta (decisión CL-13). Se admite la opción «No informada».
- HU09 agrupa flete y estiba en el módulo de Costos logísticos; ambos se liquidan con una salida de caja.
- HU10 genera los documentos; HU15 y HU16 los envían. El envío es manual: la aplicación abre WhatsApp o correo con el archivo listo y el Mayorista confirma el contacto. No se envían mensajes automáticos.
- HU16 se incorpora el 29 de octubre de 2026 y continúa la numeración sin renumerar historias anteriores.

Los requisitos y criterios de aceptación de cada historia están en [requisitos funcionales](03-requisitos-funcionales.md).
