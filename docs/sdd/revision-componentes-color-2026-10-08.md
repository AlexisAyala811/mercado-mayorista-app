# Revisión cromática del nivel C4 de componentes

El 8 de octubre de 2026 el usuario pide adaptar el nivel 3 al ejemplo de componentes y aumentar color. La imagen destaca Android fuera de la API, entrada REST, límite del monolito, doce responsabilidades comerciales y PostgreSQL central. Se separan por color acceso, catálogos, operaciones, finanzas, consultas y auditoría.

La persistencia PDF queda en PostgreSQL según evidencia de ReceiptDocumentEntity. La interacción externa parte de Android y comparte archivo por decisión del Mayorista. No se muestra almacén de PDF independiente, Redis, ERP, pagos externos, courier ni inventario. Avisos HU14 se apoyan en cuentas; canal externo pendiente.

Se actualizan Nivel3-Diagrama-de-Componentes.md, nivel3-componentes PNG/SVG y la lectura de componentes-arquitectonicos.md. Las flechas describen colaboración comercial, sin afirmar aislamiento de tablas o APIs públicas por módulo ya implementadas. Historial y agrupaciones son responsabilidades lógicas, no nuevos módulos o despliegues.

Verificación: revisión visual y ajuste de conectores, etiquetas y leyenda; validación XML SVG, integridad PNG, enlaces y diff. No se modifica código operativo, contratos, datos o migraciones ni se reintroduce Mermaid.
