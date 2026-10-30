# Periodo y actualización de Reportes

Completar el requisito existente de comunicar periodo y fecha de actualización. Usar `generatedAt` del resumen central, convertido a hora de Lima y etiquetado «Resumen actualizado»; no inventar una fecha local de consulta ni atribuir esa marca a todos los conjuntos de datos. Mostrar el periodo junto al resumen. Invalidar esta presentación con el mismo ciclo que invalida resultados al cambiar fechas/filtros/sesión; no mantener datos anteriores durante error o nueva consulta.

Validar fechas civiles reales antes de llamar a la API, incluidos años bisiestos. Conservar validación central. Una fecha imposible o un intervalo invertido presenta el error existente y no envía peticiones. Probar rechazo, fecha bisiesta válida, marca central y retirada al modificar periodo. Este ajuste no cambia cálculos, permisos, filtros ni composición Figma; la convergencia visual general permanece pendiente.
