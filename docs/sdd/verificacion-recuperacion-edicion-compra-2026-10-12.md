# Recuperación de edición inicial de compra — 12 de octubre de 2026

## Solución y límites

El retroceso externo web continúa navegando según el historial de Expo Router. La versión instalada reconstruye el estado mediante `resetRoot` en `fork/useLinking.js`; el callback simulado de `usePreventRemove` no acreditaba que ese recorrido mostrase el aviso. Se añadió una copia de edición en memoria, aislada por sesión autenticada, para recuperar campos y referencias al volver a abrir una recepción nueva. No se modificaron dependencias ni el historial del navegador para interceptar su funcionamiento.

La interfaz muestra «Edición de compra recuperada» y distingue esta copia de una recepción guardada. No se envía nada al backend antes de Continuar. La copia se limpia al descartar explícitamente, al guardar duraderamente en la cola y al cerrar/cambiar sesión. Una recepción existente no consume esa copia. Las lecturas/escrituras copian objetos y listas para impedir mutaciones externas de la edición conservada.

La copia no es persistente: recarga completa, cierre del proceso o reinicio la pierden. Se mantiene el aviso de salida de la aplicación y el registro de `usePreventRemove`; no se declara bloqueado el retroceso externo ni verificado el aviso nativo de cierre/recarga. Android y almacenamiento duradero de datos iniciales no quedan acreditados por este corte.

## Evidencia actual

`npm run check`: TypeScript, lint y **371 pruebas en 52 suites aprobadas**. Incluye aislamiento de propietarios, copias independientes, limpieza por propietario, recuperación al desmontar la ruta y descarte explícito. Las nuevas pruebas de RootNavigator verifican limpieza al cerrar/cambiar sesión y conservación durante revalidación de la misma sesión. La limpieza se delega a un hook de feature; la importación directa de dominio en la ruta fue rechazada por lint y corregida.

El identificador de una comprobación anterior dejó de existir tras la interrupción/cambio de fecha. Se ejecutó una comprobación nueva completa, sin asumir su resultado. La API y Metro anteriores tampoco existían ni escuchaban; PostgreSQL seguía activo. Se restauraron solo esos servicios propios sobre la misma base local aislada. Un fallo transitorio del login se recuperó desde la interfaz después de confirmar sus puertos, sin reiniciar otra vez.

En el navegador real del 12 de octubre se verificó:

- Sesión ficticia Mayorista: formulario inicial sin conductor anterior.
- Edición `QA recuperación 20261012`, retroceso externo y nueva entrada a Compras: conductor idéntico y aviso de edición recuperada.
- Cierre de sesión desde el menú con esa edición conservada y login nuevo de la misma cuenta: conductor vacío y cero avisos de recuperación.
- No se pulsó Continuar al pesaje, no se creó una recepción y no se registraron operaciones comerciales. El menú quedó abierto al finalizar.

La comprobación anterior del 11 de octubre acreditó también que descartar explícitamente vacía la copia. Sus datos anteriores no se usaron para afirmar el cambio de sesión del 12.

Evidencia: `tmp/purchase-session-edit-verification-2026-10-12.json` y `tmp/purchase-edit-restored-2026-10-12.png`. La captura del aviso es anterior al cierre de sesión; la evidencia JSON registra el formulario limpio posterior.

## Pendientes generales

Verificar los recorridos en Android, la protección nativa de salida, formularios de venta ante retroceso externo, carga/recuperación de todos los módulos y convergencia Figma. Esta solución protege la edición al cambiar de ruta dentro de la sesión y no acredita el frontend completo.
