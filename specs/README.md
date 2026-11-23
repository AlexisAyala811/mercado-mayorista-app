# Mapa de especificaciones SDD

Este índice conecta la línea base documental, el diseño de Figma y el trabajo técnico. No reemplaza los requisitos del documento de propuesta.

| ID | Funcionalidad | Requisitos principales | Estado | Dependencias o aclaraciones |
|---|---|---|---|---|
| 001 | Autenticación y autorización | RF01, RF02, RF22 | Backend e interfaz móvil implementados; evidencia en tablet pendiente | Decisiones CL-05, CL-06 y CL-10 aprobadas |
| 002 | Recepción, pesaje y liquidación de compra | RF05, RF06, RF06A, RF06B, RF07 | Backend e interfaz móvil implementados; evidencia en tablet pendiente | Decisiones CL-04 y CL-07 aprobadas |
| 003 | Ventas, despachos e inventario | RF08, RF10, RF11, RF12 | Backend e interfaz móvil implementados; evidencia en tablet pendiente | CL-12 aprobada e implementada |
| 004 | Cuentas, caja, flete y estiba | RF13, RF14, RF15, RF16 | Backend e interfaz móvil implementados; evidencia en tablet pendiente | Reglas de cálculo y vencimientos aprobadas |
| 005 | Operación offline, sincronización y auditoría | RF21, RF22 | Backend e interfaz móvil implementados; prueba instrumental Android pendiente | Cola cifrada y contratos centrales implementados |
| 006 | Reportes y comprobantes | RF12, RF17, RF18 | Backend e interfaz móvil implementados; evidencia en tablet pendiente | CL-11 aprobada e implementada; visor nativo requiere cliente de desarrollo |
| 007 | Analítica e inteligencia artificial | RF19, RF20 | Borrador | CL-08, CL-10 |
| 008 | Mensajería y notificaciones | RF16, RF23, RF25, RF26 | Backend y Android implementados; evidencia nativa pendiente | CL-MN01–03 resueltas |
| 009 | Estado de cuenta del comprador | RF27 (HU16) | Backend y app implementados (T940–T943); verificación en dispositivo (T944) y Figma pendientes | Decisión del 29 de octubre de 2026 |
| [010](010-purchase-lines-and-freight-choice/spec.md) | Lotes con precio propio y flete elegible en la compra | RF07 (HU02) | Convergida el 6 de noviembre de 2026 ([convergencia](../docs/sdd/convergencia-spec-010-2026-11-06.md)) | CL-FM08–10, CL-PL01–04 |
| [011](011-manay-app-design/spec.md) | Diseño MAÑAY en la app | RF01–RF27 visibles (HU01–HU16) | Fases 1 a 5 implementadas; convergencia con Stitch implementada el 9 de noviembre de 2026 (T1160–T1171, B1–B8 cerradas); pendientes T944 y T1150 | CL-FM01–20; CL-MD01–05; CL-ST01–10 |
| [012](012-load-testing/spec.md) | Pruebas de carga con k6 | AC01, AC06 | Corridas de 20 y 40 usuarios hechas el 16 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-carga-k6-2026-11-16.md)); falta volumen real y segunda instancia | Aprobada por el usuario el 16 de noviembre de 2026 |
| [013](013-catalog-cache/spec.md) | Caché de catálogos | AC01 | Implementada y verificada el 16 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-cache-catalogos-2026-11-16.md)) | Alcance aprobado por el usuario; pizarra de precios fuera de alcance |
| [014](014-database-volume/spec.md) | Escalabilidad de la base de datos con volumen | AC01 | Implementada y verificada el 17 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-volumen-bd-2026-11-17.md)) | Migración 030; cuentas y reportes por año pendientes |
| [015](015-app-e2e/spec.md) | Pruebas end to end de la app | RF01–RF27 visibles | Siete pruebas de Playwright en verde el 17 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-e2e-app-2026-11-17.md)) | Falta la CI y los flujos que escriben |
| [016](016-second-instance/spec.md) | Segunda instancia del backend | AC06 | Verificada el 17 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-segunda-instancia-2026-11-17.md)) | Límite y caché por instancia; balanceador de producción pendiente |
| [017](017-sprint2-quality/spec.md) | Validación de calidad del Sprint 2 | AC01 | Implementada el 18 de noviembre de 2026 ([verificación](../docs/sdd/verificacion-sprint2-2026-11-18.md)) | AC01 se cumple hasta 500 usuarios |
| [018](018-despliegue-supabase-render/spec.md) | Despliegue en Supabase y Render | AC02 | En curso desde el 20 de noviembre de 2026 | API en Render y base en Supabase, plan gratuito |
| [019](019-stitch-en-celular/spec.md) | Diseño Stitch también en el celular | RQ-ST13, RQ-ST14 | En curso desde el 20 de noviembre de 2026 | Compra y venta con la hoja Stitch en todos los anchos; CL-19-01 a CL-19-03 |
| [020](020-jest-backend/spec.md) | Pruebas del backend con Jest | Sprint 2, actividad 7 | Implementada el 21 de noviembre de 2026 | Jest 30 en ESM con SWC; 365 unitarias y 68 e2e |
| [021](021-rutas-inventario-retiradas/spec.md) | Rutas de inventario retiradas | Sprint 2, actividades 4 y 6 | Implementada el 22 de noviembre de 2026; falta la CI | Cuatro rutas `410` marcadas como retiradas en OpenAPI; compras, ventas y recepciones sin dependencias de inventario |

