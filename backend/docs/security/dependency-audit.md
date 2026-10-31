# Auditoría de dependencias del backend

## 30 de octubre de 2026

**Comando:** `npm audit --omit=dev --audit-level=high` (paso de la CI)

La CI de la rama `refactor/pesaje-solid` falló en este paso por un aviso nuevo, sin relación con el cambio:

| Paquete | Severidad | Problema | Resultado |
| --- | --- | --- | --- |
| `joi` 18.2.9 | Alta | Tiempo cuadrático al dividir en `string().email({ multiple: true })` ([GHSA-4528-x5fx-h6hg](https://github.com/advisories/GHSA-4528-x5fx-h6hg)) | Actualizado a 18.3.1. El backend solo usa `joi` para validar la configuración de arranque y no usa `email` |
| `minimatch` < 11.0.1 (vía `exceljs` → `archiver`, `unzipper`) | Moderada | Denegación de servicio por amplificación de patrones ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)) | **Pendiente**, como `uuid`: la corrección automática baja `exceljs` a 3.4.0. El backend no pasa patrones de usuarios a `minimatch` |
| `uuid` < 11.1.1 (vía `exceljs`) | Moderada | Ver 29 de octubre | **Pendiente** |

Resultado: sin vulnerabilidades altas; 9 moderadas, todas por `exceljs` 4.4.0.

## 29 de octubre de 2026

**Comandos:** `npm audit --omit=dev`, `npm audit fix`

Antes de la corrección, las dependencias de producción tenían 6 vulnerabilidades (3 altas, 3 moderadas):

| Paquete | Severidad | Problema | Resultado |
| --- | --- | --- | --- |
| `body-parser` | Alta | Denegación de servicio con bytes sobrantes en cuerpos comprimidos | Actualizado a 2.4.0 |
| `multer` (vía `@nestjs/platform-express`) | Alta | Denegación de servicio con `fileFilter` asíncrono pendiente | Actualizado a 2.5.0 |
| `qs` | Moderada | `stringify` con `arrayFormat: 'comma'` puede lanzar un error no controlado | Actualizado a 6.17.1 |
| `uuid` (vía `exceljs`) | Moderada | Falta de control de límites en v3/v5/v6 cuando se pasa un búfer | **Pendiente** |

Queda `uuid` < 11.1.1, dependencia de `exceljs` 4.4.0. La única corrección automática baja `exceljs` a 3.4.0, una versión incompatible. El riesgo es bajo: el backend no importa `uuid` directamente y `exceljs` solo usa `v4` sin búfer de salida. Revisar cuando `exceljs` publique una versión con `uuid` actualizado.

Verificación después de la corrección: `tsc` sin errores, `oxlint` sin errores, 253 pruebas unitarias aprobadas y `nest build` correcto.

## 24 de septiembre de 2026

**Comando:** `npm audit --json`

Después de incorporar el módulo oficial `@nestjs/swagger`, npm revisó 405 dependencias y reportó cero vulnerabilidades conocidas: 0 críticas, 0 altas, 0 moderadas y 0 bajas.

Esta evidencia corresponde al archivo `package-lock.json` vigente en la fecha indicada. Debe repetirse al actualizar dependencias y antes de publicar una versión.
