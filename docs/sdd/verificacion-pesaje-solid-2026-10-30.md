# Verificación del refactor SOLID del ingreso de pesos

**Fecha:** 30 de octubre de 2026 · **Especificación:** [002, tareas T222–T227](../../specs/002-reception-weighing-and-purchase-settlement/tasks.md) · **Diseño:** [principios de diseño](../03-diseño-de-software/diseño-interno/principios-de-diseño.md) · **Rama:** `refactor/pesaje-solid`

## Qué cambió

El registro de un saco nuevo (`POST /receptions/:id/sacks`) pasó de un método de 80 líneas en `WeighingService` a las piezas que describe la documentación:

| Principio | Antes | Ahora |
| --- | --- | --- |
| S | `calculateWeights` privada dentro de `weighing.service.ts` | `calculateSackWeights` en `common/domain/sack-weights.ts`, función pura con `SackWeightError` |
| S | Pesos como tres cadenas sueltas | Modelo `SackWeight` («PesoSaco»): bruto, tara y neto normalizados y comparación con un saco guardado |
| D | `WeighingService.add` usaba `DataSource`, `EntityManager` y `AuditService` | Caso de uso `RegisterSackWeight` («RegistrarPesoCasoUso») que solo conoce contratos |
| I | Repositorios TypeORM completos | `WeighingRepository`, `WeighingUnitOfWork` y `WeighingAudit` con seis, una y una operación |
| O, L | Una sola implementación posible | `PostgresWeighingUnitOfWork` en la aplicación y un adaptador en memoria en las pruebas, con las mismas garantías |

La composición está en `reception.module.ts` con un proveedor `useFactory` (patrón confirmado en la documentación de NestJS vía Context7). `WeighingService.add` delega; corrección, anulación y cierre usan las reglas extraídas y siguen en el servicio.

**Sin cambio de contrato:** mismas rutas, cuerpos, códigos HTTP (`404`, `409` con `reception-version-conflict` u `operation-id-conflict`, `422`), mensajes en español, evento `reception.sack-added`, secuencia y tablas. No hay migración.

## Pruebas nuevas

| Archivo | Tipo | Comprueba |
| --- | --- | --- |
| `src/common/domain/sack-weights.spec.ts` | Unitaria (5) | 52,500 − 0,500 = 52,000; tara omitida y cero; tara igual o mayor que bruto; bruto cero; más de tres decimales, signo y texto |
| `src/reception/application/sack-weight.spec.ts` | Unitaria (2) | `52.5` y `52.500` son el mismo saco; no se construye con peso inválido |
| `src/reception/application/register-sack-weight.spec.ts` | Contrato en memoria (10) | Alta con auditoría; cinco reenvíos → un saco y un evento; mismo UUID con otro peso → `409 operation-id-conflict`; variedad ajena, tara igual al bruto y exceso de decimales → `422`; versión antigua y pesaje cerrado → `409`; recepción inexistente → `404`; ninguno escribe nada; fallo de auditoría → nada persistido |
| `test/weighing.e2e-spec.ts` | E2E PostgreSQL (3) | Cinco envíos **simultáneos** de la misma orden por HTTP → un saco, un evento; UUID con otro peso → `operation-id-conflict`; versión vieja → `reception-version-conflict`; auditoría que falla con el adaptador PostgreSQL real → ni saco ni cambio de versión |

## Resultados

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit` | Sin errores |
| `oxlint --type-aware` en los archivos cambiados | Sin errores ni avisos (se quitó un import sin uso) |
| Pruebas unitarias | 307 en 71 archivos (17 nuevas) |
| `nest build` | Correcto |
| E2E en PostgreSQL 17 portable | 50/50 en 7 archivos, incluidos los escenarios de compra que pasan por el pesaje (`commercial-database-scenarios.ts`) |

## Pendiente

- Redibujar `img/fuentes-svg/solid-modulo-pesaje.svg` y `nivel4-clases.svg` con los nombres del código; el texto de ambos documentos ya está actualizado.
- Llevar corrección, anulación y cierre del pesaje al mismo esquema de caso de uso.
