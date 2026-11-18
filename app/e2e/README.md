# Pruebas end to end de la app (Playwright)

Spec [015](../../specs/015-app-e2e/spec.md). Prueban la app exportada a web contra una API real con una base desechable.

## Pasos

1. Levantar PostgreSQL y la API con una base de prueba y `CORS_ORIGINS=http://127.0.0.1:8090`.
2. Exportar la app apuntando a esa API:

   ```bash
   EXPO_PUBLIC_API_URL=http://127.0.0.1:3100/api/v1 EXPO_PUBLIC_ALLOW_INSECURE_API=true npm run export:web
   ```

3. Instalar el navegador una vez: `npx playwright install chromium`.
4. Ejecutar con el usuario de prueba en el entorno:

   ```bash
   E2E_USERNAME=<usuario> E2E_PASSWORD=<contraseña> npm run test:e2e
   ```

Playwright sirve `dist/` en el puerto 8090 con `e2e/serve-dist.mjs`. El informe queda en `e2e-report/` y las capturas de los fallos en `e2e-results/`; ninguno entra al repositorio.

## Qué cubren

| Prueba | Qué comprueba |
| --- | --- |
| Inicio de sesión | Un solo inicio de sesión para toda la corrida; la API admite cinco por minuto |
| Contraseña equivocada | Muestra «Usuario o contraseña no válidos.» y no entra |
| Ruta protegida | Sin sesión, `/reports` vuelve al acceso |
| Menú | Compra con sus seis módulos, el saldo por pagar y la pestaña Venta |
| Ver compras | Totales, el conteo de compras y las tarjetas con «Ver detalle» |
| Reportes de compras | Filtro por variedad, pie «SUBTOTAL» y ventana de detalle |
| Carros | Fichas de filtro y el registro de un vehículo |

Las pruebas solo leen: no crean compras, ventas ni pagos.
