# Preparación del plan técnico

## Estado actual

Las especificaciones 001 a 006 están aprobadas para implementación después de la aprobación del paquete de decisiones del backend. La especificación 007 de analítica predictiva continúa condicionada por CL-08.

## Cobertura de planificación preparada

| Corte | Plan y tareas | Condición de inicio de implementación |
|---|---|---|
| 001 Acceso | Aprobado | Implementación secuencial habilitada. |
| 002 Recepción y compras | Aprobado | Implementación secuencial habilitada. |
| 003 Ventas e inventario | Aprobado | Implementación secuencial habilitada. |
| 004 Cuentas y caja | Aprobado | Implementación secuencial habilitada. |
| 005 Offline y auditoría | Aprobado | Implementación secuencial habilitada. |
| 006 Reportes y comprobantes | Aprobado | Implementación secuencial habilitada. |
| 007 Analítica e IA | Preparado | CL-08, permisos y método de evaluación. |

La preparación no equivale a aprobación de arquitectura ni a implementación. La tarea técnica debe actualizar esta tabla al cerrar cada decisión y antes de iniciar su corte vertical correspondiente.

## Bloqueadores de planificación

| Aclaración | Impacto |
|---|---|
| CL-03 | Resuelta: Expo, React Native, TypeScript estricto y Expo Router. |
| CL-04 | Resuelta mediante el paquete de decisiones aprobado. |
| CL-05 | Resuelta: reemplazo revocable de máximo 24 horas. |
| CL-06 | Resuelta: pendientes cifrados, bloqueados y recuperables por la misma identidad. |
| CL-07 | Resuelta: precisión, redondeo, estados y correcciones compensatorias aprobadas. |
| CL-08 | Condiciones de habilitación y evaluación de estimaciones. |
| CL-09 | Resuelta: dispositivos, continuidad y volumen de prueba definidos. |
| CL-10 | Resuelta: aislamiento, consulta y retención mínima de 5 años. |

## Orden de planificación al aprobar las decisiones

1. Plataforma móvil, navegación, sistema de diseño y estructura de módulos.
2. Identidad, sesión, autorización por rol y negocio.
3. Dominio de recepción, pesaje, lotes, inventario y cálculos de compra.
4. Dominio de ventas, despachos, cuentas, caja, flete y estiba.
5. Persistencia local, sincronización, idempotencia, auditoría y recuperación.
6. Reportes, comprobantes, alertas y compartición.
7. Analítica progresiva, aislamiento y evaluación de estimaciones.
8. Pruebas en tablet, rendimiento, seguridad y convergencia con Figma.

## Línea base ejecutada

La plataforma, la estructura modular, la verificación local y los primeros componentes del sistema de diseño ya están preparados como infraestructura transversal. Su evidencia se mantiene en [implementation-baseline.md](implementation-baseline.md). Este avance no elimina las condiciones de inicio de los cortes funcionales indicadas en la tabla anterior.
