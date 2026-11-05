# Verificación: la app MAÑAY en el monorepo (T900, T901)

**Fecha:** 4 de noviembre de 2026 · **Tareas:** [spec 009, T900–T901](../../specs/009-buyer-account-statement/tasks.md) · **Rama:** `feat/t900-app-monorepo`

## Qué se hizo

- La app Expo de `D:\2026 - II\Arquitectura de Software\Propuesta\mercado-app` se copió a `app/` del monorepo.
- `.github/workflows/app-ci.yml`: en cada push a una rama de trabajo y en cada PR que toque `app/`, instala con `npm ci` y ejecuta tipos, lint, pruebas y la exportación web.

## Historial

T900 pedía conservar el historial. El repositorio de origen tiene **un solo commit** («Initial commit», la plantilla de Expo) y todo el trabajo real estaba **sin confirmar**: 7 archivos modificados, 18 eliminados de la plantilla y 37 nuevos. No había historial útil que conservar, así que se incorporó el árbol de trabajo tal como está, en un solo commit. La carpeta original no se modificó.

## Qué se copió y qué no

| | Archivos |
| --- | --- |
| Copiados | 727 (4,2 MB): todo lo que git incluiría (confirmado más nuevo no ignorado) |
| Omitidos por generados | `android/` (CNG), `dist/`, `dist-android/`, `public/pdfjs/` (lo copia el `postinstall` desde `node_modules`) |
| Omitidos por eliminados | Archivos de la plantilla que el trabajo había borrado |

`app/.gitignore` añade `/public/pdfjs/` y `/dist-android/`. Comprobado con `git check-ignore`: `app/dist`, `app/node_modules`, `app/public/pdfjs` y `app/.expo` quedan fuera.

Revisión de secretos antes de copiar: no hay `.env`, claves, almacenes de certificados ni `google-services.json`. Solo `.env.example`, con una URL de red local sin credenciales.

## Resultados

Ejecutados dentro de `app/` después de `npm ci`, sin la carpeta de origen:

| Verificación | Resultado |
| --- | --- |
| `npm ci` | Correcto; el `postinstall` de la app generó `public/pdfjs/6.4.299`. npm 11.19 bloqueó el script de instalación de una dependencia (`unrs-resolver`), que trae binarios precompilados y no lo necesita |
| `npm run typecheck` | Sin errores |
| `npm run lint` | Sin errores |
| `jest --runInBand` | 602 pruebas en 83 suites |
| `npm run export:web` | Correcto con `EXPO_PUBLIC_API_URL=https://api.mercado.invalid/api/v1` |

La URL de la exportación en la CI es un marcador que solo prueba que el paquete se construye; la dirección real se configura al publicar una versión.

## Pendiente

- Ejecución en verde de `app-ci.yml` en GitHub (se completa al subir la rama).
- Actualizar la ubicación de la app en la documentación de trabajo fuera del repositorio cuando esta rama esté en `main`.
- Aplicar el diseño MAÑAY y las pantallas de las specs 009 y 010 (T940–T944, T1040–T1042).
