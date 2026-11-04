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

## Operaciones restantes — 4 de noviembre de 2026

Rama `refactor/pesaje-solid-operaciones`, tareas T228–T231 de la spec 002. Las cuatro escrituras que seguían en `WeighingService` pasaron a casos de uso sobre los mismos contratos:

| Operación | Ruta | Caso de uso |
| --- | --- | --- |
| Corregir un saco con el pesaje abierto | `PATCH /receptions/:id/sacks/:sackId` | `CorrectSackWeight` |
| Corregir un saco de un pesaje cerrado | `POST /receptions/:id/sacks/:sackId/correct-closed` | `CorrectClosedSackWeight` |
| Retirar un saco | `POST /receptions/:id/sacks/:sackId/void` | `VoidSack` |
| Cerrar el pesaje | `POST /receptions/:id/close-weighing` | `CloseWeighing` |

- Los contratos se movieron a `application/weighing-ports.ts` y se ampliaron con sacos activos, reemplazo, retiro, versión y cierre. `WeighingAudit` pasó a un solo método `record` con las cinco acciones permitidas.
- `WeighingUseCases` construye los cinco casos de uso sobre una unidad de trabajo; `WeighingService` solo lista sacos y delega, y ya no recibe `AuditService`.
- Se conservó el orden de cada validación y cada mensaje. La corrección de un pesaje cerrado comprueba el estado antes que la versión y responde «La recepción cambió.», como antes.

### Pruebas

| Archivo | Comprueba |
| --- | --- |
| `src/reception/application/weighing-use-cases.spec.ts` (17, reemplaza a `register-sack-weight.spec.ts`) | Los 10 casos del registro y 7 nuevos: corrección con la misma secuencia y reenvío idempotente; retiro con motivo, reenvío y `operation-id-conflict` con otro saco; cierre con totales solo de sacos activos y una sola vez; cierre sin sacos `422`; corrección de cerrado rechazada antes del cierre y aceptada después con su motivo en ambos sacos; mensaje de versión del pesaje cerrado; saco retirado `404` |
| `test/weighing.e2e-spec.ts` (+1, ahora 4) | Por HTTP en PostgreSQL: corregir, retirar, **cinco cierres simultáneos** con un único evento `reception.weighing-closed` (1 saco, 49,500 kg) y corrección del pesaje cerrado (49,000 kg), quedando un único saco activo |

### Resultados

| Verificación | Resultado |
| --- | --- |
| `tsc --noEmit`, `oxlint --type-aware` | Sin errores |
| Pruebas unitarias | 314 en 71 archivos |
| `nest build` | Correcto |
| `npm audit --omit=dev --audit-level=high` | Sin vulnerabilidades altas |
| E2E en PostgreSQL 17 portable | 51/51 en 7 archivos |

Dos observaciones del entorno local, sin relación con el cambio:

- La prueba que renderiza dos PNG del estado de cuenta superó los 5 s por defecto al correr con toda la suite en paralelo (pasa sola). Se le dio un límite propio de 30 s.
- Ejecutado solo, `weighing.e2e-spec.ts` agota los 10 s del `beforeAll` en una base nueva porque aplica las 28 migraciones; en la suite completa y con más tiempo pasa.

### Diagramas

`solid-modulo-pesaje.svg` y `nivel4-clases.svg` usan ahora los nombres del código (casos de uso, contratos y adaptadores PostgreSQL). Se editó el SVG directamente porque el generador `build_solid_weighing_view.py` requiere Python, que no está instalado en este equipo; sus PNG se renderizaron con Chrome sin interfaz a 1800 × 1940 y 1800 × 2070.

## Pendiente

- Actualizar el generador Python de los diagramas para que no sobrescriba estos cambios si se vuelve a ejecutar.
