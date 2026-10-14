# Diseño interno de módulos

> **Proyecto:** Gestión comercial mayorista de papa · **Entregable:** 1 · **Versión:** 1.2

| Componente | Responsabilidad | Corte / requisitos |
| --- | --- | --- |
| Identidad | Sesiones, roles, negocio y reemplazos | 001; RF01–02 |
| Recepción y pesaje | Proveedor, variedades, transporte, sacos, bruto/tara/neto, corrección y cierre | 002; RF03–06B |
| Compras | Precio, flete, descuentos y liquidación | 002; RF07, RF14 |
| Ventas y devoluciones | Despacho y compensación comercial | 003; RF10–12 |
| Cuentas y caja | Cuotas, pagos, cobros y reversos | 004; RF13–15 |
| Flete y estiba | Costos y liquidación de grupos | 004; RF15 |
| Cola y sincronización | Órdenes locales, dependencias y conflictos | 005; RF21 |
| Auditoría | Hechos anexables y consulta protegida | 005; RF22 |
| Reportes y comprobantes | Resumen de importes, costos, precios y PDF interno | 006; RF12, RF16–18 |
| Analítica predictiva | Estimaciones condicionadas a CL-08 | 007; RF19–20 |

## Límites y datos

Toda consulta central recibe el negocio desde identidad autenticada. Las órdenes llevan UUID y, cuando corresponda, versión del agregado. Recepción conserva saco/variedad/bruto/tara/neto y estados; compras producen liquidación y cuenta o caja; ventas conservan las cantidades despachadas y generan cuenta o cobro. Las operaciones comerciales y financieras se confirman juntas. No se calcula mercadería restante ni se valida una venta contra compras previas.

Las anulaciones y devoluciones conservan el origen y generan compensaciones. No borrar hechos confirmados. Pagos superiores al saldo se rechazan; las cuotas y saldos se calculan en dominio y se revalidan en servidor. Peso usa tres decimales y dinero unidades menores, con redondeo mitad hacia arriba.

El cliente organiza `app`, `features`, `domain`, `data`, `services`, `ui`. La API tiene módulos `identity`, `reception`, `purchase`, `sales`, `accounts`, `freight`, `stowage`, `audit`, `reports` y persistencia con migraciones. El estado de pantalla no sustituye el resultado central.

Errores: sesión inválida bloquea acceso; permiso denegado conserva sesión válida; conflicto 409 pide revisión; falla de red mantiene pendiente. La recuperación no envía operaciones de otro usuario o negocio.

Para contratos y aceptación completos consultar los planes 001–006 en fuentes (documentación compartida del proyecto).

## Módulo de referencia: liquidación de compra

Se selecciona Compras porque relaciona pesaje, flete y obligaciones. Es la operación donde una diferencia de cálculo o un reintento duplicado puede alterar la liquidación y los saldos financieros.

### Estructura constatada en el proyecto técnico

```text
mercado-api/src/
├── purchase/
│   ├── purchase.module.ts
│   ├── purchase.controller.ts
│   ├── purchase.service.ts
│   ├── purchase.service.spec.ts
│   ├── http/settle-purchase.dto.ts
│   └── entities/purchase-settlement.entity.ts
├── common/domain/
│   ├── commercial-calculation.ts
│   ├── fixed-decimal.ts
│   └── proportional-allocation.ts
├── reception/
├── accounts/
├── freight/
└── audit/
```

| Archivo o grupo | Responsabilidad | Dependencia actual |
| --- | --- | --- |
| Controller | Recibir contrato, sesión e identificador y delegar | Servicio de compra, DTO y guardas |
| DTO | Representar y validar la entrada | Validación de frontera |
| PurchaseService | Idempotencia, reglas y transacción comercial | DataSource, AuditService y entidades relacionadas |
| common/domain | Cálculo decimal, importes y reparto | Lógica determinista reutilizable |
| Entidades/migraciones | Estructura y restricciones persistentes | ORM y PostgreSQL |
| Module | Composición e inyección | Dependencias concretas registradas |

### Reglas de dependencia y su estado

| Regla | Estado y verificación |
| --- | --- |
| Pantallas delegan operaciones a servicios y dominio | Revisar imports y reglas de lint del cliente |
| Cálculos no dependen de UI | Revisar funciones de common/domain y pruebas |
| Controladores no calculan líquido ni saldo | Revisar Controller → Service |
| Orquestación conserva atomicidad | Compras usa transacción y varias entidades |
| Aplicación totalmente independiente del ORM | Objetivo de evolución; no cumplido por PurchaseService actual |

