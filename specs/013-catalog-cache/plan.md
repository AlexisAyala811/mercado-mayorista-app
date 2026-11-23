# Plan 013: Caché de catálogos

**Especificación:** [spec 013](spec.md) · **Fecha:** 16 de noviembre de 2026

## Diseño

- `backend/src/platform/common/cache/memory-cache.ts`: caché genérico con vigencia, tamaño máximo, invalidación por ámbito y versión por ámbito. No depende de NestJS.
- `backend/src/shared/catalog/catalog-cache.ts`: proveedor inyectable que arma el ámbito `negocio:catálogo` y lee la vigencia de la configuración.
- `CatalogService`: las tres lecturas pasan por el caché; las nueve escrituras quedan como métodos privados y sus métodos públicos invalidan al terminar.

## Por qué sin dependencia nueva

Un caché en memoria con estas reglas son unas setenta líneas. `@nestjs/cache-manager` añadiría dos paquetes y no resuelve la regla de la lectura en curso. Si más adelante hace falta compartir el caché entre instancias, se cambia `CatalogCache` sin tocar el servicio.

## Verificación

1. Pruebas unitarias del caché y del servicio.
2. Comprobación contra la API real: alta y baja de un proveedor visibles en la lectura siguiente.
3. `backend/test/load/catalogos.k6.js` con el caché encendido y apagado.
