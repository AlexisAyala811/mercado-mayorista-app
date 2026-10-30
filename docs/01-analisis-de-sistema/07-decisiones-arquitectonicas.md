# Decisiones arquitectónicas

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Registro de decisiones

Los códigos CL (clarificación) identifican las decisiones aprobadas durante la especificación del proyecto. Se citan en el resto de la documentación.

| Código | Decisión | Fecha | Trazabilidad |
| --- | --- | --- | --- |
| CL-03 | Tablet Android con Expo, React Native, TypeScript estricto y Expo Router | Sep. 2026 | R01, DA01 |
| — | Monolito modular con NestJS, PostgreSQL y REST `/api/v1`; migraciones explícitas | Sep. 2026 | R03, R07, DA02, DA06 |
| CL-04 | Cada operación lleva un UUID de cliente; un reintento devuelve el resultado original; la versión del registro detecta cambios concurrentes y responde `409` sin sobrescribir. Reutilizar un UUID con datos distintos responde `409` (`operation-id-conflict`). | Sep. 2026; ampliada 29 oct. 2026 | RF21, AC03, DA02 |
| CL-05 | El Encargado opera solo con un reemplazo autorizado por el Mayorista, de máximo 24 horas, revocable y revalidado en el servidor | Sep. 2026 | RF02, AC04 |
| CL-06 | Sesión en almacenamiento seguro y pendientes cifrados por usuario y negocio, bloqueados al cerrar sesión | Sep. 2026 | RF01, RF21, R05 |
| CL-07 | Peso en kilogramos con tres decimales y dinero en céntimos, con redondeo mitad hacia arriba; correcciones por compensación | Sep. 2026 | RF06B, RF07, AC03 |
| CL-08 | Criterios de habilitación de la predicción (ver sección siguiente) | 6 oct. 2026 | RF19, RF20, R04, DA05 |
| CL-09 | Tablet de 10″ a 1280 × 800 horizontal; revisión en 360 × 800 y 1440 × 1024 | Sep. 2026 | AC01, AC05 |
| CL-10 | Auditoría inmutable, consulta exclusiva del Mayorista y conservación mínima de 5 años | Sep. 2026 | RF22, AC04 |
| CL-12 | Devolución comercial idempotente, con efecto compensatorio en cuenta o caja y nuevo comprobante; no modifica la venta original | 28 sep. 2026 | RF10, RF12 |
| CL-13 | Calidad y procedencia por saco de compra y línea de venta; listas administradas por el Mayorista y opción «No informada» | 14 oct. 2026 | RF04, RF18 |
| — | Sin control de existencias (ver ADR) | 7 oct. 2026 | RF08–RF09 retirados |
| — | Referencias comerciales dentro de cada operación (ver ADR) | 14 oct. 2026 | RF03, RF04 |
| CL-MN | Envío manual de documentos por WhatsApp o correo (ver ADR) | 26 oct. 2026 | RF23, RF25, RF26 |
| — | Organización en ocho módulos de negocio y estado de cuenta del comprador (ver ADR) | 29 oct. 2026 | RF27 |
| — | Monorepo con entrega y despliegue continuos (ver ADR) | 29 oct. 2026 | AC03, AC07, AC08, DA06, DA07 |

CL-11 (margen por valoración de lotes) quedó sin efecto con el retiro del control de existencias.

## Alternativas consideradas

| Elección | Alternativa | Motivo y costo asumido |
| --- | --- | --- |
| Monolito modular | Microservicios | Equipo y operación acotados; hay que vigilar el acoplamiento entre módulos. |
| Persistencia local temporal | Cliente siempre conectado | La descarga debe continuar sin red; agrega cifrado, reintentos y revisión de conflictos. |
| PostgreSQL transaccional único | Un almacén por módulo | Operación, cuenta y caja deben confirmarse en una sola transacción. |
| Token opaco y sesión central | Permisos solo en el menú | La revocación y los reemplazos exigen autoridad central en cada operación. |
| Aritmética decimal exacta | Números de punto flotante | Evita diferencias de redondeo en pesos e importes. |
| REST versionada | Acceso SQL desde el dispositivo | Autorización y reglas en una frontera controlada. |
| Envío manual por WhatsApp | WhatsApp Business API | Sin costo por mensaje ni verificación ante Meta; a cambio, no hay confirmación de entrega ni envío programado. |

