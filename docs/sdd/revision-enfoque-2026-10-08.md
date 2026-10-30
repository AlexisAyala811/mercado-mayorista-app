# Revisión del enfoque arquitectónico

El usuario solicita adaptar el enfoque del ejemplo visual a Mercado el 8 de octubre de 2026. La vista académica del cliente Android organiza presentación, coordinación de aplicación, dominio, infraestructura y composición.

Las responsabilidades se apoyan en los archivos actuales de domain, features, services y src/app/_layout.tsx. Los puertos y casos de uso separados son una dirección de diseño; no se afirman interfaces completas ni nuevas clases implementadas. En servidor se conserva el monolito modular y su persistencia transaccional; el cálculo central confirmado y la autorización por negocio siguen siendo autoridad final.

Se actualizan enfoque-aquitectonico.md, su PNG y SVG en mercado-mayorista-app. No se vuelve a introducir Mermaid ni inventario. La extracción de casos de uso/puertos requiere tareas y validación de imports, contratos, precisión, permisos, reintentos y recuperación antes de implementarse. Este cambio de presentación documental no acredita esa convergencia técnica.
