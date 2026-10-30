# Revisión del estilo arquitectónico

El 8 de octubre de 2026 el usuario solicita adaptar la vista del estilo monolítico en capas a Mercado. Se actualizan estilo-arquitectonico.md y sus PNG/SVG en el repositorio académico.

Se mantiene la decisión aprobada: cliente Android separado, API NestJS con módulos en un despliegue y PostgreSQL central. Las bandas representan presentación HTTP, negocio/aplicación y datos. Los grupos gráficos resumen responsabilidades existentes, no crean módulos ni afirman repositorios de dominio independientes. La colaboración entre compra y cuenta/caja conserva atomicidad y se muestra como llamada lógica, no red entre microservicios.

La documentación reconoce el uso actual de DataSource y entidades compartidas. No afirma aislamiento exclusivo por tablas, JWT ni un puerto completo por módulo. PDF se conserva en el backend y se comparte desde Android por elección del usuario. Sin inventario, ERP, pasarela de pagos o courier incorporados desde el ejemplo.

La revisión es documental; no modifica contratos, migraciones, datos ni código operativo. Se verifica composición de imagen, capas, conexiones, SVG, PNG, enlaces y diff. El enfoque interno de arquitectura limpia continúa como objetivo de separación distinto de la unidad de despliegue del backend.
