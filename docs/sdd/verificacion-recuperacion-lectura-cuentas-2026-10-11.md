# Recuperación de lectura de cuentas y caja — 11 de octubre de 2026

## Comportamiento implementado

La pantalla considera cuentas y caja una lectura conjunta. El fallo de cualquiera muestra «Datos financieros no disponibles», con reintento de ambas colecciones, sin presentar métricas de cero, cuentas vacías o movimientos parciales como información confirmada. Una lectura completa exitosa habilita resultados y conserva filtros. La actualización limpia errores de consulta anteriores.

Si un pago o reverso fue confirmado y el detalle se actualizó, pero falla la lectura posterior de las colecciones, el detalle mantiene la confirmación y muestra «Lista de cuentas y caja pendiente». Su reintento solo consulta; no vuelve a encolar ni enviar el movimiento. Al regresar a la lista, no muestra los totales anteriores como actuales. Se conserva el tratamiento existente de fallo de consulta del detalle confirmado.

El estado interno se reinicia al cambiar el token de sesión. Las consultas de colecciones tienen generación para descartar respuestas reemplazadas. Al desmontar, se descartan cambios de estado y navegación pendientes; un guardado que termina después conserva la operación duradera sin iniciar su envío desde esa pantalla. Esto no cancela operaciones centrales ya iniciadas ni elimina su recuperación en la cola.

## Evidencia y límites

`npm run check`: TypeScript, lint y **347 pruebas en 50 suites aprobadas**. Se añadieron seis recorridos: fallo de cuentas, fallo de caja, sesión no autorizada, recuperación de colecciones tras movimiento confirmado, respuesta de detalle de una sesión anterior y guardado que termina después de cerrar la pantalla. Verifican la ausencia de falsos estados vacíos/ceros, reintento conjunto y ausencia de nuevos envíos o navegación indebida.

No se cambiaron contratos o permisos del backend, ni se crearon operaciones comerciales. Las pruebas son de frontend con servicios simulados; no acreditan un recorrido HTTP, Android, lector de pantalla o convergencia Figma para estos estados. T413/T414 y el objetivo general permanecen abiertos.
