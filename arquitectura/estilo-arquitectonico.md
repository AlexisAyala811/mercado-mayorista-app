# Estilo Arquitectónico

La solución adoptará un estilo arquitectónico basado en un **monolito modular organizado en capas**.

Este enfoque permite mantener una estructura sencilla para la primera versión del sistema, separando las responsabilidades principales y evitando incorporar una arquitectura distribuida más compleja antes de que exista una necesidad real.

## Estilo seleccionado

**Monolito modular con arquitectura en capas.**

La aplicación se organizará en tres capas principales:

| Capa | Responsabilidad |
|---|---|
| Presentación | Gestionar la interacción de los usuarios con la aplicación móvil y enviar las solicitudes al backend mediante la API REST. |
| Lógica de negocio | Aplicar las reglas relacionadas con recepción, pesaje, compras, ventas, inventario, pagos, cobranzas, flete, estiba, usuarios, reportes y analítica. |
| Datos | Gestionar la persistencia local y central de la información, incluyendo el almacenamiento temporal en el dispositivo y PostgreSQL como base de datos principal. |

## Diagrama del estilo arquitectónico

```mermaid
flowchart TD

    subgraph PRESENTACION["1. PRESENTACIÓN"]
        App["Aplicación móvil / Tablet Android"]
        API["API REST"]
    end

    subgraph NEGOCIO["2. LÓGICA DE NEGOCIO"]
        Usuarios["Usuarios y roles"]
        Recepcion["Recepción y pesaje"]
        Compras["Compras y costos"]
        Inventario["Inventario"]
        Ventas["Ventas y despachos"]
        Cuentas["Pagos, cobranzas y saldos"]
        Flete["Flete y estiba"]
        Reportes["Reportes"]
        Analitica["Analítica e IA"]
    end

    subgraph DATOS["3. DATOS"]
        Local["Almacenamiento local"]
        PostgreSQL["PostgreSQL"]
    end

    App --> API
    API --> Usuarios
    API --> Recepcion
    API --> Compras
    API --> Inventario
    API --> Ventas
    API --> Cuentas
    API --> Flete
    API --> Reportes
    API --> Analitica

    Usuarios --> PostgreSQL
    Recepcion --> PostgreSQL
    Compras --> PostgreSQL
    Inventario --> PostgreSQL
    Ventas --> PostgreSQL
    Cuentas --> PostgreSQL
    Flete --> PostgreSQL
    Reportes --> PostgreSQL
    Analitica --> PostgreSQL

    App --> Local
    Local --> API