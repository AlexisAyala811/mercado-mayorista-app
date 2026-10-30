# Cambio aprobado: registro comercial sin inventario

Fecha: 7 de octubre de 2026. Responsable: decisión explícita del usuario en la tarea documental.

La aplicación registra recepción, pesaje, compras, ventas y despachos sin calcular existencias restantes, descontar stock ni bloquear una venta por disponibilidad. El peso y cantidad se conservan por operación; no son saldos de almacén. Continúan cuentas por pagar/cobrar, caja, flete, estiba, auditoría, offline y comprobantes.

RF08/RF09 se retiran, sin reutilizar códigos. RF06B no crea existencias. RF16/RF17/RF23 no incluyen stock. La antigua HU de consultar existencias queda retirada y su identificador reservado; no renumerar silenciosamente historias compartidas. Los aspectos de CL-07/CL-11 de disponibilidad/valoración por lote se sustituyen; precisión e idempotencia continúan. Los márgenes por lote no se trasladan a un supuesto margen comercial: se requiere aclaración de una fórmula nueva antes de implementarla.

Prioridad documental: este cambio aprobado prevalece sobre las referencias anteriores de build_propuesta.py, el DOCX y los planes del corte 003 en lo que concierne a existencias. Esos artefactos históricos no acreditan el nuevo alcance hasta su reconciliación. El primer entregable académico se actualiza en mercado-mayorista-app. No ejecutar el generador antiguo para reemplazar la propuesta sin aplicar primero esta decisión.

Tareas de convergencia: actualizar fuente académica/DOCX y contratos; retirar pantallas y acciones de existencias en Figma/app; adaptar transacciones y reportes API; validar compras y ventas independientes y pagos idempotentes; conservar datos, migraciones e historia financiera. La implementación anterior contiene inventario: no declarar cierre técnico ni borrar datos por este cambio de alcance.

Validación documental: revisar requisitos, actores, arquitectura, diseño, C4, imágenes y fuentes SVG; mantener la estructura de 19 documentos y README del primer entregable. Validación funcional posterior: ninguna venta descuenta stock o falla por stock insuficiente; compras/ventas conservan cantidades y dinero; reintentos no duplican registros ni pagos.
