# Actores y permisos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.2

| Actor | Necesidad principal | Responsabilidades en el sistema |
| --- | --- | --- |
| Mayorista | Gestionar y supervisar integralmente el negocio | Tiene acceso completo a todas las secciones y acciones: recepción y pesaje, compras, ventas, cuentas, caja, reportes, tendencias, patrones, pronósticos, configuración y administración de usuarios. |
| Encargado | Reemplazar operativamente al mayorista cuando esté ausente | Durante la ausencia del mayorista solo puede registrar el pesaje saco por saco e ingresar datos de compras y ventas. No accede a cuentas, caja, reportes, IA, configuración ni administración; el sistema aplica automáticamente los cálculos y efectos autorizados. |

## Contexto de interacción

El negocio compra cargamentos de papa, pesa saco por saco durante la descarga, negocia precios y liquida obligaciones con proveedores. Luego vende y despacha a compradores, conserva el historial y registra cobros, pagos y costos.

| Participante comercial | Relación con el proceso | Acceso a la aplicación |
| --- | --- | --- |
| Proveedor | Entrega cargamentos y recibe la liquidación o saldo | No se define cuenta de acceso |
| Comprador | Recibe la venta y mantiene compromisos de pago | No se define cuenta de acceso |
| Transportista/conductor | Traslada mercadería y participa en el acuerdo de flete | No se define cuenta de acceso |
| Grupo de estibadores | Realiza carga/descarga y recibe liquidación | No se define cuenta de acceso |

## Matriz de autorización

| Acción | Mayorista | Encargado |
| --- | --- | --- |
| Iniciar/cerrar su sesión | Sí | Sí |
| Registrar pesaje, compra y venta | Sí | Solo con reemplazo autorizado, vigente y no revocado |
| Consultar cuentas, caja y reportes | Sí | No |
| Administrar usuarios y reemplazos | Sí | No |
| Consultar auditoría y configurar el negocio | Sí | No |
| Consultar predicciones | Según disponibilidad aprobada del módulo | No |

El reemplazo dura como máximo 24 horas. El backend revalida permisos y negocio en cada operación central, incluso al sincronizar órdenes capturadas offline. Los efectos automáticos de una compra o venta no conceden acceso al Encargado a los módulos afectados.

## Permisos de las historias ampliadas

HU07 admite acceso y cierre para ambos actores; iniciar sesión no concede permiso de reemplazo. HU08–HU14 corresponden al Mayorista: abonos, estiba, comprobantes, búsqueda, reemplazos, auditoría y avisos. No amplían los permisos comerciales del Encargado. Los efectos automáticos de HU01–HU03 conservan la autorización vigente.
