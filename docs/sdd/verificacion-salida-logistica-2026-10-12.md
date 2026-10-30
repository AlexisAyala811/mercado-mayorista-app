# Protección de salida de logística — 12 de octubre de 2026

Los formularios se comparan con su registro original o valores nuevos vacíos. Solo los cambios o una mutación pendiente activan la protección de retirada de ruta. Volver solicita confirmación si hay cambios; cancelar conserva transportista y vehículo, y salir descarta el espacio de edición. Las mutaciones pendientes bloquean salida y nueva interacción. Una apertura de edición sin cambios no se considera un borrador modificado. Se reutiliza el patrón de navegación de compra/venta y el diálogo compartido, con etiquetas completas.

Web registra beforeunload mientras corresponde. Esto no acredita bloqueo universal del botón externo del navegador ni recuperación tras terminar el proceso. No se persisten borradores de logística ni se amplían permisos.

## Verificación

- Tipos y lint correctos; 28 pruebas de logística en cuatro suites. Nuevos casos: modificación/Volver/cancelación con datos intactos/descarte explícito y salida directa sin modificaciones.
- Navegador real, frontend y API de pruebas: 360×800, borrador temporal únicamente en Nombre, Volver presenta diálogo y bloquea campos, Cancelar conserva el valor, Salir sin guardar devuelve `/home`. Reabrir Logística muestra Nombre vacío; volver sin cambios no solicita confirmación. Cierre de sesión final con campos vacíos y tamaño del navegador restablecido.
- Captura inspeccionada: `tmp/logistics-exit-phone-2026-10-12.png`. Ambos botones y mensaje completo quedan dentro de pantalla.
- No se guardaron ni desactivaron transportistas/vehículos en el recorrido real.

Pendiente: Atrás del sistema Android, advertencia de recarga/cierre real, reemplazo de una edición por otro registro y convergencia Figma de Carros. Las pruebas de componentes simulan el hook de navegación; no acreditan Atrás nativo. La meta completa sigue abierta.
