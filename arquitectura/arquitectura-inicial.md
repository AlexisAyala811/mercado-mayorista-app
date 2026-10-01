# Arquitectura Inicial en Capas

La arquitectura inicial de la aplicación móvil de gestión comercial para mayoristas de papa se organiza en tres capas principales: presentación, lógica de negocio y datos. Esta separación permite distribuir responsabilidades y facilitar el mantenimiento, evolución y crecimiento del sistema.

## Diagrama de arquitectura

```mermaid
flowchart TD

%% =========================
%% ACTORES
%% =========================
subgraph ACTORES["ACTORES"]
    Mayorista["Mayorista"]
    Encargado["Encargado"]
end

%% =========================
%% PRESENTACIÓN
%% =========================
subgraph PRESENTACION["1. PRESENTACIÓN"]
    AppMovil["Aplicación móvil / Tablet Android"]
end

%% =========================
%% LÓGICA DE NEGOCIO
%% =========================
subgraph NEGOCIO["2. LÓGICA DE NEGOCIO"]
    Usuarios["Usuarios y roles"]
    Recepcion["Recepción y pesaje"]
    Compras["Compras y costos"]
    Inventario["Inventario"]
    Ventas["Ventas y despachos"]
    Cuentas["Cuentas, pagos y cobranzas"]
    Estiba["Flete y estiba"]
    Reportes["Reportes"]
    Analitica["Analítica e IA"]
end

%% =========================
%% DATOS
%% =========================
subgraph DATOS["3. DATOS"]
    Local["Almacenamiento local"]
    PostgreSQL["Base de datos PostgreSQL"]
end

%% =========================
%% RELACIONES
%% =========================
Mayorista --> AppMovil
Encargado --> AppMovil

AppMovil --> Usuarios
AppMovil --> Recepcion
AppMovil --> Compras
AppMovil --> Inventario
AppMovil --> Ventas
AppMovil --> Cuentas
AppMovil --> Estiba
AppMovil --> Reportes
AppMovil --> Analitica

Usuarios --> PostgreSQL
Recepcion --> Local
Recepcion --> PostgreSQL
Compras --> PostgreSQL
Inventario --> PostgreSQL
Ventas --> PostgreSQL
Cuentas --> PostgreSQL
Estiba --> PostgreSQL
Reportes --> PostgreSQL
Analitica --> PostgreSQL

Local --> PostgreSQL
