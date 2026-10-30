# Actores y permisos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Usuarios del sistema

| Actor | Necesidad principal | Responsabilidades en el sistema |
| --- | --- | --- |
| Mayorista | Gestionar y supervisar todo el negocio | Acceso completo: recepción y pesaje, compras, ventas, cuentas, caja, costos logísticos, documentos, mensajería, reportes, analítica, auditoría y administración de Encargados. |
| Encargado | Mantener la operación cuando el Mayorista está ausente | Con credenciales propias y un reemplazo vigente, registra pesajes, compras y ventas. No accede a cuentas, caja, documentos, mensajería, reportes, analítica ni administración. Los efectos automáticos de sus operaciones (deuda, caja, flete) se aplican sin darle acceso a esos módulos. |

## Participantes comerciales

El negocio compra cargamentos de papa, pesa saco por saco durante la descarga, liquida al proveedor, vende y despacha a compradores de otros departamentos, y registra cobros, pagos y costos. Los participantes comerciales se registran como datos de cada operación; ninguno tiene cuenta de acceso.

| Participante | Relación con el proceso | Interacción con el sistema |
| --- | --- | --- |
| Proveedor | Entrega cargamentos y recibe su liquidación o saldo | Puede recibir comprobantes por WhatsApp o correo |
| Comprador | Recibe la venta y mantiene compromisos de pago | Puede recibir comprobantes y su estado de cuenta por WhatsApp o correo |
| Transportista / conductor | Traslada la mercadería; participa en el acuerdo de flete | Solo como dato de la operación |
| Grupo de estibadores | Carga y descarga; recibe su liquidación | Solo como dato de la operación |

## Matriz de autorización

| Acción | Mayorista | Encargado |
| --- | --- | --- |
| Iniciar y cerrar su sesión | Sí | Sí |
| Registrar pesaje, compra y venta | Sí | Solo con reemplazo autorizado, vigente y no revocado |
| Seleccionar proveedores, compradores, variedades, calidades y procedencias existentes | Sí | Solo durante el reemplazo |
| Crear, editar o desactivar esas referencias | Sí | No |
| Anular compras y ventas; registrar devoluciones comerciales | Sí | No |
| Consultar cuentas y caja; registrar pagos y cobros | Sí | No |
| Registrar y liquidar flete y estiba | Sí | No |
| Generar comprobantes y estados de cuenta | Sí | No |
| Enviar documentos por WhatsApp o correo | Sí | No |
| Consultar reportes, historial, analítica y auditoría | Sí | No |
| Administrar Encargados y reemplazos | Sí | No |

El reemplazo dura como máximo 24 horas y el Mayorista puede revocarlo en cualquier momento. La API revalida sesión, rol, negocio y reemplazo en cada operación, incluidas las órdenes capturadas sin conexión que se sincronizan después. Iniciar sesión no concede por sí mismo permisos comerciales al Encargado.

## Relación con las historias

HU07 aplica a ambos actores. HU01–HU03 y HU05 aplican al Encargado solo durante un reemplazo vigente. HU04, HU06 y HU08–HU16 corresponden únicamente al Mayorista. Ver [historias de usuario](02-historias-del-usuario.md).
