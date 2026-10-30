# Disponibilidad analítica en navegador — 12 de octubre de 2026

Recorrido con frontend Expo Web y API local conectada a la base UI aislada existente. Se inició sesión con el Mayorista de pruebas existente y se cerró al terminar, quedando ambos campos de login vacíos. No se registraron ventas, compras, pagos, evaluaciones ni publicaciones durante esta comprobación.

## Resultados observados

- Entrada autenticada a `/analytics`, carga real de filtros históricos y selección de Canchán QA.
- Corte 2026-10-12: respuesta central con 0 de 26 semanas suficientes, historial insuficiente y ausencia de publicación conservada. Las últimas semanas muestran operaciones reales de esa base de pruebas, insuficientes para el mínimo de cinco por semana. No se presenta precio estimado.
- Desplegar/ocultar las 26 semanas funciona. Historial de publicaciones y evaluaciones permanece accesible con total cero, estados vacíos diferenciados y paginación deshabilitada.
- Cambiar Hasta a 2026-10-11 retira el resultado anterior. La consulta siguiente muestra «Corte histórico», ventana 2026-04-06–2026-10-04 y explicación de que no certifica vigencia de publicaciones.
- Tablet 1280×800: bloques de disponibilidad, mensajes y acciones visibles y legibles. Teléfono 360×800: textos y etiquetas se ajustan, botón de disponibilidad en dos líneas. Medición DOM: viewport, raíz y ancho de documento de 360 px; sin desbordamiento horizontal global.
- Volver retorna a `/home`; Cerrar sesión retorna al login con campos vacíos. Se restableció el tamaño del navegador.

## Capturas

- `tmp/analytics-readiness-tablet-real-2026-10-12.png`
- `tmp/analytics-readiness-phone-real-2026-10-12.png`
- `tmp/analytics-historical-phone-real-2026-10-12.png`

Esta evidencia verifica el recorrido real de datos insuficientes/ausencia/corte histórico. Los estados positivos de publicación, detalle de comparación e historial con versiones tienen evidencia de componentes e integración aislada; todavía requieren recorrido visual positivo y Android. La revisión de estos estados tampoco acredita igualdad con Figma DS-044/045. T714/T715 permanecen abiertos.

Los servicios de la sesión anterior estaban ausentes y sus handles terminales ya no existían. Se iniciaron servicios propios en puertos libres; PostgreSQL terminó su recuperación y la API quedó activa antes del acceso. No se reinició un servicio por un mero timeout de observación.
