# User original en la cabecera de Compra

La cabecera compartida de pesaje/liquidación omite la instancia User de COMPRA 1:346. Contexto Figma actual y metadatos: User 1:352, componente 1:12, posición (48,20), instancia 54×54; vector 36×40.5 en (9,6.75), SVG intrínseco 40×44.5 con expansión de trazo. Fuente sin URLs temporales en `docs/sdd/contexto-user-compra-2026-10-16.md`.

El snippet conectado no proporciona una importación utilizable y el repositorio no contiene ese componente de biblioteca. Reutilizar `OriginalUserIcon`, extendiéndolo con la exportación original de COMPRA: 563 bytes, SHA256 E4BEF75791985A8D2AC883E60EBBE42460968B6180486DE93A56507328864B44. No asumir igualdad de bytes con MENU/Carros ni sustituir el SVG por un dibujo o captura.

En la cabecera existente, el contenido tiene inset horizontal 32 y superior 9 en el marco amplio; la instancia se sitúa en (16,11) de su banda, reproduciendo (48,20). Mantener dimensiones originales y decoración excluida de accesibilidad. Conservar nombre de usuario dinámico, proveedor/celular/fecha, etapa y banner operativo; no agregar acción, menú ni cambiar cálculos o cierres.

Este corte verifica únicamente la instancia User y sus llamadas compartidas. Diferencias previas de paneles, campos, densidad y geometría global se mantienen registradas en T217–T219; no se anuncian resueltas por añadir un icono. Verificar archivos/huellas, tipos/lint/regresiones, paquete y render real. La captura Figma es referencia, nunca un activo de la interfaz.
