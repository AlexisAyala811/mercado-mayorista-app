# Retornos desde rutas directas — 11 de octubre de 2026

## Cambio y alcance

Se reutilizó `backOrHome` en el retorno principal de nueve pantallas activas: analítica, reportes, comprobantes, historial de ventas, historial de compras, sincronización, catálogos, auditoría y administración. Si existe una pantalla anterior, se conserva el retorno; si la ruta fue abierta directamente o recargada sin historial, se reemplaza por el menú protegido `/home`. No se modificaron permisos ni retornos internos de detalle. Los flujos de salida de ventas, pesaje y liquidación de compra conservan sus protecciones existentes.

Este corte continúa la corrección de cuentas y logística verificada en `verificacion-revision-liquidaciones-2026-10-11.md`. El formulario inicial de compra conserva todavía su retorno directo anterior; su tratamiento requiere revisar los datos sin guardar y permanece pendiente, junto con otros recorridos nativos. Las rutas retiradas de inventario no se reactivaron ni modificaron.

## Verificación actual

`npm run check`: TypeScript, lint y **360 pruebas en 51 suites aprobadas** después de los cambios. No se añadieron pruebas que dupliquen la función de retorno ya cubierta en el corte anterior. Las regresiones de ventas, recuperación local e historiales permanecen aprobadas.

En Expo Web local con la API y PostgreSQL de pruebas existentes, se abrió cada una de las nueve rutas directamente, se observó su pantalla y se pulsó únicamente Volver. En todos los casos la URL final fue `http://localhost:8087/home` y el menú quedó visible. No se escribieron formularios, crearon usuarios/reemplazos, registraron operaciones, compartieron documentos ni sincronizaron pendientes.

Evidencia por ruta con fragmento DOM y URL final: `tmp/direct-route-return-2026-10-11.json`. Captura final del menú: `tmp/direct-route-return-home-2026-10-11.png`. La evidencia prueba apertura y retorno, no cada función comercial o la carga completa de sus colecciones; algunas capturas DOM contienen una consulta aún en progreso.

## Pendientes

Verificar navegación y salida del formulario inicial de compra con datos en edición, accesibilidad en dispositivo, Android y convergencia Figma. El objetivo global no queda cerrado por estas comprobaciones de navegación.
