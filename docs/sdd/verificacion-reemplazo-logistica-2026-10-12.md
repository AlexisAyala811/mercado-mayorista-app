# Reemplazo de edición de logística — 12 de octubre de 2026

Seleccionar un transportista o vehículo distinto desde un formulario modificado requiere confirmar el reemplazo. Cancelar conserva sus campos; confirmar abre el registro elegido y mantiene el otro formulario. Seleccionar el mismo registro ya modificado conserva la edición sin sobrescribirla. El diálogo bloquea campos y otras acciones; no envía escrituras a la API.

## Evidencia

- Caso nuevo de componente: dos transportistas, modificación, elección del mismo registro, cancelación del reemplazo, confirmación del otro y conservación del borrador independiente de vehículo; sin creación/actualización.
- Suite frontend completa: 401 pruebas en 59 suites aprobadas. El primer ensayo nuevo falló por un selector del mock que encontraba componente y control duplicados; se corrigió el selector y sus tipos, y se repitió la suite completa con éxito.
- Recorrido web real 360×800 contra API/base UI: borradores nuevos en Nombre y Placa; editar Transportista QA solicita confirmación; cancelar preserva ambos. Confirmar carga Transportista QA y conserva QA-BORRADOR. Editar luego el vehículo solicita su propia confirmación y conserva el nombre modificado del transportista al abrir QA1-234. No se guardó ningún catálogo. Salida con descarte y cierre de sesión comprobados; login final vacío.
- El recorrido reveló texto de filas comprimido por los botones en teléfono. Se corrigieron filas en columna por debajo de 760 px, con texto al ancho disponible y acciones debajo. Captura posterior inspeccionada, nombres completos y controles dentro del ancho. Este ajuste visual posterior a la suite general pasó tipos y lint finales; no se añadieron pruebas que repliquen estilos.
- Captura final: `tmp/logistics-replacement-phone-2026-10-12.png`.

## Pendientes

La consulta de la sesión Android existente sigue mostrando «System UI isn't responding», sin reiniciar el dispositivo ni atribuirlo al frontend. Atrás nativo sigue sin verificar. Composición Figma de Carros, User conectado y significado de N° continúan pendientes. La suite completa no acredita esos criterios ni cierra la meta global.
