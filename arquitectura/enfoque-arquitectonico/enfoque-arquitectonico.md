# Enfoque Arquitectónico

## Resumen del enfoque arquitectónico

| Elemento | Descripción aplicada al proyecto |
|---|---|
| **Patrón / enfoque arquitectónico** | Clean Architecture con enfoque modular, offline-first y API-first. |
| **Objetivo** | Separar las responsabilidades del sistema y controlar las dependencias hacia el dominio del negocio, facilitando la evolución, el mantenimiento y las pruebas de la aplicación. |
| **¿Qué problema resuelve?** | Evita el acoplamiento entre la interfaz móvil, las reglas de negocio y las tecnologías externas. Permite modificar procesos como pesaje, flete, estiba, pagos, cobranzas, inventario o sincronización sin afectar innecesariamente otras partes del sistema. |
| **Capas definidas** | Presentación, Aplicación, Dominio e Infraestructura. |
| **Beneficios** | • Facilita el mantenimiento y las pruebas unitarias. <br> • Permite trabajar con conectividad irregular mediante almacenamiento local y sincronización posterior. <br> • Separa las reglas del negocio de React Native, PostgreSQL y otros componentes técnicos. <br> • Reduce el acoplamiento entre módulos como compras, ventas, inventario, cuentas, flete y estiba. <br> • Facilita la evolución progresiva de la analítica e inteligencia artificial. |

## Diagrama del enfoque arquitectónico

```mermaid
flowchart TD

    %% ACTORES
    Mayorista["Mayorista"]
    Encargado["Encargado"]

    %% PRESENTACIÓN
    subgraph PRESENTACION["Presentación"]
        UI["Aplicación móvil / Tablet Android"]
    end

    %% APLICACIÓN
    subgraph APLICACION["Aplicación"]
        CasosUso["Casos de uso:
- Registrar cargamento
- Registrar pesaje
- Registrar compra
- Registrar venta
- Registrar pago
- Consultar saldos
- Consultar reportes"]
    end

    %% DOMINIO
    subgraph DOMINIO["Dominio"]
        Reglas["Reglas de negocio:
- Pesaje
- Flete
- Estiba
- Compras
- Ventas
- Inventario
- Cobranzas
- Pagos
- Saldos"]
    end

    %% INFRAESTRUCTURA
    subgraph INFRAESTRUCTURA["Infraestructura"]
        Local["Almacenamiento local"]
        API["API REST /api/v1"]
        Backend["Backend modular"]
        BD["PostgreSQL"]
        IA["Analítica e IA"]
    end

    Mayorista --> UI
    Encargado --> UI

    UI --> CasosUso
    CasosUso --> Reglas
    Reglas --> Local
    Reglas --> API
    API --> Backend
    Backend --> BD
    BD --> IA
