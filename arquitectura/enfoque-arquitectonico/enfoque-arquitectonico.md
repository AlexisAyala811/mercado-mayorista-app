# Enfoque Arquitectónico

## Resumen del enfoque arquitectónico

| Elemento | Descripción aplicada al proyecto |
|---|---|
| **Patrón / enfoque arquitectónico** | Clean Architecture con enfoque modular, offline-first y API-first. |
| **Objetivo** | Separar responsabilidades y controlar las dependencias hacia el dominio del negocio para facilitar mantenimiento, pruebas y evolución del sistema. |
| **¿Qué problema resuelve?** | Evita el acoplamiento entre la aplicación móvil, las reglas de negocio y tecnologías externas como almacenamiento local, API REST y PostgreSQL. |
| **Capas definidas** | Presentación, Aplicación, Dominio e Infraestructura. |
| **Beneficios** | Facilita el mantenimiento, las pruebas, la operación sin conexión, la modularidad y la evolución progresiva del sistema sin afectar innecesariamente las reglas del negocio. |

## Diagrama del enfoque arquitectónico

```mermaid
flowchart TB

    %% ACTORES
    subgraph ACTORES["ACTORES"]
        Mayorista["Mayorista"]
        Encargado["Encargado"]
    end

    %% PRESENTACIÓN
    subgraph P["1. PRESENTACIÓN"]
        Mobile["Aplicación móvil / Tablet Android"]
    end

    %% APLICACIÓN
    subgraph A["2. APLICACIÓN"]
        CasosUso["Casos de uso"]
        Sync["Coordinación de sincronización"]
    end

    %% DOMINIO
    subgraph D["3. DOMINIO"]
        Recepcion["Recepción y pesaje"]
        Compras["Compras"]
        Inventario["Inventario"]
        Ventas["Ventas y despachos"]
        Cuentas["Pagos y cobranzas"]
        Flete["Flete y estiba"]
    end

    %% INFRAESTRUCTURA
    subgraph I["4. INFRAESTRUCTURA"]
        Local["Almacenamiento local"]
        API["API REST"]
        Backend["Backend modular"]
        DB["PostgreSQL"]
        Analytics["Analítica e IA"]
    end

    Mayorista --> Mobile
    Encargado --> Mobile

    Mobile --> CasosUso
    CasosUso --> Recepcion
    CasosUso --> Compras
    CasosUso --> Inventario
    CasosUso --> Ventas
    CasosUso --> Cuentas
    CasosUso --> Flete

    CasosUso --> Sync
    Sync --> Local
    Sync --> API

    API --> Backend
    Backend --> DB
    DB --> Analytics