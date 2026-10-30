# Revisión de la vista de componentes

Fecha: 8 de octubre de 2026. Solicitud: adaptar la estructura visual de un ejemplo de componentes al proyecto Mercado.

El primer entregable muestra Mayorista y Encargado, aplicación Android y almacenamiento local, el límite de la API NestJS, responsabilidades comerciales y PostgreSQL central. La compartición externa de PDF parte del cliente Android; la persistencia del comprobante corresponde al backend. Catálogos y logística no representan existencias. La cola offline es del cliente, no un servicio central.

La revisión cambia la vista documental PNG/SVG y los documentos de componentes y C4 nivel 3 en el repositorio académico. No introduce infraestructura, contratos ni cambios funcionales al código. Los módulos actuales todavía contienen dependencias entre entidades de dominios distintos: las flechas comerciales representan colaboración lógica, sin afirmar aislamiento por tablas o APIs de módulo completas.

HU01–HU14 conservan su alcance. Avisos de vencimiento HU14 tienen canal externo por definir; no hay proveedor supuesto. No se incorporan Redis, JWT, ERP, pasarela de pago, courier ni control de inventario a partir del ejemplo.

Verificación: lectura del AppModule como evidencia de módulos, revisión visual de conexiones y textos, validación XML del SVG, integridad del PNG, referencias de documentación y comprobación del diff. La adaptación funcional al alcance sin existencias sigue su propio flujo de convergencia y no queda certificada por esta imagen.
