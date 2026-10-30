# Organización documental de módulos — 13 de octubre de 2026

## Decisión y alcance

El usuario solicita retirar Catálogos y logística e Inventario como módulos en toda la documentación, diagramas y PPT. Confirma explícitamente que esta intervención no reorganiza el código de la aplicación.

## Especificación

Se conservan RF03–RF05 y los datos necesarios para HU01–HU03. Recepción conserva proveedor, variedades, vehículo y conductor del cargamento. Compras reutiliza sus datos para la liquidación. Ventas conserva comprador, variedades, destino y transporte del despacho. Estos datos no constituyen módulos independientes ni saldos de almacén.

No se elimina información persistente, entidades, migraciones o rutas. El código puede conservar estructuras históricas que deberán evaluarse en otra intervención técnica. La documentación no las presenta como módulos objetivo.

## Plan, tareas y verificación

- Actualizar tablas, límites, requisitos y referencias académicas del entregable.
- Regenerar arquitectura inicial, componentes C4 y estilo en capas sin los módulos retirados.
- Actualizar build_propuesta.py y la propuesta Word generada.
- Conservar PPT de 10 diapositivas y exposición de 12 minutos.
- Verificar PNG, SVG, enlaces, tablas y presentaciones.

La decisión sustituye la organización documental anterior. Los registros SDD históricos no son instrucciones vigentes y conservan su fecha para trazabilidad. No implica eliminación de requisitos comerciales ni ampliación de permisos.

Cambios locales. Publicación y commit no solicitados en esta intervención.
