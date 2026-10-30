# Atributos de calidad

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

| Código y atributo | Escenario y medida |
| --- | --- |
| AC01 Rendimiento | Durante la descarga, guardar cada peso localmente en menos de 1 segundo; responder el 95 % de las consultas centrales en menos de 3 segundos con 20 usuarios concurrentes en el piloto. |
| AC02 Disponibilidad | Ante una interrupción de Internet de 2 horas, seguir registrando pesos en la tablet. Objetivo del servicio central: 99,5 % mensual, medido por monitoreo. |
| AC03 Integridad | Al reintentar una operación cinco veces, conservar un único registro confirmado y un único efecto sobre registros comerciales y saldos de dinero. Reutilizar el identificador de una operación con datos distintos se rechaza. |
| AC04 Seguridad | Una consulta sobre datos de otro negocio no devuelve información y se registra el intento. El aislamiento se verifica en todos los endpoints protegidos. |
| AC05 Usabilidad | Tras una capacitación breve, al menos el 90 % de los usuarios piloto registra y cierra un cargamento sin asistencia ni pérdida de pesos. |
| AC06 Escalabilidad | Al pasar de 20 a 40 usuarios concurrentes, añadir una instancia del backend y mantener el objetivo de AC01. |
| AC07 Mantenibilidad | Un cambio en la regla de estiba se resuelve en Costos logísticos sin modificar el pesaje ni las reglas de cuentas, y se verifica con pruebas de regresión. |
| AC08 Recuperación | Ante la pérdida de la base central, restaurar con RPO de 24 horas y RTO de 4 horas, validado mediante simulacro. Los pesos aún no sincronizados dependen del almacenamiento de la tablet. |

## Priorización

Integridad, seguridad y continuidad condicionan todos los módulos: una venta no puede duplicar un despacho o un cobro, una compra no puede generar dos saldos y una sesión no puede leer otro negocio. Rendimiento y usabilidad se evalúan durante la descarga; recuperación y escalabilidad, en el despliegue central.

Los valores son criterios de aceptación. Su descomposición en fuente, estímulo, entorno, respuesta y medida, junto con el estado de su evidencia, está en [escenarios de calidad](08-escenarios-atributos-calidad.md).
