# Cuentas y caja con API real — 11 de octubre de 2026

## Entorno y alcance

Expo Web local 8087, API local 3000 y PostgreSQL 55437 sobre la base aislada `mercado_ui_test_*` existente. Se utilizó la cuenta ficticia Mayorista existente. No se crearon usuarios, reemplazos, pagos, reversos o transacciones comerciales. La consulta devolvió 49 movimientos de caja, entradas S/2994.00, salidas S/845.00, neto S/2149.00 y cero cuentas; estos valores describen esta base de pruebas, no el negocio real.

## Recorrido observado

1. Login desde la interfaz y navegación Menú → Cuentas y caja: carga y resultado central visibles.
2. Se detuvo exclusivamente la API iniciada por esta tarea, verificando previamente PID, comando y puerto. «Actualizar» produjo «Datos financieros no disponibles» y reintento. La pantalla no mostró métricas, cuentas vacías ni caja parcial durante el fallo. PostgreSQL permaneció activo.
3. Se restauró inmediatamente la misma API. «Reintentar cuentas y caja» recuperó los totales anteriores y el vacío real de cuentas, sin nuevo login ni envío comercial.
4. El historial de caja inicialmente obligaba a recorrer todos los movimientos antes de buscar cuentas. Se añadió un despliegue explícito, plegado inicialmente, con recuento de la colección completa; abrir/cerrar no altera métricas ni vuelve a consultar.
5. La comprobación DOM detectó que el estado expandido nativo no se exponía como ARIA. El botón compartido conserva `accessibilityState` y ahora añade `aria-expanded`. Verificación real: `false` plegado y `true` desplegado; totales idénticos. Referencia oficial consultada mediante Context7: React Native Web, accessibility props y Pressable.
6. Durante una recarga posterior quedó visible la sesión local provisional. «Revalidar sesión» en la cola confirmó la identidad y mantuvo ese recorrido; regresar devolvió cuentas con «Datos sincronizados». No se sincronizaron operaciones ni se abrió la recepción local antigua.

Metro funcionaba con CI y la recarga inicial seguía sirviendo el componente anterior. Se verificó ese estado y se reinició únicamente el servidor propio para comprobar los archivos actualizados. No se considera la primera recarga evidencia del control nuevo.

## Pantalla compacta y evidencias

En viewport web 360 × 800, el ancho documental fue 360 sin desbordamiento horizontal; botones y radios medidos de 52 px de alto. Se inspeccionaron el inicio y los controles mediante capturas separadas, pues el scroll interno de React Native no produce una captura completa con `fullPage`. Buscar y seleccionar «Por cobrar» expuso `aria-checked=true` sin cambiar el neto. Se limpiaron filtros y restableció el viewport antes de finalizar.

Evidencias en `tmp/`: `accounts-real-api-error-2026-10-11.png`, `accounts-real-api-recovered-2026-10-11.png`, `accounts-real-api-compact-top-2026-10-11.png`, `accounts-real-api-compact-controls-2026-10-11.png` y `accounts-real-api-compact-2026-10-11.json`. La captura `accounts-real-api-compact-2026-10-11.png` corresponde a una posición intermedia, no a toda la pantalla.

`npm run check`: TypeScript, lint y **348 pruebas / 50 suites aprobadas** después del atributo ARIA final. La prueba nueva cubre despliegue/cierre, preservación del total, consulta única y ausencia de envío.

## Pendientes

La base consultada no contiene cuentas: este recorrido no acredita apertura de un detalle real, confirmación de pago/reverso, nombres históricos ni búsqueda con coincidencias. Tampoco acredita Android, TalkBack, colecciones mayores de 100 o igualdad visual con Figma. T413/T414 permanecen pendientes; la captura corresponde al frontend funcional actual. Se mantienen abiertos esos recorridos y la convergencia visual del objetivo general.
