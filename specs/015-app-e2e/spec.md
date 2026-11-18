# Especificación 015: Pruebas end to end de la app

**Estado:** aprobada por el usuario el 17 de noviembre de 2026; herramienta elegida sin preferencia del usuario · **Fecha:** 17 de noviembre de 2026
**Origen:** rúbrica del curso (criterio 6, «Pruebas End to End»)

## Objetivo

Probar la app de punta a punta, como la usa una persona, contra la API real y PostgreSQL, sin simular el servidor.

## Decisión

Playwright sobre la app exportada a web, en vez de Maestro en Android. La app ya se exporta a web con Expo y comparte el mismo código; Playwright corre en cualquier equipo y en GitHub Actions sin emulador. Lo que no cubre es lo propio de Android: teclado del sistema, impresión, PDF nativo y la cola cifrada en el almacenamiento seguro del dispositivo.

## Alcance

| Elemento | Regla |
| --- | --- |
| Herramienta | `@playwright/test` 1.64.1 con Chromium, en `app/` |
| Pantalla | 1280 × 800, el tamaño de la tablet |
| Datos | Base desechable con los datos de simulación; las pruebas solo leen |
| Credenciales | Por variables de entorno; nunca en el repositorio |
| Sesión | Un inicio de sesión por corrida, guardado y reutilizado |

## Fuera de alcance

- Flujos que escriben (pesaje, compra, venta, pagos): necesitan preparar y limpiar datos por prueba.
- Ejecución en la CI de GitHub: hace falta un trabajo con PostgreSQL, la API y la exportación web.
- Android nativo y TalkBack.

## Criterios de aceptación

1. `npm run test:e2e` corre las pruebas contra la API configurada y falla si alguna no pasa.
2. Jest no ejecuta las pruebas de Playwright.
3. Hay un documento de verificación con fecha y resultado.
