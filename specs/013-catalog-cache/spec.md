# Especificación 013: Caché de catálogos

**Estado:** alcance aprobado por el usuario el 16 de noviembre de 2026 · **Fecha:** 16 de noviembre de 2026
**Origen:** rúbrica del curso (criterio 11, «Implementación Cache») y el atributo [AC01](../../docs/01-analisis-de-sistema/04-atributos-de-calidad.md)

## Objetivo

Que la API no consulte la base de datos cada vez que una tablet pide una lista de referencia que casi nunca cambia.

## Alcance

| Elemento | Regla |
| --- | --- |
| Qué se guarda | Las páginas de proveedores, variedades y compradores activos |
| Dónde | En la memoria del proceso de la API; sin Redis ni otra dependencia |
| Clave | Negocio, catálogo, límite y desplazamiento |
| Vigencia | 60 segundos, configurable con `CATALOG_CACHE_TTL_SECONDS` (0 a 3600; 0 lo apaga) |
| Invalidación | Crear, editar o desactivar un registro borra las páginas de ese catálogo y de ese negocio al terminar la transacción |
| Tamaño | 500 entradas como máximo; salen primero las más antiguas |

## Lo que nunca se guarda

Saldos, cuentas, caja, pagos, historiales de compras y de ventas, reportes y comprobantes. El servidor es la única autoridad de saldos y esas lecturas siguen yendo siempre a la base de datos.

## Reglas

1. **Aislamiento por negocio.** La clave empieza por el negocio de la sesión; una página de un negocio nunca se sirve a otro.
2. **Un cambio se ve de inmediato** en la instancia que lo recibió.
3. **Lectura en curso.** Lo que se estaba leyendo mientras el catálogo cambiaba no se guarda: cada catálogo de cada negocio tiene una versión y solo se guarda lo leído si la versión no cambió.
4. **Cambio rechazado.** También borra las páginas; es inofensivo y evita casos límite.

## Límite conocido

El caché vive en cada instancia. Con dos instancias de la API (AC06), un cambio hecho en una tarda hasta 60 segundos en verse desde la otra. Para catálogos es aceptable; para compartirlo haría falta un caché externo, que queda fuera de alcance.

## Fuera de alcance

- La pizarra de precios de Analítica: se propuso, pero sus datos dependen de compras y ventas, y necesita su propia regla de invalidación.
- Cabeceras HTTP de caché y CDN.
- Las características comerciales (calidades y procedencias).

## Criterios de aceptación

1. Dos lecturas seguidas de la misma página consultan la base de datos una sola vez.
2. Tras crear o desactivar un registro, la lectura siguiente ya lo refleja.
3. Con `CATALOG_CACHE_TTL_SECONDS=0` el comportamiento es el de antes.
4. Hay una medición con k6, con y sin caché.
