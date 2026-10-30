# Carros: composición y conservación de borradores

Se implementa `specs/004-accounts-cash-freight-and-stowage/carros-visual-plan.md`, consumiendo la decisión humana de referencias dentro de operaciones y teléfono/placa separados. La presentación conserva las entidades y permisos de logística. No agrega inventario, correlativos ni escrituras comerciales.

## Fuente visual y traducción

Contexto actual MERCADO 18:459: marco 1440×1024, franja (39,202), búsqueda (159,134), cuatro pares de paneles y reserva de + entre tercera y cuarta fila. Las seis imágenes originales se cotejaron con los archivos locales (`tmp/figma-carros-assets-current-20261015/verified.json`); se reutilizan sin modificar sus paths. User es el componente local original descrito en `verificacion-user-original-menu-2026-10-15.md`; sus instancias de fila se contrastaron con contexto 18:479 y metadatos de las cuatro filas. No se sustituyen componentes por capturas ni se afirma un mapeo Code Connect que no existe.

`reference-logistics-screen.tsx` adapta los paneles a datos reales: una fila por vehículo y otra por transportista activo sin vehículo, cuatro por página. Una persona con varios vehículos aparece con cada asociación; vehículos sin transportista y asociaciones históricas inactivas no desaparecen. Teléfono y placa llevan etiquetas separadas. Los controles de editar/desactivar identifican su entidad; el transportista inactivo mostrado no se ofrece como editable.

En ancho amplio se conservan dimensiones originales de iconos y campo; la variante compacta usa flujo adaptable, iconos originales y campos nativos. Los formularios separados permanecen debajo de la composición, con foco solicitado al editar. Buscar, limpiar o paginar conserva ambos borradores. El + solicita descarte explícito si hay cambios; cancelar los mantiene. Se mantienen guardas de navegación, reemplazo y sesión.

## Resultado y recuperación

Guardado confirmado seguido de error de lectura muestra ambos resultados por separado. Reintentar logística consulta de nuevo sin repetir el alta. Una desactivación fallida conserva diálogo y motivo; el éxito limpia únicamente la entidad editada correspondiente, preservando el borrador del otro formulario. Se bloquean escrituras simultáneas y acciones durante confirmaciones.

## Evidencia automatizada

- `npm run check -- --cacheDirectory ../tmp/jest-carros-20261015`: TypeScript y lint aprobados; **501 pruebas, 69 suites**, cero fallos. Registro `tmp/carros-reference-check-20261015.log`, código 0 en el archivo asociado.
- Logística enfocada: **34 pruebas, 5 suites**. Incluye proyección/búsqueda con asociaciones ausentes e inactivas, paginación sin escrituras, conservación de ambos borradores, descarte/cancelación, guarda posterior al nuevo registro, guardado confirmado con recarga fallida y desactivación fallida con recuperación.
- El primer intento de pruebas no ejecutó casos por EPERM al renombrar caché en Temp del sandbox. Se usó caché dentro del workspace; no se relajaron permisos ni cambió el resultado esperado.

## Paquete web

Exportación de 20 rutas terminada con código 0 en `tmp/web-export-carros-reference-20261015`; registro `tmp/carros-reference-export-20261015.log`. Entrada SHA256 `F1839565B5A02305F9C9C4C38E07B764C65CF1B9530AFC66C11A0BCC2833C44B`.

Instalación local en `mercado-app/dist` el 15 de octubre a las 19:46 de Lima: **267 archivos cotejados**, assets anteriores conservados y archivos cambiados respaldados en `tmp/web-before-carros-reference-20261015`. Evidencia `tmp/carros-reference-web-activation-20261015.json`. PDF.js 6.4.299: 200 recursos por raíz, huellas coincidentes en public/export/dist. Esto acredita archivos instalados, sin afirmar que un servidor o una pestaña los esté mostrando.

## Límites de cierre

Estas pruebas usan adaptadores simulados; no acreditan mutaciones reales ni comparación de píxeles. Faltan render real 1440×1024, tablet y 360×800, teclado, aumento de texto y lector de pantalla. No cerrar T413/T414, convergencia global ni el proyecto por estas comprobaciones. La restricción previa del navegador sigue vigente; no se abrió otra superficie para eludirla. La devolución financiera reservada a confirmación humana no se ha reenviado.
