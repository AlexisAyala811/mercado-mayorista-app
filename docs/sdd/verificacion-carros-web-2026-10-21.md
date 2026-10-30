# Carros: revisión web y corrección de paneles compactos

Se consume la especificación 004, `carros-visual-plan.md` y la decisión aprobada de teléfono/placa separados. La consulta nueva de Figma 18:459 alcanzó el límite Starter; se revisaron los contextos y activos conservados, sin afirmar comparación actual de píxeles.

En QA autenticado, la pantalla a 360 × 800 mostró el panel de contacto colapsado: teléfono y placa salían de su fondo y se superponían con Editar/Desactivar. `flex: 0` heredaba base cero en la columna. Se conserva el modo compacto y se explicita `flexBasis: auto` y `flexShrink: 0` en los dos paneles. El contenido determina su altura; no se alteran las dimensiones de imágenes, datos ni reglas comerciales.

## Resultado comprobado

- 34 pruebas/5 suites de logística, TypeScript y lint aprobados; `tmp/carros-compact-web-check-20261021.log`.
- Paquete `web-export-carros-compact-web-20261021`: exportación correcta y recursos PDF.js verificados. Activación con respaldo y 280 archivos cotejados en `tmp/carros-compact-web-activation-20261021.json`.
- Recarga real del paquete; panel compacto contiene teléfono, placa y ambas acciones. Antes: `tmp/carros-phone-before-20261021.png`; después: `tmp/carros-phone-after-20261021.png` y `tmp/carros-phone-verified-20261021.png`.
- Colección QA muestra Transportista QA y vehículo QA1-234, con teléfono/placa separados. Búsqueda `qa1-234` encuentra el registro; búsqueda inexistente muestra cero coincidencias; limpiar recupera la fila.
- Editar el transportista correcto, cambiar su nombre en el borrador y buscar mantiene la edición. Nuevo registro muestra aviso de descarte de ambos formularios; Cancelar conserva `Transportista QA borrador`. Se cerró después esa edición sin guardarla. No se pulsaron Guardar, Registrar ni Desactivar.
- Medidas de todos los controles de la pantalla a 360: altos de al menos 44 px y documento/viewport de 360, sin desbordamiento horizontal; `tmp/carros-phone-dom-20261021.json`. Revisión ancha realizada también a 1440 × 1024. Tamaño del navegador restaurado.

## Alcance pendiente

La corrección y los recorridos web no cierran Android, teclado de software, TalkBack, todas las escalas de texto ni la comparación actual de Figma. La paginación amplia sigue respaldada por pruebas de componente/proyección y evidencia previa; este negocio QA tenía una fila. Los gates 004 y la meta global siguen abiertos.
