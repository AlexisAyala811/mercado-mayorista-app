# Especificación 016: Segunda instancia del backend

**Estado:** aprobada por el usuario el 18 de noviembre de 2026 · **Fecha:** 17 de noviembre de 2026
**Origen:** rúbrica del curso (criterio 8, «Escalabilidad del Frontend y backend») y el atributo [AC06](../../docs/01-analisis-de-sistema/04-atributos-de-calidad.md)

## Objetivo

Demostrar AC06: al pasar de 20 a 40 usuarios, añadir una instancia del backend y mantener AC01.

## Alcance

| Elemento | Regla |
| --- | --- |
| Instancias | Dos procesos de la misma API, en los puertos 3101 y 3102, contra la misma base |
| Balanceador | `backend/test/load/balanceador.mjs`, reparto por turnos, solo para medir en un equipo |
| Medición | k6 con 40 usuarios: con pausas realistas y sin pausas, para hallar la capacidad máxima |
| Base | La base con volumen de la spec 014 |

## Por qué la API escala horizontalmente

- **Sesiones en PostgreSQL.** Cualquier instancia valida cualquier token; no hace falta afinidad de sesión.
- **Idempotencia en la base.** `clientOperationId` se comprueba con restricciones únicas, así que un reintento que cae en otra instancia no duplica nada.
- **Sin archivos locales compartidos.** Los comprobantes se guardan en la base.

## Lo que queda por instancia

| Estado | Efecto con varias instancias |
| --- | --- |
| Límite de solicitudes (`ThrottlerModule` en memoria) | Cada instancia cuenta por su lado: el límite real se multiplica por el número de instancias |
| Caché de catálogos (spec 013) | Un cambio tarda hasta 60 s en verse desde otra instancia |

Para un despliegue con varias instancias haría falta un almacén compartido (por ejemplo Redis) para ambos; queda fuera de alcance.

## Fuera de alcance

- El balanceador de producción (nginx o el del proveedor) y su configuración.
- Escalar el frontend: la app es una aplicación de tablet; su versión web es estática y se sirve desde cualquier CDN.
- Escalar PostgreSQL (réplicas de lectura).

## Criterios de aceptación

1. Con dos instancias, k6 cumple AC01 con 40 usuarios.
2. El balanceador reparte las solicitudes entre ambas instancias.
3. Hay una medición de la capacidad máxima con una y con dos instancias.
