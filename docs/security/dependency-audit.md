# Auditoría de dependencias del backend

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