### Reglas comerciales verificables

| Regla | Comportamiento esperado |
| --- | --- |
| Precisión | Peso con tres decimales y dinero en unidades menores; redondeo aprobado |
| Flete | Base por kg o por saco según acuerdo |
| Liquidación | Importe bruto menos flete, adelantos y descuentos |
| Pago | Contado o cuotas con saldo y vencimiento trazables |
| Reintento | UUID repetido devuelve resultado previo sin nuevos efectos |
| Concurrencia | Versión desactualizada produce conflicto y revisión |
| Corrección | Compensación con motivo y origen; no borrar hechos |

### Ejemplo de cálculo

Compra ilustrativa por kg: 100 kg netos × S/2,00 = S/200,00 bruto. Flete de S/0,10/kg = S/10,00; adelanto S/20,00 y descuento S/5,00. Líquido al proveedor: S/165,00. Este ejemplo verifica RF07; no define una tarifa fija ni sustituye el acuerdo comercial.

### Flujo y código de referencia

La secuencia y clases concretas están en [C4 nivel 4](../../04-modelo-c4/Nivel4-DiagramadeCodigo.md). Esquema ilustrativo independiente del framework:

```text
validar identidad, negocio, permiso y entrada
iniciar transacción
  bloquear clave negocio + UUID
  si existe resultado de la orden: devolver resultado previo
  validar versión y estado de recepción
  calcular bruto, flete, descuentos y líquido con precisión aprobada
  guardar liquidación y efectos de operaciones/cuentas/caja/flete
  registrar auditoría
confirmar transacción y devolver resultado central
```

El esquema explica responsabilidades; no reemplaza el código ejecutable ni supone puertos nuevos. Las pruebas deben cubrir rollback, autorización, precisión, cuotas, reintento y concurrencia.

## Imágenes del proyecto

![Diagrama paquetes-modulo-compras de gestión mayorista de papa](../../../img/paquetes-modulo-compras.png)

![Diagrama nivel4-clases de gestión mayorista de papa](../../../img/nivel4-clases.png)

![Diagrama nivel4-secuencia de gestión mayorista de papa](../../../img/nivel4-secuencia.png)

Los diagramas representan las responsabilidades descritas en este documento. Cada imagen dispone de una fuente SVG editable en `img/fuentes-svg`, incluida la secuencia. Las fuentes SVG permiten editar los diagramas.

La secuencia muestra dos alternativas: recuperar una liquidación ya confirmada para el UUID, o validar y persistir una orden nueva. La primera omite el cálculo y las nuevas escrituras.

## Estado de convergencia técnica

Esta vista representa el alcance decidido el 7 de octubre de 2026. La implementación requiere verificaciones de convergencia contra el alcance vigente; no se incluye un módulo de existencias o valoración por lote en esta arquitectura. Las clases y rutas existentes son referencias técnicas, no evidencia de que esa adaptación ya esté implementada. Los reportes no calcularán un margen por existencias o valoración de lotes; mostrarán importes y costos comerciales registrados.

## Flujos complementarios y límites

HU07 valida credenciales y restaura o revoca sesión. HU12 autoriza/revoca un reemplazo de máximo 24 horas, con revalidación central al operar. HU08 registra un pago/cobro idempotente y actualiza la cuenta/caja; no confundir con la consulta HU04. HU09 liquida trabajo de estiba por grupo. HU10 comparte un PDF interno confirmado; no incluye facturación electrónica. HU11 filtra historial de operaciones; HU13 consulta acciones auditadas con usuario y motivo. HU14 presenta vencimientos y conserva como pendiente cualquier canal externo sin definir.

Validaciones: dinero positivo y no superior al saldo; vencimientos asociados a la cuenta; filtros y archivos aislados por negocio; auditoría de correcciones inmutable; solo el Mayorista accede a las historias complementarias HU08–HU14. Definir canal, frecuencia y política de recordatorios antes de añadir una integración externa.

## Organización vigente de los datos comerciales

Proveedores, compradores, variedades, vehículos y transportistas son datos de recepción, compras y ventas. No constituyen módulos independientes. Recepción conserva proveedor, variedad, vehículo y conductor del cargamento; compras utiliza esos datos para la liquidación; ventas conserva comprador, destino y transporte del despacho. RF03–RF05 mantienen su trazabilidad dentro de esas operaciones. Esta organización es el diseño vigente; no afirma una reorganización ya implementada del código.
