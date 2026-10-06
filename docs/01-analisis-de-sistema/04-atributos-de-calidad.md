# Atributos de calidad

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.1

Contenido derivado de `build_propuesta.py`, conservando los identificadores de la propuesta vigente. Las reglas detalladas se mantienen en las especificaciones aprobadas del proyecto documental compartido.

| Código y atributo | Escenario y medida propuesta |
| --- | --- |
| AC01 Rendimiento | Durante la descarga, guardar cada peso localmente en menos de 1 segundo; consultas centrales en menos de 3 segundos para el 95 % de solicitudes con 20 usuarios concurrentes en el piloto. |
| AC02 Disponibilidad | Ante una interrupción de Internet de 2 horas, continuar registrando pesos localmente. Objetivo del servicio central: 99,5 % mensual, medido por monitoreo. |
| AC03 Integridad | Al reintentar una operación cinco veces, conservar un único registro confirmado y un único efecto sobre inventario y saldos. |
| AC04 Seguridad | Ante una consulta de otro negocio, denegar el acceso y registrar el intento. Verificar el aislamiento en todos los endpoints protegidos. |
| AC05 Usabilidad | Después de una capacitación breve, al menos el 90 % de usuarios piloto registra y cierra un cargamento sin asistencia ni pérdida de pesos. |
| AC06 Escalabilidad | Al duplicar de 20 a 40 usuarios concurrentes, permitir añadir una instancia del backend y conservar el objetivo de respuesta de AC01. |
| AC07 Mantenibilidad | Al cambiar una regla de estiba, modificar el módulo de costos sin cambiar la interfaz de pesaje ni las reglas de cuentas; verificar pruebas de regresión. |
| AC08 Recuperación | Ante pérdida de la base central, restaurar con objetivo RPO de 24 horas y RTO de 4 horas, validado mediante simulacro. Los pesos aún no sincronizados dependen del almacenamiento de la tablet. |

## Priorización para la arquitectura

Integridad, seguridad y continuidad condicionan cada corte: una venta no puede duplicar un descuento de stock, una compra no puede generar dos saldos y una sesión no puede leer otro negocio. Rendimiento y usabilidad se evalúan durante la descarga; recuperación y escalabilidad se validan en el despliegue central.

Los objetivos son criterios de aceptación, no resultados medidos de esta entrega. La descomposición en fuente, estímulo, entorno, respuesta, medida y verificación está en [escenarios de calidad](08-escenarios-atributos-calidad.md).
