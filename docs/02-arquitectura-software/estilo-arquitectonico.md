# Estilo arquitectónico

> **Proyecto:** Gestión mayorista de papa · **Versión:** 1.3 · **Actualización:** 13 de octubre de 2026

## Estilo seleccionado

Se utiliza un **monolito modular organizado en capas** para el backend. La API y los módulos comerciales se ejecutan juntos dentro de una misma aplicación NestJS, con TypeScript y PostgreSQL como base transaccional central. El cliente Android es una aplicación separada que se comunica mediante REST versionada.

Este estilo facilita coordinar compras, ventas, cuentas, caja y costos sin distribuir sus transacciones entre servicios independientes. Se adapta a la capacidad operativa del proyecto y permite conservar responsabilidades modulares. El historial guarda sacos, cantidades y pesos por operación, sin inventario ni saldo de mercadería.

## Diagrama del estilo

![Monolito modular en capas aplicado a Mercado](../../img/estilo-arquitectonico.png)

Fuente editable: [estilo-arquitectonico.svg](../../img/fuentes-svg/estilo-arquitectonico.svg).

## Capas del backend

| Capa | Responsabilidad | Elementos del proyecto |
| --- | --- | --- |
| Presentación | Recibir solicitudes, autenticar/autorizar, validar estructura y responder JSON | Controladores REST, DTO, guardas de sesión/rol y manejo uniforme de errores |
| Negocio y aplicación | Coordinar operaciones, verificar invariantes y calcular resultados | Servicios de identidad, recepción, compra, venta, cuentas, flete, estiba, reportes y auditoría; funciones de dominio |
| Datos | Persistir y consultar hechos confirmados con consistencia | Repositorios TypeORM, entidades, DataSource, restricciones y migraciones PostgreSQL |

Sesión, aislamiento por negocio, auditoría, errores y trazas son responsabilidades transversales. Ocultar un botón no sustituye la autorización central. Los saldos financieros y los cálculos confirmados pertenecen a la API, no al estado de la pantalla.

## Organización modular

| Grupo mostrado | Módulos o responsabilidades | Historias relacionadas |
| --- | --- | --- |
| Identidad | Acceso, usuarios, sesión y reemplazos | HU07, HU12 |
| Recepción y compras | Pesaje, tara, precio, flete y liquidación | HU01, HU02 |
| Ventas y cuentas | Despachos, cuotas, abonos, caja y costos de estiba | HU03, HU04, HU08, HU09 |
| Reportes y auditoría | Historial, comprobantes, responsables, avisos y analítica | HU06, HU10, HU11, HU13, HU14 |

Las agrupaciones de la tabla resumen responsabilidades para facilitar lectura; son agrupaciones de responsabilidades y no sustituyen las carpetas actuales. La cola offline HU05 pertenece al cliente Android y reenvía órdenes idempotentes a los mismos contratos centrales.

## Reglas de interacción

1. La presentación delega operaciones a los servicios; no implementa cálculos financieros críticos.
2. Los servicios coordinan reglas, autorización y transacciones; el acceso a datos utiliza los mecanismos de persistencia central.
3. Las colaboraciones entre compra y cuenta/caja conservan una confirmación atómica. El UUID permite recuperar una orden ya confirmada sin repetir efectos.
4. Las correcciones y anulaciones mantienen origen, motivo y compensaciones; no borran hechos comerciales o financieros confirmados.
5. PostgreSQL recibe conexiones del servidor. El cliente usa HTTPS/JSON en despliegue; no abre conexiones SQL.
6. Los módulos backend se despliegan juntos. Es posible ejecutar varias instancias completas por necesidad de carga, sin convertir cada módulo en un servicio separado.

## Límites actuales y evolución

El código actual usa repositorios ORM y DataSource dentro de varios servicios y accede a entidades de dominios relacionados. Por ello, la documentación no afirma que cada módulo lea únicamente sus tablas, que toda colaboración ya ocurra por una interfaz pública aislada ni que la aplicación sea una arquitectura hexagonal completa. Esas separaciones requieren evolución y pruebas de atomicidad y regresión.

La vista muestra el alcance objetivo sin existencias; una imagen no certifica que la adaptación funcional del código y sus datos históricos ya haya convergido. No eliminar migraciones o información financiera para ajustarse al diagrama.

## Sistemas externos y persistencia de archivos

El backend conserva comprobantes internos PDF. Android comparte el archivo descargado mediante una aplicación elegida por el usuario. Estas responsabilidades no incorporan una pasarela de pagos, ERP, courier o facturación electrónica. El canal externo de avisos HU14 permanece por definir. La analítica se habilita según criterios aprobados, datos suficientes y evaluación verificable.

## Justificación y consecuencias

| Aspecto | Beneficio | Costo o condición |
| --- | --- | --- |
| Despliegue conjunto | Menor complejidad inicial y operación uniforme | Cambios de módulos se publican con el backend completo |
| Base transaccional central | Consistencia entre operación y saldo financiero | Mantener transacciones, restricciones y pruebas concurrentes |
| Organización modular | Responsabilidades reconocibles y evolución gradual | Vigilar acoplamientos entre servicios y entidades |
| Cliente separado | Captura táctil y continuidad offline | Resolver reintentos, permisos vencidos y conflictos |

DA02, DA06, AC03, AC07 y R07 sustentan el estilo. Microservicios se evaluarían únicamente ante una necesidad demostrada de aislamiento o despliegue independiente, con una decisión SDD. El enfoque de arquitectura limpia del cliente explica dependencias internas; no cambia por sí mismo esta unidad de despliegue del backend.

## Organización vigente de los datos comerciales

Proveedores, compradores, variedades, vehículos y transportistas son datos de recepción, compras y ventas. No constituyen módulos independientes. Recepción conserva proveedor, variedad, vehículo y conductor del cargamento; compras utiliza esos datos para la liquidación; ventas conserva comprador, destino y transporte del despacho. RF03–RF05 mantienen su trazabilidad dentro de esas operaciones. Esta organización es el diseño vigente; no afirma una reorganización ya implementada del código.