## Artefactos transversales

- [Constitución SDD](../.specify/memory/constitution.md)
- [Coordinación de las tres tareas](coordination.md)
- [Registro de decisiones bloqueantes](../docs/sdd/decision-backlog.md)
- [Propuesta de decisiones financieras restantes](../docs/sdd/backend-remaining-decisions.md)
- [Lista de convergencia](convergence-checklist.md)
- [Preparación del plan técnico](architecture/plan-readiness.md)
- [Decisión propuesta de plataforma](architecture/decision-001-mobile-platform.md)
- [Decisión de backend y base central](architecture/decision-002-backend-platform.md)
- [Contrato de arranque Expo propuesto](architecture/expo-bootstrap-contract.md)
- [Línea base técnica implementada](architecture/implementation-baseline.md)
- [Propuesta de sistema visual](design/visual-system-proposal.md)
- [Inventario de flujos y pantallas](design/screen-inventory.md)
- [Plan de autenticación](001-authentication-and-authorisation/plan.md) y [tareas de autenticación](001-authentication-and-authorisation/tasks.md)
- [Plan de recepción y compras](002-reception-weighing-and-purchase-settlement/plan.md) y [tareas de recepción y compras](002-reception-weighing-and-purchase-settlement/tasks.md)
- [Plan de ventas e inventario](003-sales-dispatch-and-inventory/plan.md) y [tareas de ventas e inventario](003-sales-dispatch-and-inventory/tasks.md)
- [Plan de cuentas y caja](004-accounts-cash-freight-and-stowage/plan.md) y [tareas de cuentas y caja](004-accounts-cash-freight-and-stowage/tasks.md)
- [Plan de continuidad y auditoría](005-offline-synchronisation-and-audit/plan.md) y [tareas de continuidad y auditoría](005-offline-synchronisation-and-audit/tasks.md)
- [Plan de reportes y comprobantes](006-reports-and-receipts/plan.md) y [tareas de reportes y comprobantes](006-reports-and-receipts/tasks.md)
- [Plan de analítica e IA](007-analytics-and-progressive-ai/plan.md) y [tareas de analítica e IA](007-analytics-and-progressive-ai/tasks.md)

## Regla de avance

Una especificación pasa a `Lista para plan` solo cuando sus reglas de negocio y aclaraciones bloqueantes tienen una decisión documentada. Después de `implementada`, debe pasar por convergencia contra Figma, requisitos, pruebas y evidencia en tablet.

## Verificación del proceso

Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/validate_sdd.ps1` desde la raíz para comprobar que los artefactos SDD obligatorios siguen completos.

Ejecutar `powershell -ExecutionPolicy Bypass -File scripts/validate_project.ps1` para validar en conjunto los artefactos SDD, TypeScript, ESLint y Jest.

## Especificación 008 Mensajería y notificaciones

[Especificación](008-messaging-and-notifications/spec.md), [plan](008-messaging-and-notifications/plan.md) y [tareas](008-messaging-and-notifications/tasks.md). HU14 y HU15; RF16/RF23/RF25/RF26. Compartición manual de PDF, Word e imágenes mediante WhatsApp o correo, con autorización central y metadatos de intento.

## Decisiones del 29 de octubre de 2026

- [Ocho módulos de negocio y estado de cuenta del comprador](../docs/sdd/decision-modulos-y-estado-de-cuenta-2026-10-29.md): HU16/RF27 pendiente de especificar en 006 y 008.
- [Integridad y seguridad del backend](../docs/sdd/decision-integridad-seguridad-backend-2026-10-29.md): secciones fechadas en 001, 004 y 005; monorepo y entrega continua en la línea base técnica. Evidencia: [verificación del backend](../docs/sdd/verificacion-backend-2026-10-29.md).