Consecuencias: un único despliegue simplifica la operación pero exige módulos bien delimitados; la cola local agrega estados y conflictos; escalar horizontalmente requiere medir concurrencia y mantener la autoridad transaccional central.

## ADR-01 · Retiro del control de existencias

**Estado:** aprobado el 7 de octubre de 2026.

Se conserva el historial de cargamentos, sacos, pesos, compras, ventas y despachos, sin inventario, remanentes, disponibilidad, descuentos de stock ni alertas de mercadería. RF08 y RF09 salen del alcance. Deja sin efecto los aspectos de CL-07 y CL-11 basados en disponibilidad y valoración por lote; se mantienen precisión, cuentas, caja, auditoría e idempotencia. Las migraciones y datos históricos se conservan.

## ADR-02 · Referencias comerciales dentro de cada operación

**Estado:** aprobado el 14 de octubre de 2026.

Proveedores, compradores, variedades, calidades, procedencias, transportistas y vehículos no tienen una sección propia en la aplicación: el Mayorista los crea y edita desde el formulario de la operación que está registrando, sin perder el borrador. El Encargado solo selecciona referencias existentes. En el backend estas referencias forman un módulo transversal con su API y sus reglas (por ejemplo, desactivar sin borrar para conservar el historial).

## ADR-03 · Envío manual por WhatsApp o correo

**Estado:** aprobado el 26 de octubre de 2026 y confirmado el 29 de octubre.

La aplicación Android prepara el archivo (comprobante, estado de cuenta, imagen o documento Word), abre WhatsApp o el correo con el archivo adjunto y el Mayorista elige el contacto y confirma. La API autoriza la operación y registra el intento (preparado, compartición solicitada o fallido) sin recibir el contenido del archivo. No hay chat, envío automático ni notificaciones push, y el Encargado no usa la mensajería. La integración con WhatsApp Business API queda como posible evolución.

## ADR-04 · Ocho módulos de negocio y estado de cuenta

**Estado:** aprobado el 29 de octubre de 2026.

El sistema se organiza por proceso de negocio en ocho módulos (Identidad y acceso; Recepción y compras; Ventas y despachos; Cuentas y caja; Costos logísticos; Documentos; Mensajería; Reportes y analítica) más responsabilidades transversales (auditoría, referencias comerciales y sincronización). Documentos genera los archivos y Mensajería los envía. Se agrega HU16/RF27: estado de cuenta del comprador en PDF e imagen. El detalle está en [componentes arquitectónicos](../02-arquitectura-software/componentes-arquitectonicos.md).

## ADR-05 · Monorepo con entrega y despliegue continuos

**Estado:** aprobado el 29 de octubre de 2026.

La documentación y el código conviven en un único repositorio: `docs/` e `img/` para la documentación, `backend/` para la API y, más adelante, `app/` para el cliente Android. Una funcionalidad puede cambiar su documento y su código en el mismo pull request.

`main` es la única rama de entrega y todo cambio llega por pull request. Cada PR pasa la integración continua (tipos, lint, pruebas unitarias y e2e en PostgreSQL, build, auditoría de dependencias e imagen Docker). Cada commit en `main` publica una imagen versionada (entrega continua) y, con el entorno de producción configurado, la despliega, migra, comprueba la salud y revierte si falla (despliegue continuo).

Consecuencias: las migraciones deben ser compatibles con la versión anterior (expandir y luego contraer); las credenciales viven solo en GitHub y en el servidor. Detalle en [entrega y despliegue continuos](../03-diseño-de-software/entrega-y-despliegue-continuos.md).

## Condiciones de habilitación de la predicción (CL-08)

- **Historial mínimo:** 26 semanas completas consecutivas por negocio y variedad, con al menos cinco ventas confirmadas válidas por semana.
- **Objetivo:** precio semanal de venta por kilogramo, ponderado por peso. No se imputan fechas, pesos ni precios; las operaciones excluidas se identifican.
- **Evaluación:** las ocho semanas finales se evalúan progresivamente, sin usar datos futuros. El error absoluto medio debe ser al menos 10 % menor que el de la referencia (precio de la semana anterior) y el rango debe contener al menos siete de los ocho valores reales.
- **Acceso:** el Mayorista ve estimaciones solo cuando hay datos suficientes y la evaluación está aprobada. La cobertura objetivo del 80 % no es una garantía estadística.
