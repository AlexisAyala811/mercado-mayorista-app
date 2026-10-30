# Principios SOLID para ingreso de pesos

El usuario solicita adaptar la vista SOLID al ingreso de pesos de papa, el 8 de octubre de 2026. La referencia pasa de liquidación de compras al registro de cada saco (HU01 y continuidad HU05).

Se verifica código existente de ReceptionController, AddSackDto, WeighingService, calculateWeights, AuditService y modelos del cliente. El diagrama identifica la extracción propuesta de caso de uso, reglas y puertos de pesajes, unidad de trabajo y auditoría. No afirma que las clases propuestas ya existan ni que DIP completo esté implementado.

La eventual extracción debe conservar autorización, negocio, UUID, recepción, variedad, versión, secuencia, bruto/tara/neto y auditoría transaccional. La memoria solo apoya contratos; PostgreSQL sigue siendo necesario para comprobar concurrencia y atomicidad. Sin balanzas integradas ni inventario añadidos al alcance.

Se actualiza principios-de-diseño.md y se sustituye solid-modulo-compras por solid-modulo-pesaje en PNG/SVG. No se introducen Mermaid ni cambios operativos. Verificación documental: revisión visual, XML SVG, integridad PNG, vínculos y diff. Implementar extracciones requiere plan/tareas y regresión mediante SDD.
