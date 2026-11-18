# Excepción temporal de auditoría: picomatch

> **Fecha:** 17 de noviembre de 2026 · **Aprobada por:** el usuario, el 17 de noviembre de 2026 · **Vence:** 17 de diciembre de 2026

El paso «Sin vulnerabilidades altas en producción» de la CI del backend admite una sola excepción con fecha: el aviso [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) de `picomatch`. Cualquier otra vulnerabilidad alta o crítica sigue deteniendo la CI.

## Por qué

| Dato | Valor |
| --- | --- |
| Aviso | ReDoS en `picomatch` ≤ 4.0.7, severidad alta, publicado el 19 de octubre de 2026 |
| Versión corregida | Ninguna publicada; 4.0.7 es la última |
| Cadena | `typeorm` 1.1.1 → `tinyglobby` → `picomatch` |
| Efecto | Desde el 17 de noviembre la CI de `main` y de los PR fallaba en este paso, y no se publicaba la imagen |
| Alternativa descartada | `npm audit fix --force` baja `typeorm` a 0.3.31, un cambio mayor |

## Riesgo

El ReDoS solo ocurre si alguien controla el patrón de búsqueda de archivos. TypeORM usa `tinyglobby` para cargar entidades y migraciones desde rutas. Este backend registra entidades y migraciones como clases, y ninguna petición HTTP llega a un patrón de búsqueda. La revisión se hizo leyendo la configuración; no hay una prueba que lo demuestre.

## Cómo funciona

- [`.github/audit-excepciones.json`](../../.github/audit-excepciones.json) guarda el aviso, el paquete, la fecha de vencimiento y el motivo.
- [`.github/scripts/audit-high.mjs`](../../.github/scripts/audit-high.mjs) ejecuta `npm audit --omit=dev --json` y falla ante cualquier aviso alto o crítico que no esté en la lista o cuya excepción haya vencido.
- Si el aviso desaparece, el script avisa de que la excepción ya puede quitarse.

Comprobado en local el 17 de noviembre de 2026: con la excepción vigente termina con código 0; con la fecha vencida y sin excepción termina con código 1 y nombra el aviso.

## Al vencer

Antes del 17 de diciembre de 2026: actualizar `picomatch` si hay parche y quitar la excepción, o renovarla con una nueva revisión y aprobación del usuario.
