# Tabla de Reportes y consultas visibles

Fecha local: 19 de octubre de 2026. Referencia: MERCADO, bloque de reportes desde 98:365. Continúa la propuesta de reportes aprobada el 17 de octubre.

La tabla reutiliza los SVG originales de documento, consulta y descarga, tipografías locales Inter/Raleway y tokens acotados a Reportes. Incluye cuatro filas, formatos PDF/Excel, acciones con nombre accesible completo y etiquetas visibles breves. En pantallas estrechas se apila; los controles mantienen un mínimo táctil de 44 puntos.

Los conteos provienen de operaciones confirmadas del periodo: operaciones, contrapartes distintas y variedades distintas. No representan inventario. La consulta SQL conserva el aislamiento por negocio y excluye anulaciones. Evidencia PostgreSQL de solo lectura: `tmp/operation-overview-counts-20261019.json`. Backend: 229 pruebas/59 suites, tipos, lint y compilación aprobados. Frontend: 533 pruebas/75 suites, tipos y lint aprobados; después del ajuste singular/plural, cuatro pruebas focalizadas de consultas aprobadas.

Paquete activo: `web-export-report-table-copy-20261019`. Activación con respaldo y 274 archivos cotejados: `tmp/report-table-copy-web-activation-20261019.json`. Los 200 recursos PDF.js 6.4.299 coinciden con la instalación.

Se utilizó la pestaña existente que abrió el usuario. Inicio de sesión QA correcto y navegación desde Más operaciones a Reportes. Se generó octubre de 2026: dos compras, S/505, cuatro sacos y 202 kg. La consulta de detalle mostró las dos compras; la agrupación mostró una variedad y las mismas cantidades, con subtotal no distribuido. El resumen PDF se renderizó dentro del visor con una página y valores coincidentes. No se confirmaron operaciones comerciales ni devoluciones.

Revisión visual realizada en ancho inicial de aproximadamente 595 píxeles y en 1440 × 1061: tabla ancha con cuatro columnas, iconos y acciones visibles, y visor PDF visible en el tamaño inicial. Esto no acredita todavía toda la composición de Figma ni la revisión en dispositivo Android. Quedan pendientes cabecera/filtros, lectores de pantalla, foco exhaustivo, descarga/compartición desde interfaz y pruebas visuales de todos los módulos. La meta global permanece abierta.
