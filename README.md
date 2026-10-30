# Mercado mayorista · Documentación de arquitectura

Documentación de la aplicación móvil de gestión comercial para mayoristas de papa: análisis del sistema, arquitectura, diseño interno y modelo C4.

**Versión 2.1 · 29 de octubre de 2026** · Cambios en el [CHANGELOG](CHANGELOG.md).

[![Backend · CD](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/workflows/backend-cd.yml/badge.svg)](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/workflows/backend-cd.yml)
[![Documentación · CI](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/workflows/docs-ci.yml/badge.svg)](https://github.com/AlexisAyala811/mercado-mayorista-app/actions/workflows/docs-ci.yml)

## Descripción

Mercado reemplaza los registros manuales de un negocio mayorista de papa. Desde una tablet Android permite registrar la recepción y el pesaje saco por saco, las compras, las ventas y despachos, los pagos y cobranzas, las cuentas por pagar y por cobrar, el flete y la estiba, generar comprobantes y estados de cuenta, y enviarlos por WhatsApp o correo. La captura funciona sin conexión y se sincroniza al recuperarla.

- **Mayorista:** acceso completo a su negocio.
- **Encargado:** solo registra pesajes, compras y ventas durante un reemplazo autorizado de hasta 24 horas.

La solución es un **monolito modular en capas** (NestJS + PostgreSQL) con un cliente **Expo / React Native**, comunicados por REST `/api/v1`.

## Módulos

| # | Módulo | Incluye |
| --- | --- | --- |
| 1 | Identidad y acceso | Sesión, Encargados y reemplazos |
| 2 | Recepción y compras | Pesaje saco por saco, cierre y liquidación al proveedor |
| 3 | Ventas y despachos | Venta, despacho, anulación y devoluciones comerciales |
| 4 | Cuentas y caja | Cuotas, abonos, pagos, cobros, caja y avisos de vencimiento |
| 5 | Costos logísticos | Flete y estiba |
| 6 | Documentos | Comprobantes PDF y estado de cuenta del comprador |
| 7 | Mensajería | Envío manual por WhatsApp o correo y registro de cada intento |
| 8 | Reportes y analítica | Reportes, historial, tendencias y predicción |
| — | Transversal | Auditoría, referencias comerciales y sincronización offline |

Detalle y correspondencia con el código: [componentes arquitectónicos](docs/02-arquitectura-software/componentes-arquitectonicos.md).

## Índice

### 1. Análisis del sistema

- [Actores y permisos](docs/01-analisis-de-sistema/01-actores.md)
- [Historias de usuario](docs/01-analisis-de-sistema/02-historias-del-usuario.md) (HU01–HU16)
- [Requisitos funcionales](docs/01-analisis-de-sistema/03-requisitos-funcionales.md) (RF01–RF27)
- [Atributos de calidad](docs/01-analisis-de-sistema/04-atributos-de-calidad.md)
- [Restricciones](docs/01-analisis-de-sistema/05-restricciones.md)
- [Drivers arquitectónicos](docs/01-analisis-de-sistema/06-driver-arquitectonicos.md)
- [Decisiones arquitectónicas](docs/01-analisis-de-sistema/07-decisiones-arquitectonicas.md)
- [Escenarios de calidad](docs/01-analisis-de-sistema/08-escenarios-atributos-calidad.md)

### 2. Arquitectura de software

- [Arquitectura inicial](docs/02-arquitectura-software/arquitectura-inicial.md)
- [Componentes arquitectónicos](docs/02-arquitectura-software/componentes-arquitectonicos.md)
- [Enfoque arquitectónico](docs/02-arquitectura-software/enfoque-arquitectonico.md)
- [Estilo arquitectónico](docs/02-arquitectura-software/estilo-arquitectonico.md)

### 3. Diseño de software

- [Diseño interno de módulos](docs/03-diseño-de-software/diseño-interno/diseño-interno-de-modulos.md)
- [Patrones de diseño](docs/03-diseño-de-software/diseño-interno/patrones-de-diseño.md)
- [Principios de diseño](docs/03-diseño-de-software/diseño-interno/principios-de-diseño.md)
- [Modelo de datos](docs/03-diseño-de-software/modelo-de-datos.md)
- [Diagramas de estados](docs/03-diseño-de-software/diagramas-de-estados.md)
- [Vista de despliegue](docs/03-diseño-de-software/vista-de-despliegue.md)
- [Entrega y despliegue continuos](docs/03-diseño-de-software/entrega-y-despliegue-continuos.md)

### 4. Modelo C4

- [Nivel 1 · Contexto](docs/04-modelo-c4/Nivel1-DiagramadeContextodelSistema.md)
- [Nivel 2 · Contenedores](docs/04-modelo-c4/Nivel2-DiagramadeContenedores.md)
- [Nivel 3 · Componentes](docs/04-modelo-c4/Nivel3-Diagrama-de-Componentes.md)
- [Nivel 4 · Código](docs/04-modelo-c4/Nivel4-DiagramadeCodigo.md)

### Referencia

- [Glosario](docs/glosario.md): términos del negocio, términos técnicos y códigos CL.

## Alcance

- **Sin control de existencias** (desde el 7 de octubre de 2026): compras y ventas se registran por separado; no se calcula mercadería disponible. Sí se calculan los saldos de dinero.
- **Envío manual por WhatsApp o correo:** la aplicación prepara el archivo y el Mayorista confirma el envío; no hay envío automático.
- **Predicción de precios:** solo se habilita al cumplir los criterios CL-08 (26 semanas de historial y evaluación aprobada).
- **Fuera del MVP:** facturación electrónica, pasarela de pagos, ERP, GPS y balanzas integradas.

## Estructura del repositorio

```text
mercado-mayorista-app/
├── .github/workflows/   # CI/CD: backend-ci, backend-cd, docs-ci
├── backend/             # API NestJS (mercado-api)
│   ├── src/
│   ├── test/
│   └── deploy/          # compose de producción y script de despliegue
├── docs/
│   ├── 01-analisis-de-sistema/
│   ├── 02-arquitectura-software/
│   ├── 03-diseño-de-software/
│   │   └── diseño-interno/
│   ├── 04-modelo-c4/
│   └── glosario.md
├── img/                 # Diagramas PNG
│   └── fuentes-svg/     # Fuentes editables
├── tecnologia/
├── CHANGELOG.md
└── README.md
```

Los diagramas de modelo de datos, estados y despliegue están escritos en Mermaid dentro de cada documento y GitHub los muestra directamente.

## Código

El backend está en [`backend/`](backend/README.md). Para ejecutarlo en local:

```bash
cd backend
cp .env.example .env   # completar la contraseña de la base de datos
docker compose up --build
```

La API queda en `http://localhost:3000/api/v1`. Todo cambio entra por pull request: la integración continua verifica tipos, lint, pruebas unitarias y e2e en PostgreSQL, build e imagen, y cada commit en `main` publica y despliega una nueva versión. Ver [entrega y despliegue continuos](docs/03-diseño-de-software/entrega-y-despliegue-continuos.md).

## Presentación

[Presentación en Canva](https://canva.link/jtfbfs9g04mrf7f)
