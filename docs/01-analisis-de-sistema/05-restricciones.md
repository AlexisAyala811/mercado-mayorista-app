# Restricciones

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Restricciones del negocio

| Código | Restricción | Implicación arquitectónica |
| --- | --- | --- |
| R01 | La primera versión opera en tablets Android con conectividad irregular. | Interfaz adaptable, almacenamiento local cifrado y sincronización diferida. |
| R02 | El registro de pesos es manual durante el piloto. | Flujo rápido y secuencial, con corrección trazable antes del cierre. |
| R03 | La base de datos central es la fuente oficial de operaciones y saldos. | La tablet solo guarda información temporal que puede reconstruirse. |
| R04 | La capacidad de la IA depende de la cantidad, continuidad y calidad del historial. | Analítica por etapas: recolección, tendencias y patrones, y predicción solo al cumplir CL-08. |
| R05 | Los datos de cada negocio permanecen aislados. | Autorización por rol y negocio en todos los servicios y consultas. |
| R06 | El MVP no incluye facturación electrónica, GPS, pasarela de pagos ni balanzas integradas. | Interfaces versionadas para integraciones futuras. |
| R07 | La solución se ajusta al presupuesto y a la capacidad operativa del proyecto. | Servicios administrados y despliegue gradual. |
| R08 | El envío por WhatsApp o correo es manual y sin proveedor de mensajería contratado. | La aplicación prepara el archivo y abre la aplicación externa; el sistema registra el intento, pero no puede confirmar entrega ni lectura. |

## Restricciones técnicas

| Decisión vinculante | Implicación |
| --- | --- |
| Cliente Expo / React Native con TypeScript estricto y Expo Router | Captura táctil adaptada a Android y navegación separada del dominio. |
| PostgreSQL central y API REST `/api/v1` | La tablet no abre conexiones SQL ni determina saldos oficiales. |
| Monolito modular con NestJS | Un único despliegue backend con módulos de negocio delimitados. |
| Migraciones explícitas (`synchronize: false`) | Los cambios de esquema se revisan antes de aplicarse. |
| Git y GitHub | Requisitos, diagramas y decisiones se versionan junto con sus cambios. |

Las condiciones de habilitación de la predicción (CL-08) se detallan en [decisiones arquitectónicas](07-decisiones-arquitectonicas.md#condiciones-de-habilitación-de-la-predicción-cl-08).
