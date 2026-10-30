# Consolidación de tablas diagramas y requisitos

Fecha: 13 de octubre de 2026.

Se aplica el feedback solicitado manteniendo los actores, las 14 historias, el retiro de existencias y los datos comerciales integrados en las operaciones.

## Resultado documental

- Una lista de diez responsabilidades backend para componentes, diseño interno, arquitectura inicial, C4 nivel 3 y propuesta Word.
- Cola y sincronización en Android. Avisos de vencimiento en Cuentas y caja. Analítica separada de avisos.
- RF03 y RF04 conservan campos aprobados, dentro de las operaciones. RF17 incorpora cantidades, pesos e importes. RF23 usa operaciones pendientes sin introducir una entidad de pedido.
- Comprobantes vinculados a HU10/RF12; reportes a RF17.
- Criterios CL-08 visibles en decisiones y restricciones.
- Ejemplos financieros y comportamiento de revisión ante rechazo offline. No se crea una política de reembolso automático.
- Arquitectura inicial como vista general de aplicaciones/capas/datos. C4 nivel 3 como apertura de API con colaboraciones internas.
- Metadatos, términos y referencias a evidencia aclarados.
- Propuesta Word y PPT de diez diapositivas sincronizados con el entregable.

## Verificación

Enlaces locales, PNG y XML de SVG revisados. Se contrasta RF03/RF04/RF17/RF23 con build_propuesta.py. Los diagramas inicial y nivel 3 son distintos y los nombres corresponden a las tablas. PPT validado con diez diapositivas y notas para doce minutos. Páginas modificadas del Word renderizadas y revisadas.

Esta revisión no certifica pruebas de la aplicación, infraestructura productiva ni precisión predictiva. Los registros anteriores de feedback conservan la fecha y las observaciones previas para trazabilidad.
