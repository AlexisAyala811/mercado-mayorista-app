# Decisiones Arquitectónicas

Las decisiones arquitectónicas establecen las principales elecciones técnicas y estructurales adoptadas para la aplicación móvil de gestión comercial de mayoristas de papa.

Cada decisión responde a los requisitos funcionales, atributos de calidad, restricciones y drivers arquitectónicos identificados previamente.

---

## AD-01. Aplicación móvil orientada a tablet Android

| Elemento | Descripción |
|---|---|
| Decisión | La solución cliente se desarrollará como una aplicación móvil orientada principalmente a tablets Android. |
| Motivo | Las operaciones se realizan directamente en el puesto del mercado durante la recepción, pesaje, compra y venta de mercadería. |
| Drivers relacionados | DA01, DA04 |
| Consecuencia positiva | Permite una interfaz táctil adaptada al trabajo operativo del mayorista. |
| Consideración | La interfaz deberá diseñarse para uso rápido, botones visibles y captura continua de información. |

---

## AD-02. Arquitectura de backend como monolito modular

| Elemento | Descripción |
|---|---|
| Decisión | El backend se implementará inicialmente como un monolito modular. |
| Motivo | El sistema posee múltiples dominios relacionados, pero la escala inicial no justifica la complejidad de microservicios. |
| Drivers relacionados | DA06, DA08 |
| Consecuencia positiva | Reduce complejidad operativa y facilita desarrollo, pruebas y despliegue. |
| Consideración | Los módulos deberán mantener límites claros para permitir una futura separación si el crecimiento lo requiere. |

Los módulos principales serán:

- Usuarios y roles.
- Recepción y pesaje.
- Compras.
- Inventario.
- Ventas y despachos.
- Cuentas por pagar y cobrar.
- Flete y estiba.
- Reportes.
- Analítica e inteligencia artificial.

---

## AD-03. Arquitectura en capas

| Elemento | Descripción |
|---|---|
| Decisión | La solución mantendrá separación entre presentación, lógica de negocio y acceso a datos. |
| Motivo | Las reglas de pesaje, flete, estiba, pagos, saldos e inventario no deben depender directamente de la interfaz de usuario. |
| Drivers relacionados | DA06 |
| Consecuencia positiva | Mejora la mantenibilidad, facilita pruebas y reduce el acoplamiento. |
| Consideración | La capa de presentación no deberá contener reglas críticas de negocio. |

La organización general será:

```text
Presentación
      ↓
Lógica de negocio
      ↓
Persistencia / Datos
