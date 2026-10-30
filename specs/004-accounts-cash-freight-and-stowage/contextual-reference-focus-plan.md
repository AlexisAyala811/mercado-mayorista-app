# Foco al editar referencias contextuales

Problema observado en Android: seleccionar Editar desde la lista mantiene el desplazamiento y puede dejar el nombre y cabecera de edición parcialmente fuera de pantalla. Evidencia previa: `docs/sdd/verificacion-proveedores-compra-android-2026-10-16.md`. Aplicar a las referencias existentes dentro de Compra/Venta, sin nueva navegación ni modificación de permisos o datos.

- Al abrir una edición, solicitar foco en Nombre utilizando el adaptador de teclado/desplazamiento existente.
- Al volver a solicitar la misma entidad, conservar todos sus campos y llevar el foco al borrador; no escribir ni pedir reemplazo.
- Si se elige otra entidad con cambios pendientes, mantener la confirmación existente. Cancelar conserva campos y no sustituye la edición; confirmar carga el registro elegido y solicita foco. Bloquear estas solicitudes durante escritura, carga u otra confirmación.
- Mantener el alta inicial sin foco forzado, para permitir consultar la lista sin abrir el teclado. No reiniciar campos por buscar o por un simple render.

Implementación: solicitud incremental de foco que remonta únicamente el bloque de campos controlados al editar. Valores y guardas permanecen en el workspace; FormField conserva su contexto de teclado. Verificar regresiones de cancelación/reemplazo/sesión y paquete. El foco real, teclado normal y lector de pantalla permanecen pendientes hasta su recorrido específico; no acreditarlos por una propiedad de componente.
