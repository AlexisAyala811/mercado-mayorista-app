# Comprobantes por sesión y recuperación — 12 de octubre de 2026

Cada token monta un espacio de comprobantes propio. Una descarga tardía de un espacio desmontado no abre vista previa y libera su URL blob web. La compartición vuelve a comprobar pertenencia a la sesión después de descargar y después de comprobar disponibilidad del sistema; no presenta el panel si la sesión terminó. No amplía permisos ni impide retroactivamente una compartición que ya fue entregada al sistema.

Errores de historial y de documento se presentan por separado. El historial fallido no se muestra como una colección vacía. Reintentar documento repite tipo/ID/acción originales, sin volver a cargar las listas. Pulsaciones repetidas comparten un guard de operación. Cerrar/reemplazar/desmontar vista previa libera las URL web creadas por ella. Se conservan los archivos temporales nativos existentes, que usan nombres compartidos con otros recorridos; no se borran archivos en uso de forma indiscriminada.

Las filas de comprobantes se colocan en columna en teléfono. La vista previa web ofrece Descargar PDF y una explicación para navegadores donde el PDF embebido aparece vacío; encabezado ajusta su texto al ancho disponible.

## Verificación

- Tipos, lint y seis pruebas de comprobantes en tres suites correctos.
- Pantalla: error de historial/reintento, error de documento/reintento de la misma acción, descarga tardía de otra sesión con liberación y doble pulsación que inicia una descarga.
- Servicio: sesión terminada antes de finalizar descarga y sesión terminada durante disponibilidad de compartición; ambos impiden abrir el panel del sistema. Ensayos con transporte/archivos/plataforma simulados, sin transmisión.
- Navegador real conectado a API/base UI: lista dos compras vigentes y ventas vigentes/anuladas; las anuladas tienen vista previa/compartición deshabilitadas. Compra de 2026-10-05 por S/255 abrió el diálogo autorizado; iframe quedó vacío en el navegador integrado. Después del cambio, el árbol accesible confirmó enlace Descargar PDF y explicación.
- El evento de descarga agotó su timeout y terminó reiniciando el kernel de navegador. No se obtuvo ruta de archivo ni se pudo renderizar/verificar ese PDF descargado. No se interpreta el enlace visible como descarga exitosa. Tras recuperar el navegador, se observó login por sesión vencida con campos vacíos y sin vista previa antigua.

## Pendientes

Descarga web positiva y lectura del archivo generado, estado/error de visor web, vista previa/compartición Android de venta/despacho, historial de más de cien operaciones y convergencia Figma. El historial aún consulta primera página de ventas/recepciones y detalles de recepciones liquidadas; este corte no acredita historial completo ni resuelve paginación. T612/T613 y HU10 permanecen abiertos.
