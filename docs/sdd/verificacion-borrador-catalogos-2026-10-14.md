# Conservación de edición de Datos maestros

Continúa RF04/CL-13 y la protección de formularios aplicada a compra/venta/logística. Plan: `specs/004-accounts-cash-freight-and-stowage/plan.md`. No modifica permisos, modelos ni cálculos monetarios.

## Comportamiento

Las cinco listas comparan los campos con el original o formulario vacío. Cambiar de lista, editar otro registro, cancelar edición, iniciar desactivación o salir pide confirmación ante cambios. Cancelar conserva todos los campos. Abrir sin modificar, restaurar los valores o pulsar el mismo registro/lista no pierde datos ni muestra aviso innecesario. Confirmar reemplazo solo cambia el formulario; desactivar requiere su confirmación nominal separada.

Volver/remover ruta conserva la acción original; historial web reutiliza la guarda compartida y recarga/cierre usa beforeunload. La escritura bloquea salida; el fallo conserva datos y la confirmación central limpia borrador aunque falle la recarga. Una referencia sincrónica conserva el primer destino e impide doble continuación. Si falla reanudar la navegación, se restaura protección con formulario presente. No se promete recuperación tras cerrar el proceso.

## Evidencia

- `npm run check`: tipos/lint y **483 pruebas / 68 suites** aprobados, `tmp/catalog-draft-frontend-check-20261014.log`. Un caso posterior de campos del comprador pasó con TypeScript y **16 pruebas enfocadas / 1 suite**, logs `tmp/catalog-draft-final-types-20261014.log` y `tmp/catalog-draft-focused-20261014.log`. No se presenta 484 como ejecución completa independiente. Lint del archivo final también aprobado.
- Casos: cancelar/confirmar lista sin escritura; campos de proveedor; mismo registro modificado; reemplazo/cancelación; restaurar original sin falso borrador; acción nativa/destino web; descarte antes de desactivar; escritura/fallo; callbacks rápidos; fallo de navegación; teléfono/destino/crédito del comprador y guardado confirmado. Navegación simulada no equivale a recorrido real.
- Export de 20 rutas código 0: `tmp/web-export-catalog-draft-20261014`, log `tmp/catalog-draft-export-20261014.log`. Entry `entry-66b6d6fa3ecbede3770c5c79b5f9033e.js`, SHA-256 `BFAD066683434FEF1EF327A7FB4F97DCFB3C1B21DFA2A7F618825BECE7BDE940`. PDF.js 6.4.299: 200 recursos por raíz verificados en export y dist.
- Instalados 260 archivos en dist, assets anteriores conservados, conflicto de asset inmutable rechazado y respaldo `tmp/web-before-catalog-draft-20261014`. `tmp/catalog-draft-web-activation-20261014.json`, 2026-10-15T03:03:47Z (14 de octubre, Lima). Helper admite nombres de artefacto acotados y conserva sus valores originales por defecto.
- Antes de reponer servicios se constataron listeners 3000/55437/8087 y procesos propios ausentes. No se dedujo actividad desde archivos de estado. Lanzador API 27720, Node 27072, PostgreSQL 22612 y web loopback 18112. Se observó pg_ctl vivo y se esperó al mismo arranque sin duplicarlo. Ready 200 a las 22:04:47 Lima; `tmp/catalog-draft-runtime-20261014.json`; logs QA con sufijo `catalog-draft-20261014`.
- Huellas de 14 tablas comerciales conservadas después del arranque: operaciones, saldos y PDF anteriores iguales. `tmp/characteristics-qa-activation-20261014.json` actualiza verified y conserva before/applied. No se ejecutó pago, venta, devolución ni desactivación real.

## Límites

CUA actual: navegadores sin pestañas y sin superficie nativa habilitada. No se abrió otro navegador para eludir la política que rechazó la antigua pestaña de error. Se pidió abrir una pestaña HTTP válida de QA; también se solicitó precisar N° de Carros. Solicitud asíncrona no equivale a respuesta. Faltan recorrido de navegador/Android, lector de pantalla y Figma; objetivo completo y gates de los siete módulos siguen abiertos. Instalación y pruebas no acreditan convergencia visual.
