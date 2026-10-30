# Revisión del nivel C4 de contenedores

El 8 de octubre de 2026 se adapta el nivel 2 a la referencia visual del usuario: actores, límite de Mercado, aplicación Android, API NestJS y PostgreSQL. La cola cifrada permanece asociada al dispositivo. La compartición PDF parte de Android y del usuario, no de una integración de mensajería supuesta.

Se inspeccionan receipt-document.entity.ts y receipts.service.ts: contenido PDF persistido en PostgreSQL como bytea, con hash, versión, estado y metadatos. No corresponde representar un contenedor independiente de archivos como implementación constatada. Las otras vistas pueden mostrar la conservación de PDF como responsabilidad lógica, sin atribuir un servidor o proveedor contratado.

Se actualizan Nivel2-DiagramadeContenedores.md y nivel2-contenedores en PNG/SVG. No se añaden Redis, broker, ERP, pagos externos, courier ni inventario. La base central conserva saldos financieros y cantidades/pesos por operación. Las rutas de descarga son autorizadas y la tablet no usa SQL.

Verificación: evidencia de persistencia PDF en código, legibilidad, integridad PNG, XML SVG, referencias y diff. No se modifican contratos, código operativo o datos por esta revisión documental, ni se reintroducen bloques Mermaid.
