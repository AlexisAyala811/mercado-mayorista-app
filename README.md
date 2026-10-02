# Mercado Mayorista

Aplicación móvil orientada a la gestión comercial de comerciantes mayoristas de papa.

## Descripción

El sistema busca centralizar y organizar las principales operaciones comerciales del mayorista, reemplazando registros manuales y dispersos por una solución digital.

La aplicación permitirá gestionar procesos como:

- Recepción de cargamentos.
- Pesaje saco por saco.
- Compras.
- Ventas y despachos.
- Inventario.
- Fletes y estiba.
- Pagos y cobranzas.
- Cuentas por pagar.
- Cuentas por cobrar.
- Reportes.
- Analítica e inteligencia artificial.

La solución estará orientada principalmente a tablets Android y deberá permitir el registro temporal de operaciones sin conexión a Internet, sincronizando la información posteriormente.

## Usuarios del sistema

- **Mayorista:** usuario principal con acceso completo al sistema.
- **Encargado:** usuario con permisos limitados para registrar operaciones autorizadas, como pesajes, compras y ventas.

## Arquitectura

El proyecto utiliza un enfoque basado en:

- Clean Architecture.
- Monolito modular.
- Arquitectura en capas.
- Enfoque offline-first.
- API REST.
- Separación de responsabilidades.
- Evolución progresiva de analítica e inteligencia artificial.

## Estructura del repositorio

```text
mercado-mayorista-app/
│
├── análisis-del-sistema/
│   ├── 01-actores.md
│   ├── 02-historias-de-usuario.md
│   ├── 03-requisitos-funcionales.md
│   ├── 04-atributos-de-calidad.md
│   ├── 05-restricciones.md
│   └── 06-drivers-arquitectonicos.md
│
├── arquitectura/
│   ├── enfoque-arquitectonico/
│   ├── arquitectura-inicial.md
│   ├── decisiones-arquitectonicas.md
│   └── estilo-arquitectonico.md
│
├── boilerplate-main/
│
└── README.md
