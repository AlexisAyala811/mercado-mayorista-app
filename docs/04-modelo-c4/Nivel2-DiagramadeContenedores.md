# Nivel 2 · Diagrama de contenedores

> **Proyecto:** Gestión comercial mayorista de papa · **Modelo:** C4 · **Nivel:** 2 · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Objetivo

Abrir el sistema Mercado y mostrar las aplicaciones y almacenes de datos que lo componen y cómo se comunican. Un contenedor C4 es una aplicación o un almacén de datos; no equivale a un contenedor Docker.

## Diagrama

![Contenedores del sistema Mercado](../../img/nivel2-contenedores.png)

Fuente editable: [nivel2-contenedores.svg](../../img/fuentes-svg/nivel2-contenedores.svg).

## Contenedores

| Contenedor | Tecnología | Responsabilidad | Datos |
| --- | --- | --- | --- |
| Aplicación Android | Expo, React Native, TypeScript | Interacción táctil, sesión, captura, consultas, descarga de documentos y envío por WhatsApp o correo | Estado de pantalla |
| Almacén local | Almacenamiento seguro y cola cifrada | Conservar sesión y operaciones pendientes durante la pérdida de red, aisladas por usuario y negocio | Sesión, claves y pendientes; no es fuente oficial |
| API Mercado | NestJS, TypeScript | Autorización y reglas de los ocho módulos de negocio | Sin estado propio |
| PostgreSQL | PostgreSQL 17, TypeORM, migraciones | Confirmar operaciones y efectos financieros en transacciones | Operaciones, cuentas, caja, costos, auditoría, documentos PDF e intentos de envío |

## Relaciones

| Origen | Destino | Relación | Mecanismo |
| --- | --- | --- | --- |
| Mayorista / Encargado | Aplicación Android | Usan las funciones de su rol | Interacción táctil |
| Aplicación Android | Almacén local | Guarda y recupera sesión y pendientes | Acceso local cifrado |
| Aplicación Android | API Mercado | Envía operaciones, consulta datos y descarga PDF | REST `/api/v1`, HTTPS/JSON, token de sesión |
| API Mercado | PostgreSQL | Lee y escribe operaciones, finanzas, auditoría y documentos | SQL en transacciones |
| Aplicación Android | WhatsApp / correo | Envía el documento elegido por el Mayorista | Menú de compartir del dispositivo |

Android nunca se conecta a PostgreSQL, y los dos almacenes no se sincronizan directamente.

## Seguridad y consistencia

- La API usa un token de sesión opaco y controla negocio, rol, recurso y reemplazo en cada solicitud.
- HTTPS protege el tráfico en el despliegue; las credenciales de PostgreSQL solo están en el servidor.
- Un pendiente local no se presenta como confirmado. La API usa el UUID para devolver el resultado previo y la versión para detectar conflictos.
- Los PDF se autorizan igual que la operación que representan y se guardan en PostgreSQL (`bytea`) con hash SHA-256 y versión.
- Mensajería registra cada intento de envío sin recibir el archivo.

## Despliegue

Los contenedores de servidor se ejecutan con Docker Compose (PostgreSQL, migraciones y API). El detalle está en la [vista de despliegue](../03-diseño-de-software/vista-de-despliegue.md).

Anterior: [Nivel 1](Nivel1-DiagramadeContextodelSistema.md) · Siguiente: [Nivel 3](Nivel3-Diagrama-de-Componentes.md).
