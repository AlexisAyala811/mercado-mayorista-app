# Principios de diseño

> **Proyecto:** Gestión comercial mayorista de papa · **Módulo de referencia:** Recepción y compras (ingreso de pesos) · **Versión:** 2.1 · **Actualización:** 30 de octubre de 2026

## Objetivo

Aplicar SOLID al registro del peso de cada saco de papa, separando captura, reglas de bruto/tara/neto, coordinación, persistencia y auditoría. La captura pertenece a HU01 y la continuidad sin conexión a HU05. Los pesos son datos de cada cargamento: no producen inventario ni saldo de mercadería.

## SOLID en el ingreso de pesos

![Principios SOLID aplicados al ingreso de pesos de papa](../../../img/solid-modulo-pesaje.png)

Fuente editable: [solid-modulo-pesaje.svg](../../../img/fuentes-svg/solid-modulo-pesaje.svg).

Desde el 30 de octubre de 2026 el diseño objetivo está implementado para el registro de un saco nuevo: reglas puras, modelo del saco, caso de uso que depende de contratos y adaptador PostgreSQL conectado en la composición del módulo. El diagrama conserva los nombres en español de la propuesta; la tabla indica el nombre en el código.

| Principio | Aplicación al ingreso de pesos | Elementos y estado |
| --- | --- | --- |
| S · Responsabilidad única | El controlador traduce entrada; las reglas calculan neto; el caso de uso coordina; persistencia y auditoría conservan hechos | `ReceptionController`; reglas `calculateSackWeights`; modelo `SackWeight` («PesoSaco»); caso de uso `RegisterSackWeight` («RegistrarPesoCasoUso»). Implementado |
| O · Abierto/cerrado | Agregar otra implementación del contrato sin modificar reglas de peso | `PostgresWeighingUnitOfWork` en producción y un adaptador en memoria en las pruebas, sin tocar el caso de uso. No habilita una balanza integrada, fuera del MVP |
| L · Sustitución de Liskov | Implementaciones intercambiables preservan precisión, UUID, aislamiento y respuestas/errores del contrato | Las mismas garantías se prueban con memoria (contrato) y con PostgreSQL (e2e: reenvíos simultáneos y rollback). Memoria no acredita bloqueos ni durabilidad |
| I · Segregación de interfaces | El registro usa capacidades pequeñas de pesajes, unidad de trabajo y auditoría | `WeighingRepository` («RepositorioPesajes»), `WeighingUnitOfWork` («UnidadTrabajoPesaje»), `WeighingAudit` («AuditoriaPesaje»); no requieren caja, reportes ni inventario |
| D · Inversión de dependencias | El caso de uso recibe contratos, y la composición conecta adaptadores | `RegisterSackWeight` no conoce TypeORM; `reception.module.ts` lo construye con `PostgresWeighingUnitOfWork` (`useFactory`). Corrección, anulación y cierre siguen en `WeighingService` con `DataSource`; migrarlos es evolución |

## Recorrido del registro

1. Mayorista o Encargado con reemplazo vigente selecciona variedad, calidad y procedencia, e ingresa el peso bruto y la tara cuando corresponde.
2. La aplicación valida la captura y conserva la orden pendiente si falla la conexión; ese estado no equivale a confirmación central.
3. El controlador central valida identidad, permisos, negocio y estructura de entrada; delega la operación de pesaje.
4. La unidad de trabajo central recupera un resultado existente por UUID o valida recepción, estado, variedad y versión antes de registrar un saco nuevo.
5. Las reglas calculan neto = bruto − tara con tres decimales. El detalle, secuencia, responsable y auditoría se confirman juntos.
6. El cliente muestra el resultado confirmado. Un conflicto requiere revisión; una repetición no agrega otro saco.

## Reglas del dominio

| Regla | Comportamiento esperado |
| --- | --- |
| Peso bruto | Mayor que cero; entrada decimal válida con hasta tres decimales |
| Tara | Mayor o igual a cero y menor que el bruto; si se omite se considera cero |
| Peso neto | Diferencia positiva calculada de forma determinista |
| Variedad | Debe pertenecer a la recepción que se está pesando |
| Estado de recepción | Nuevos sacos solo mientras la recepción permita captura; un cierre no se sobrescribe |
| Versión y UUID | Detectar concurrencia y conservar un único resultado de la orden |
| Corrección | Autorización y trazabilidad según estado; no borrar hechos confirmados |
| Totales | Cantidad de sacos y peso por variedad/cargamento; nunca saldo de almacén |

Ejemplo: bruto **52,500 kg** y tara **0,500 kg** producen **52,000 kg netos**. Una tara de **52,500 kg** con el mismo bruto se rechaza porque el neto sería cero.

## Evidencia en el código actual

| Archivo del proyecto técnico | Responsabilidad constatada |
| --- | --- |
| `backend/src/reception/reception.controller.ts` | Entrada `addSack` y delegación de la operación |
| `backend/src/reception/http/weighing.dto.ts` | UUID, versión, variedad, peso bruto y tara; validación de formato |
| `backend/src/reception/weighing.service.ts` | `add` delega en el caso de uso; corrección, anulación y cierre |
| `backend/src/common/domain/sack-weights.ts` | Reglas de bruto, tara y neto (`calculateSackWeights`), función pura |
| `backend/src/reception/application/sack-weight.ts` | Modelo del saco `SackWeight` |
| `backend/src/reception/application/register-sack-weight.ts` | Caso de uso `RegisterSackWeight` y contratos |
| `backend/src/reception/infrastructure/postgres-weighing.ts` | Adaptador PostgreSQL: transacción, bloqueos y auditoría |
| `backend/src/common/domain/fixed-decimal.ts` | Conversión decimal determinista usada por las reglas |
| `mercado-app/src/domain/reception/reception.ts` | Modelo del saco y representación de resultados para la interfaz |
| `mercado-app/src/services/api/reception-api.ts` | Envío de `addSack` al contrato central |

La extracción se hizo sin cambiar el contrato HTTP ni la base de datos; conserva la transacción y la idempotencia. El adaptador en memoria vive solo en las pruebas. Evidencia: [verificación del refactor](../../sdd/verificacion-pesaje-solid-2026-10-30.md).

## Verificación de principios y contratos

- Probar bruto positivo, tara cero/omitida, tara igual o mayor que bruto, formato inválido y precisión de tres decimales.
- Reenviar la misma orden cinco veces y comprobar un único saco y una sola auditoría de creación; reutilizar su UUID con otro peso debe responder `409`.
- Rechazar variedad ajena, recepción cerrada, versión antigua o reemplazo revocado sin escrituras parciales.
- Comprobar rollback si falla auditoría/persistencia; mantener detalle y evento en una unidad de trabajo.
- Ejecutar pruebas de contrato al sustituir adaptadores y pruebas PostgreSQL para concurrencia e integridad real.
- Validar recuperación offline y captura táctil; mostrar pendiente, confirmado, error y revisión sin perder pesos.

## Principios transversales

Conservar la separación por usuario y negocio, registros trazables, estados accesibles y componentes visuales coherentes con Figma. Cada interfaz o patrón nuevo responde a una necesidad concreta y llega con su contrato y sus pruebas. El backend sigue siendo un monolito modular en capas.
