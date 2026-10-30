# Historias de usuario

| ID | Historia de usuario |
| --- | --- |
| HU01 | Como mayorista o encargado con reemplazo autorizado, quiero registrar el proveedor, las variedades y el peso de cada saco durante la descarga, para conocer la cantidad y el peso total del cargamento de papa. |
| HU02 | Como mayorista o encargado con reemplazo autorizado, quiero registrar el precio acordado, el flete, los adelantos y la forma de pago de una compra, para conocer el monto líquido por pagar al proveedor y el saldo pendiente. |
| HU03 | Como mayorista o encargado con reemplazo autorizado, quiero registrar ventas y despachos de papa indicando comprador, destino, variedades, sacos y flete, para mantener el registro de la mercadería enviada y su cobro o saldo pendiente. |
| HU04 | Como mayorista, quiero consultar las cuentas por pagar y por cobrar con sus vencimientos, abonos y saldos, para priorizar los pagos y el seguimiento de las cobranzas. |
| HU05 | Como mayorista o encargado con reemplazo autorizado, quiero registrar pesajes, compras y ventas cuando no haya conexión a Internet, para continuar las operaciones y sincronizarlas sin duplicaciones al recuperar la conexión. |
| HU06 | Como mayorista, quiero consultar tendencias y patrones del historial comercial y estimaciones semanales de precios cuando exista información suficiente, para apoyar mis decisiones de compra y venta de papa. |
| HU07 | Como mayorista o encargado, quiero iniciar y cerrar sesión con mis credenciales individuales, para proteger la información del negocio y acceder a las funciones autorizadas. |
| HU08 | Como mayorista, quiero registrar pagos a proveedores y cobros a compradores, para mantener actualizados los abonos y saldos pendientes. |
| HU09 | Como mayorista, quiero registrar y liquidar los costos de estiba por grupo de trabajadores, para controlar los gastos de carga y descarga de papa. |
| HU10 | Como mayorista, quiero generar y compartir comprobantes internos de compras y ventas, para entregar una constancia de las operaciones realizadas. |
| HU11 | Como mayorista, quiero buscar y consultar el historial de compras, pesajes, ventas y despachos por fecha o participante comercial, para localizar rápidamente una operación. |
| HU12 | Como mayorista, quiero autorizar y revocar el reemplazo temporal de un encargado, para mantener la continuidad del negocio con acceso controlado. |
| HU13 | Como mayorista, quiero consultar quién registró, corrigió o anuló una operación y su motivo, para conocer la responsabilidad de cada cambio. |
| HU14 | Como mayorista, quiero recibir avisos de pagos y cobranzas próximos a vencer, para atender oportunamente los compromisos del negocio. |
| HU15 | Como mayorista, quiero compartir archivos PDF, documentos Word e imágenes con un comprador o proveedor por WhatsApp o correo mediante confirmación manual, para comunicar documentos relacionados con el negocio. |

## Trazabilidad de historias y aceptación

| Historia | Requisitos | Criterio de aceptación |
| --- | --- | --- |
| HU01 | RF05, RF06, RF06A, RF06B | Conservar cada saco por variedad y mostrar totales por cargamento; cerrar pesaje sin crear existencias. |
| HU02 | RF07, RF14 | Calcular bruto, flete, adelantos, descuentos y líquido; conservar pago o cuotas y saldo financiero. |
| HU03 | RF10, RF11, RF13, RF15 | Conservar comprador, destino, pesos, sacos y flete; registrar cobro o deuda sin descontar mercadería. |
| HU04 | RF13, RF14 | Mostrar origen, vencimiento, abonos y saldo de cuentas del negocio del Mayorista. |
| HU05 | RF21, RF22 | Conservar órdenes autorizadas y reintentar sin duplicar registros ni efectos financieros; revalidar permisos. |
| HU06 | RF18, RF19, RF20 | Diferenciar tendencias de predicción; esta última requiere CL-08 y datos suficientes antes de habilitarse. |
| HU07 | RF01, RF02 | Autenticar credenciales individuales; mostrar rutas autorizadas y revocar la sesión al salir. |
| HU08 | RF13, RF14, RF15 | Guardar abono con origen y actualizar saldo una sola vez; rechazar importes superiores al saldo. |
| HU09 | RF15 | Conservar grupo, operación y costo; liquidar estiba con origen y registro de caja trazables. |
| HU10 | RF12 | Generar PDF interno de compra o venta confirmada y permitir compartirlo con autorización. |
| HU11 | RF24 | Filtrar por fecha o participante y mostrar el detalle de la operación, sin saldo de mercadería. |
| HU12 | RF02 | Crear reemplazo de máximo 24 horas y revocarlo; servidor revalida su vigencia en cada orden. |
| HU13 | RF22 | Mostrar usuario, fecha, acción y motivo cuando corresponda; impedir cambios de hechos auditados. |
| HU14 | RF16, RF23 | Mostrar aviso vinculado a una cuenta y vencimiento; evitar duplicados. Canal externo pendiente de definir. |

## Control de renumeración aprobado

El usuario adopta la tabla de seis historias comerciales y autoriza HU07–HU14 complementarias el 7 de octubre de 2026. HU01–HU04 mantienen su significado. La antigua HU05 de existencias está retirada: en la tabla nueva HU05 identifica offline (antes HU06); HU06 identifica analítica (antes HU07). HU07 identifica acceso y ya no analítica. Este cambio de versión se registra explícitamente; no trasladar referencias históricas sin revisar significado.

No reutiliza códigos RF08/RF09: continúan retirados. RF24 explicita historial/búsqueda ya contemplados. Las nuevas historias no conceden permisos adicionales al Encargado ni resuelven CL-08/canal externo de notificación.

## Mensajería y notificaciones — 26 de octubre de 2026

Mensajería y notificaciones organiza avisos financieros y compartición manual de archivos. Cuentas y caja conserva la autoridad sobre saldos y vencimientos. El Mayorista puede seleccionar un PDF, DOC/DOCX o imagen y un cliente/comprador o proveedor; después elige WhatsApp o correo y confirma destinatario y envío en la aplicación externa. El canal previsto no fuerza la aplicación final. Compartición solicitada no significa enviado, entregado ni leído. No se añade chat, envío automático, push ni acceso de mensajería al Encargado. La selección y compartición ocurren en Android mediante DocumentPicker y Sharing. La API autoriza, consulta avisos y conserva metadatos en message_share_attempts; no recibe el contenido de los archivos. Un adjunto por intento, hasta 20 MiB. PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. Los comprobantes PDF existentes se reutilizan desde HU10. En web, compartir requiere soporte de archivos del navegador; si falta, se prepara una descarga y no se declara compartición externa. La especificación 008 mantiene contratos, tareas y evidencia. HU15 añade adjuntos genéricos mediante RF25/RF26 sin renumerar historias anteriores.

