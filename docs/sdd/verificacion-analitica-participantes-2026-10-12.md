# Filtros analíticos de proveedor y comprador — 12 de octubre de 2026

## Trazabilidad y comportamiento

Corte de T707 que implementa los participantes previstos en el requisito funcional 1 de 007 y HU06. Se amplió primero el contrato compartido. La consulta descriptiva acepta proveedor y comprador opcionales: proveedor restringe compras y comprador restringe ventas, sin inferir vínculos entre ambas. Cada selección puede quitarse independientemente y los resultados muestran los participantes efectivos. No cambia la consulta de disponibilidad predictiva ni habilita estimaciones.

La API valida UUIDs y conserva la delimitación de negocio en ambas ramas SQL. El frontend transmite los filtros al servidor, invalida resultados y respuestas tardías cuando cambian y reinicia la composición por token de sesión. No aplica filtros solo visualmente sobre un historial global.

## Verificación ejecutada

- Frontend: tipos y lint sin errores; 15 pruebas analíticas en dos suites. Incluyen selección y limpieza independiente, rechazo de respuesta tardía y disponibilidad sin filtros de participante.
- Backend: tipos, lint y compilación sin errores; 14 pruebas analíticas en cinco archivos. Incluyen aceptación de UUIDs válidos, omisión y rechazo de identificadores malformados.
- PostgreSQL real: `mercado-api/test/purchase-report-no-inventory.mjs` ejecutó el servicio compilado en tablas temporales dentro de la base UI aislada. Confirmó ambos tipos con participantes coincidentes, compras cuando no coincide comprador, ventas cuando no coincide proveedor, ausencia con ambos no coincidentes y ausencia para otro negocio. Conservó el cálculo de 60 kg y S/ 2.5000 de compra y el límite del día de Lima. Rollback final, sin escrituras comerciales persistentes.
- Web real: cuenta ficticia Mayorista, `/analytics`, selección Proveedor QA y Comprador QA y consulta explícita contra la API recompilada. Mostró los nombres efectivos, compras y ventas de Canchán QA y explicaciones de semana parcial; no creó operaciones. Capturas inspeccionadas en 1280 × 800 y 360 × 800. En teléfono, selectores y botón Consultar análisis midieron 52 px de alto y aproximadamente 247 px de ancho, dentro de la pantalla. Se restableció el tamaño del navegador al finalizar.

Evidencia visual: `tmp/analytics-participant-filters-tablet-2026-10-12.png` y `tmp/analytics-participant-filters-phone-2026-10-12.png`. El navegador quedó en el tablero para continuar la comprobación; no se declara cierre de sesión de ese recorrido.

## Entorno y límites

Los servicios existentes se comprobaron mediante inspección fuera del sandbox. La primera lectura dentro del sandbox no mostró los listeners y un intento de arranque informó servidor posiblemente activo y acceso denegado al log. No se eliminaron locks ni se forzó otra base. La consulta PostgreSQL real y la inspección posterior confirmaron la base existente activa. Se reinició únicamente la API de pruebas propia verificada para cargar su compilación actualizada, reutilizando PostgreSQL y Metro existentes.

Los selectores usan los catálogos comerciales disponibles. Faltan participantes desactivados, calidad/procedencia, indicadores restantes, Android/TalkBack y diseño Figma de DS-044/DS-045. La predicción versionada, evaluación y publicación siguen pendientes. Este corte no acredita terminación de 007 ni de todo el frontend.
