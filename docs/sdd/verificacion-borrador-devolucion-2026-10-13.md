# Protección del borrador de devolución — 13 de octubre de 2026

Corte de 003: navegación del detalle de ventas, continuidad de la edición local y aislamiento entre registros. Implementación en `mercado-app/src/features/sales/screens/sales-history-screen.tsx`. Conserva permisos, fórmulas, contratos de anulación/devolución y UUID; no añade stock ni inventario.

## Comportamiento implementado

- Motivo, flete o líneas modificadas activan la protección de salida. Volver al historial o reemplazar el detalle ofrece Cancelar/Descartar edición; cancelar conserva todos los campos y descartar limpia solo la edición local antes de ejecutar la acción solicitada.
- La remoción de ruta usa `usePreventRemove` y conserva `data.action` para reproducir exactamente la navegación aprobada después del descarte. Durante guardado/envío o preparación de comprobante no permite remover desde esa pantalla.
- `beforeunload` registra la protección web mientras existen cambios o actividad. No acredita persistencia ni prevención del cierre forzado, muerte del proceso, cambios de pestaña o render condicional. Logout/caducidad mantiene el retiro de datos de la sesión.
- Abrir otra venta reinicia motivo/flete/líneas; los valores anteriores no se trasladan al nuevo registro.
- Al confirmar conservación en la cola, el cuerpo original permanece en la operación encolada y los campos editables se reinician. La operación central continúa según el coordinador; el descarte local no borra la cola ni revierte operaciones confirmadas.
- Los campos no se editan detrás del diálogo de descarte. Se conservan los guards de sesión y descarte de respuestas tardías del corte anterior.

Referencia de navegación consultada mediante Context7 y contrastada con el alias instalado de Expo Router SDK 57: https://github.com/react-navigation/react-navigation.github.io/blob/main/versioned_docs/version-8.x/use-prevent-remove.md. La documentación enumera límites para salidas externas y remoción condicional; no se presentan como recorridos garantizados.

## Evidencia de pruebas

Tipos y lint aprobaron con código cero. Suite enfocada: 187 pruebas en 27 suites de ventas, sincronización, autenticación y comprobantes. El historial incluye 18 casos. Las regresiones nuevas verifican:

1. Motivo/flete modificados: cancelar la salida mantiene los valores; descartar permite seleccionar una segunda venta real de la colección simulada, consulta su ID y muestra motivo vacío/flete cero, sin enqueue ni envío.
2. Remoción de ruta simulada: no dispatch antes de confirmar; después se ejecuta la misma acción de navegación recibida y no se encola una operación.
3. Conservación de cola simulada: el cuerpo conserva el motivo original, los campos locales quedan limpios, la navegación se bloquea durante el envío y deja de advertir al completar una confirmación.
4. Edición solo de peso: cancelar conserva 2.125; restaurar cero elimina la advertencia, sin operación comercial.

Estas pruebas usan repositorios/coordinador/navegación simulados. No acreditan guardado físico nuevo de este escenario, gesto Atrás nativo, diálogo beforeunload real ni fidelidad Figma.

## Exportación y runtime pendientes

Se solicitó `npm run export:web` con la dirección pública QA para verificar el nuevo comportamiento en el build servido. La revisión automática no pudo completarse por límite de uso y rechazó ejecutar la acción; el mensaje indicó que no era una determinación de inseguridad. No se ejecutó esa exportación ni se sustituyó por otro mecanismo para eludir la revisión. La segunda comprobación de servicios prevista en la misma llamada tampoco se ejecutó.

El export y las capturas del corte anterior (`verificacion-sesion-historial-ventas-2026-10-13.md`) pertenecen a la versión sin este diálogo y no prueban estos cambios. No se reanudó la prueba del navegador con el build antiguo como si fuera el nuevo.

Reanudar la exportación/verificación cuando el mecanismo de revisión esté disponible. Permanecen abiertas la prueba web del descarte y nueva venta, Android, accesibilidad, Figma y las mutaciones completas. T314/T315/SI-06/SI-08 y la meta global no se cierran por este corte.
