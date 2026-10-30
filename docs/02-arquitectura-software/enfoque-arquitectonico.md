# Enfoque arquitectónico

> **Proyecto:** Gestión comercial mayorista de papa · **Versión:** 2.0 · **Actualización:** 29 de octubre de 2026

## Enfoque seleccionado

**Arquitectura limpia orientada al dominio**, aplicada a la organización interna del cliente Android y compatible con el backend en monolito modular. Se distinguen presentación, aplicación, dominio, infraestructura y composición. Las reglas comerciales (pesos, importes, cuotas) deben ser independientes de la interfaz táctil, del transporte HTTP y del almacenamiento.

El enfoque define cómo se organizan las dependencias dentro de cada aplicación; el [estilo](estilo-arquitectonico.md) define cómo se despliega el backend.

## Diagrama

![Arquitectura limpia orientada al dominio de Mercado Android](../../img/enfoque-arquitectonico.png)

Fuente editable: [enfoque-arquitectonico.svg](../../img/fuentes-svg/enfoque-arquitectonico.svg).

## Capas en el cliente Android

| Capa | Aplicación al proyecto | Ubicación en `mercado-app` |
| --- | --- | --- |
| Presentación | Acceso, menú, captura de pesos, compra, venta, consultas, documentos y envío | `src/app`, `src/features`, `src/ui` |
| Aplicación | Coordinar pesaje, liquidación, venta, abonos, envío de documentos y recuperación de pendientes | Hoy distribuida en features y providers |
| Dominio | Pesos, precisión monetaria, liquidación, despacho, identidad y orden de sincronización | `src/domain` |
| Contratos | Capacidades de operaciones, pendientes, sesión, documentos y compartición | Objetivo de evolución |
| Infraestructura | Cliente HTTP, cola cifrada, sesión segura, descarga de PDF, selector de archivos y compartición | `src/services/api`, `src/services/storage`, `src/services/receipts` |
| Composición | Conectar navegación, sesión y servicios concretos | `src/app/_layout.tsx` y providers |

## Reglas de dependencia

1. El dominio no depende de React Native, Expo, HTTP ni PostgreSQL.
2. La presentación invoca la coordinación de operaciones y muestra resultados; no determina saldos.
3. Los casos de uso dependen de modelos y contratos; los adaptadores concretos los implementan.
4. La raíz de composición elige las implementaciones; cambiar un adaptador conserva su contrato y sus errores.
5. Una orden sin conexión conserva UUID, usuario, negocio y dependencias; el servidor revalida permisos y versión antes de confirmarla.
6. Las previsualizaciones de peso y dinero ayudan a revisar la captura; la respuesta de la API es la autoridad final.

## Ejemplos en el código

| Archivo | Función |
| --- | --- |
| `src/domain/reception/purchase-preview.ts` | Previsualizar importes y validar cuotas antes de enviar |
| `src/domain/auth/session.ts` | Identidad, roles y expiración de la sesión |
| `src/services/api/api-client.ts` | Adaptador HTTP hacia la API |
| `src/services/storage/encrypted-queue-storage.ts` | Persistencia cifrada de pendientes |
| `src/features/auth/session/session-provider.tsx` | Coordinación de sesión |

## Estado y evolución

En el cliente, la coordinación todavía se reparte entre features y providers; en el backend, los servicios usan TypeORM directamente. La extracción de casos de uso y puertos es la dirección de mejora y debe conservar transacciones e idempotencia. Cada extracción se planifica con su contrato y sus pruebas.

## Verificación

Revisión de imports, pruebas de dominio con entradas reproducibles, pruebas de contrato HTTP y de autorización, reintentos idempotentes y recorridos en Android.
