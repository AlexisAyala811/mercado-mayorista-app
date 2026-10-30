# Revisión visual de arquitectura inicial

El usuario solicita más color y adaptar la estructura por capas del ejemplo a Mercado el 8 de octubre de 2026. Se actualizan arquitectura-inicial.md y su PNG/SVG en el repositorio académico.

Se distinguen actores índigo, presentación/entrada API azul, negocio verde, datos ámbar e interacción externa violeta. La lógica comercial es un monolito modular; Android y API son aplicaciones separadas. La cola cifrada se relaciona con Android y la compartición PDF sale del cliente. PostgreSQL conserva operaciones, finanzas, auditoría y PDF, según evidencia de persistencia revisada en la tarea de contenedores.

La revisión mantiene HU01–HU14, permisos por negocio y alcance sin inventario. No incorpora ERP, pasarela, courier o balanzas del ejemplo. La analítica y el canal externo de avisos conservan sus condiciones reales de avance. No se vuelven a añadir diagramas Mermaid.

Verificación: revisión visual de capas, textos y conectores, integridad PNG, XML SVG, vínculos y diff. El cambio es documental y visual, sin modificación de contratos, datos o código operativo.
