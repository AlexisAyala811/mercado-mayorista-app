# Primer entregable · Arquitectura de Mercado mayorista

Documentación de la aplicación móvil de gestión comercial para mayoristas de papa, alineada con la propuesta vigente y las decisiones aprobadas del proyecto.

## Análisis de sistema

- [Actores](docs/01-analisis-de-sistema/01-actores.md)
- [Historias del usuario](docs/01-analisis-de-sistema/02-historias-del-usuario.md)
- [Requisitos funcionales](docs/01-analisis-de-sistema/03-requisitos-funcionales.md)
- [Atributos de calidad](docs/01-analisis-de-sistema/04-atributos-de-calidad.md)
- [Restricciones](docs/01-analisis-de-sistema/05-restricciones.md)
- [Drivers arquitectónicos](docs/01-analisis-de-sistema/06-driver-arquitectonicos.md)
- [Decisiones arquitectónicas](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md)
- [Escenarios de calidad](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md)

## Arquitectura de software

- [Arquitectura inicial](docs/02-arquitectura-software/arquitectura-inicial.md)
- [Componentes arquitectónicos](docs/02-arquitectura-software/componentes-arquitectonicos.md)
- [Enfoque arquitectónico](docs/02-arquitectura-software/enfoque-aquitectonico.md)
- [Estilo arquitectónico](docs/02-arquitectura-software/estilo-arquitectonico.md)

## Diseño interno

- [Diseño interno de módulos](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md)
- [Patrones de diseño](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md)
- [Principios de diseño](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md)

## Modelo C4

- [Nivel 1: contexto](docs/04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md)
- [Nivel 2: contenedores](docs/04-modelo-c4/Nivel2-DiagramadeContenedores.md)
- [Nivel 3: componentes](docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md)
- [Nivel 4: código](docs/04-modelo-c4/Nivel4-DiagramadeCodigo.md)

La carpeta `img` contiene 11 diagramas PNG propios del proyecto y sus fuentes SVG disponibles en `img/fuentes-svg`. Los documentos incluyen las imágenes y sus fuentes SVG editables. `tecnologia` queda reservada para recursos técnicos del entregable.

Fuente funcional: `build_propuesta.py` y `Propuesta_Aplicacion_Movil_Gestion_Comercial_Papa.docx`, mantenidos en el proyecto documental compartido. Las especificaciones y evidencias SDD continúan en ese proyecto, fuera de este primer entregable. La predicción requiere cumplir los criterios CL-08 descritos en decisiones arquitectónicas y validar su implementación. Los documentos distinguen objetivos de evidencia operativa pendiente.

## Criterio de adaptación del ejemplo

Cada documento desarrolla propósito, responsabilidades, relaciones y verificaciones con el contexto mayorista de papa. El módulo de referencia es recepción/pesaje y liquidación de compra. Las vistas distinguen arquitectura aprobada, código actual y evolución pendiente, y reutilizan las reglas de la propuesta sin crear una lista funcional independiente.

## Descripción y usuarios

El sistema centraliza recepción, pesaje saco por saco, compras, ventas y despachos, pagos, cobranzas, cuentas por pagar y cobrar, flete, estiba y reportes, reemplazando registros manuales dispersos. Está orientado a tablets Android y conserva operaciones temporales sin conexión para sincronizarlas posteriormente.

El Mayorista supervisa su negocio y tiene acceso completo a sus módulos autorizados. El Encargado solo registra pesajes, compras y ventas durante un reemplazo autorizado y vigente, sin acceso a cuentas, caja, reportes o administración.

La arquitectura aprobada es un monolito modular organizado en capas, con API REST y separación de responsabilidades. La independencia completa del dominio respecto de infraestructura es un objetivo de evolución; las limitaciones actuales se explican en los documentos. Analítica y predicción avanzan según disponibilidad de historial y decisiones aprobadas.

## Estructura del repositorio

```text
mercado-mayorista-app/
├── docs/
│   ├── 01-analisis-de-sistema/
│   ├── 02-arquitectura-software/
│   ├── 03-diseño-de-software/diseño-interno/
│   └── 04-modelo-c4/
├── img/
├── tecnologia/
└── README.md
```

## Alcance comercial vigente

Compras, pesajes, ventas y despachos se conservan como historial. No existe control de inventario ni saldo de mercadería; sí se mantienen cuentas, pagos y saldos de dinero. Decisión del usuario del 7 de octubre de 2026. Las implementaciones anteriores requieren adaptación a este alcance.

## Historias del primer entregable

La tabla incorpora HU01–HU14: seis historias comerciales y ocho necesidades complementarias sin duplicar consulta, registro, búsqueda o auditoría. La relación con RF y los criterios de aceptación están en requisitos funcionales. No cambia el alcance sin existencias ni las condiciones de habilitación de predicción y la decisión pendiente sobre el canal externo.

## Presentación para defender el proyecto

[Presentación en Canva](https://canva.link/jtfbfs9g04mrf7f)
