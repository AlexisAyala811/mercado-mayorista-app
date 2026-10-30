# Logística: carga, sesión y teléfono — 12 de octubre de 2026

El espacio de logística se monta por token de sesión, descarta respuestas de espacios desmontados y controla la generación de cada lectura. Los errores de catálogo se distinguen de colecciones vacías; ocultan recuentos/listas y formularios dependientes hasta recuperar datos. Reintentar vuelve a cargar ambas colecciones completas. Un 401 invalida la sesión y evita presentar el fallo como ausencia de registros.

Durante creación/edición/desactivación se bloquean campos y controles pertinentes, con un guard de petición que evita ejecutar dos mutaciones simultáneas. Un resultado tardío no actualiza la pantalla de otra sesión. Actualizar y buscar conserva el estado de edición. Los formularios usan columnas solo a partir de 760 px; en teléfono ocupan el ancho disponible, sin flexBasis mínima de 360 px ni texto con minWidth 220.

## Verificación

- TypeScript y lint correctos; 26 pruebas en cuatro suites de logística.
- Casos añadidos: carga inicial fallida/reintento sin falso vacío; respuesta tardía de sesión anterior; 401 con invalidación y sin falso vacío. Se mantienen búsqueda literal, acentos, relaciones ausentes y edición preservada.
- Navegador real contra API y base UI aislada: inicio de sesión existente, menú Carros, lectura de un transportista y vehículo, edición del transportista, búsqueda sin coincidencias, actualización, nombre de edición preservado, limpieza y cancelación. Volver regresa al menú y cierre de sesión deja campos vacíos. Sin creación, actualización ni desactivación comercial durante esta comprobación.
- Teléfono 360×800: todos los campos miden aproximadamente 247,2 px y terminan en x≈296; documento de 360 px y ningún botón fuera del ancho. Captura `tmp/logistics-form-phone-2026-10-12.png`.
- El servidor Expo se reinició intencionalmente para cargar el código nuevo y observar archivos, verificando antes comando y puerto del proceso propio. No se reinició por timeout.

## Convergencia pendiente

Este corte mejora el funcionamiento y la adaptación móvil de la pantalla existente. No implementa ni certifica composición final de Carros 18:459: siguen pendientes el significado de N° y la fuente del componente User conectado, conforme a `specs/004-accounts-cash-freight-and-stowage/plan.md` y el contexto recuperado. El skill `figma-design-to-code` exige reutilizar el componente conectado y todos los activos en sus posiciones originales; no se sustituyó User por un icono inventado. Android, lector de pantalla, flujo positivo de mutación e igualdad visual permanecen pendientes.
