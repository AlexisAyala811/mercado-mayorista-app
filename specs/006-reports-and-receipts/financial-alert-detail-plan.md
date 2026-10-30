# Detalle de avisos financieros

HU14/RF16/RF23 en build_propuesta.py exige aviso vinculado a cuenta y vencimiento, evitando duplicados. El reporte actual solo presenta un contador aunque el contrato central entrega una fila por cuota. Presentar esas filas con referencia de cuenta/cuota, tipo por pagar/cobrar, vencimiento civil, estado y saldo de la cuota. Denominar el contador «Cuotas», pues una cuenta puede tener varios vencimientos. No confundir saldo de cuota con saldo total.

Reutilizar componentes y estilos de Reportes. Conservar los filtros y corte existentes; mostrar explícitamente que el corte es la fecha Hasta, sin interpretar el estado como relativo al reloj del dispositivo. Conservar filas de cuotas distintas incluso con fecha/importe iguales; usar installmentId del contrato central como identidad y un respaldo para respuestas antiguas. Estado vacío explícito. Sin comandos financieros, canal externo ni cambios de política de vencimiento.

Validación: varias cuotas de una cuenta, fechas iguales sin perder filas, estado y monto correctos, vacío, invalidación con filtros/sesión. Tipos/lint y regresiones. Verificación visual/nativa y convergencia completa con Figma pendientes hasta observarlas.
