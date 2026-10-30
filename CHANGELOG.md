# Historial de cambios

## 2.1 · 29 de octubre de 2026

### Monorepo

- El backend (`mercado-api`) se incorpora en `backend/` conservando su historial. La documentación enlaza a `backend/src`.

### Entrega y despliegue continuos (ADR-05)

- `backend-ci.yml`: en cada PR, tipos, lint, pruebas unitarias, build, `npm audit` sin vulnerabilidades altas, migraciones y pruebas e2e en PostgreSQL 17 e imagen Docker.
- `backend-cd.yml`: en cada push a `main`, CI completa, publicación de la imagen en GitHub Container Registry y despliegue automático con migración, comprobación de salud y reversión cuando el entorno `production` está configurado.
- `docs-ci.yml`: verificación de enlaces y anclas de la documentación.
- `backend/deploy/`: compose de producción (API solo en `127.0.0.1`, OpenAPI desactivado) y script de despliegue.
- Nuevo documento [entrega y despliegue continuos](docs/03-diseño-de-software/entrega-y-despliegue-continuos.md).

### Backend

- Las pruebas e2e se ejecutan de forma secuencial (las suites compartían la base y migraban en paralelo).
- La prueba de migraciones y el script de respaldo comparan con las migraciones registradas en lugar de un número fijo.
- Dependencias: corregidas las vulnerabilidades altas de `body-parser` y `multer`.

## 2.0 · 29 de octubre de 2026

### Organización en módulos

- El sistema se organiza en **ocho módulos de negocio** (Identidad y acceso; Recepción y compras; Ventas y despachos; Cuentas y caja; Costos logísticos; Documentos; Mensajería; Reportes y analítica) y responsabilidades transversales (auditoría, referencias comerciales, sincronización). Sustituye la lista de diez responsabilidades de la versión 1.x.
- `componentes-arquitectonicos.md` pasa a ser la referencia única de módulos, con la correspondencia a las carpetas de `mercado-api`.

### Alcance

- Nuevas historias **HU15** (compartir PDF, Word e imágenes) y **HU16** (estado de cuenta del comprador), y requisitos **RF25–RF27**.
- **RF23** se redefine como recordatorio manual por WhatsApp o correo (ADR-03); deja de estar «por definir».
- **RF04, HU01 y HU03** incorporan calidad y procedencia por saco y por línea de venta (CL-13).
- HU09 agrupa flete y estiba en Costos logísticos.
- Nuevas decisiones: ADR-02 (referencias dentro de cada operación), ADR-03 (envío manual), ADR-04 (ocho módulos) y la ampliación de CL-04 (UUID reutilizado → `409`).
- Requisitos y escenarios de calidad indican su estado de evidencia y las brechas conocidas (RF11, AC04).

### Documentos nuevos

- Modelo de datos (diagrama entidad-relación).
- Diagramas de estados de recepción, venta, cuenta, costos logísticos y envíos.
- Vista de despliegue (Docker Compose).
- Glosario con los códigos CL.
- Este historial de cambios.

### Mejoras editoriales

- Se eliminaron secciones duplicadas (tabla de responsabilidades, organización de datos comerciales, condiciones CL-08, ejemplos de saldos, escenarios repetidos).
- Se retiraron las aclaraciones repetitivas y las referencias al ejemplo académico.
- `enfoque-aquitectonico.md` se renombra a `enfoque-arquitectonico.md`.

### Diagramas

- C4 nivel 3 rehecho con los ocho módulos.
- Arquitectura inicial, estilo, C4 nivel 1 y nivel 2 muestran WhatsApp / correo como sistema externo y el envío manual; se corrigió el texto superpuesto del cilindro de PostgreSQL en el nivel 2.
- Pie de todos los diagramas actualizado a 16 historias y 8 módulos.

## 1.x · 6–13 de octubre de 2026

Primer entregable: análisis del sistema, arquitectura, diseño interno de compras y pesaje, y modelo C4 con catorce historias.
