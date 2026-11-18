# Verificación de las pruebas end to end de la app

> **Spec:** [015](../../specs/015-app-e2e/spec.md) · **Fecha:** 17 de noviembre de 2026

Las siete pruebas de Playwright pasaron contra la API real y PostgreSQL: un inicio de sesión y seis flujos, en 5,2 segundos.

## Resultado

| Prueba | Resultado |
| --- | --- |
| Inicia sesión con el usuario de prueba | Pasa |
| Rechaza una contraseña equivocada y no entra | Pasa |
| Una ruta protegida sin sesión vuelve al acceso | Pasa |
| El menú muestra Compra con sus módulos y datos del servidor | Pasa |
| Ver compras lista las compras con su estado de pago | Pasa |
| Reportes de compras filtra por variedad y abre el detalle | Pasa |
| Carros muestra los vehículos y filtra por tipo | Pasa |

## Entorno

| Elemento | Valor |
| --- | --- |
| Navegador | Chromium de Playwright 1.64.1, 1280 × 800, `es-PE`, hora de Lima |
| App | Exportación web de Expo con `EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1` |
| API | NestJS en el puerto 3100, `CORS_ORIGINS=http://127.0.0.1:8090` |
| Base | PostgreSQL 17 portable con la base de simulación |

## Hallazgos durante la escritura

- **Pantallas apiladas.** Expo Router deja montada la pantalla anterior debajo de la actual. En Ver compras, un texto del menú coincidía antes que el de la lista; las comprobaciones filtran solo lo visible.
- **Límite de inicio de sesión.** La API admite cinco inicios de sesión por minuto; por eso hay uno solo por corrida.

## Comprobaciones de la app

- Tipos y lint sin errores.
- Jest: 752 pruebas en 108 suites. En una de cuatro corridas completas falló una prueba que no se pudo identificar; las otras tres pasaron enteras (T1506).

## Qué no demuestra

- **Web, no Android.** No cubre el teclado del sistema, el PDF nativo ni la cola cifrada del dispositivo.
- **Solo lectura.** No se probó registrar compras, ventas ni pagos.
- **Sin CI.** Corrió en el equipo de desarrollo; no está en GitHub Actions.
