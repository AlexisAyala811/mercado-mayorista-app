# Compra adaptable y liquidación compacta

Plan: `specs/002-reception-weighing-and-purchase-settlement/text-scaling-convergence.md`. Complementa la cabecera original verificada en `verificacion-user-compra-2026-10-16.md`. No cambia actores, reglas monetarias, inventario ni permisos.

## Cambios

Pesaje/liquidación usan su composición compacta desplazable cuando la escala de fuente supera 1.2, incluso con ancho de tablet. La composición Figma permanece para ancho ≥1100 y escala normal. No se reduce ni desactiva el texto ampliado.

La comprobación detectó que la liquidación compacta anterior omitía el detalle cerrado y los importes provisionales. Ahora permite consultar los sacos en diálogo de solo lectura con lista virtualizada y volver al formulario. El resumen utiliza `calculatePurchasePreview`, compartido con tablet: bruto, flete, líquido, cantidad/peso si el cálculo es válido y aviso explícito de pendiente o error. La confirmación se deshabilita cuando ese cálculo no es válido. La confirmación central y sus validaciones siguen a cargo del flujo existente.

## Verificación

- Tipos/lint y **503 pruebas / 69 suites**: `tmp/compact-settlement-final-check-fixed-20261016.log`, salida 0. Dos regresiones verifican invalidación del importe al exceder deducciones y consulta/retorno al mismo borrador sin enviar. Las pruebas iniciales fallaron por el mock que evaluaba exportaciones nativas diferidas y por un `children` requerido; se corrigieron ambos antes de la suite final.
- Android real del emulador 1280×800: escala leída 1.0, aplicada 2.0, restaurada y leída nuevamente 1.0. Teclado conservado `com.android.inputmethod.latin`. No se introdujeron campos ni se usó el teclado en este recorrido.
- Borrador existente `0261c947-7813-4745-bf93-9d080be48b14`: totales vacíos, captura completa de variedad/calidad/procedencia/peso/tara y botón final accesibles por desplazamiento. Retorno al historial conserva versión 0 y cero sacos.
- Recepción pesada existente `b374bb89-aeba-4bdc-885d-243b5920e8be`: dos sacos de 17 y 18 kg, versión 3. Liquidación compacta al 200 %, detalle cerrado legible, regreso al formulario, resumen con precio pendiente y botón «Confirmar liquidación» visible/deshabilitado (320×52). No se pulsó.
- `tmp/purchase-accessibility-evidence-20261016.json` coteja árboles, dimensiones, capturas/grabaciones, escala restaurada, teclado, pruebas y log de API. Ese log contiene únicamente POST de autenticación; no registra escrituras comerciales. Esto no sustituye una comparación de toda la base PostgreSQL en este corte.
- Grabaciones publicadas de SDK: `tmp/android-purchase-user-review-20261016.ad` (29 acciones) y `tmp/android-purchase-text-review-20261016.ad` (41 acciones); no reproducidas. La sesión de automatización se cerró con el menú restaurado, sin apagar servicios ajenos.

Capturas finales principales: `tmp/android-purchase-text-weight-fields-200-20261016.png`, `tmp/android-compact-settlement-closed-detail-20261016.png`, `tmp/android-compact-settlement-summary-20261016.png`, `tmp/android-compact-settlement-disabled-confirm-20261016.png`. El recorrido del SDK agotó un desplazamiento por un selector de radio no compatible; se reabrió la consulta y se seleccionó el filtro visible por referencia actual. No se atribuye ese fallo al producto.

## Paquete y límites

Paquete final de 20 rutas `tmp/web-export-compact-settlement-final-20261016`, exportación salida 0. Activación local de 268 archivos cotejados y respaldo en `tmp/web-before-compact-settlement-final-20261016`; evidencia `tmp/compact-settlement-final-web-activation-20261016.json`. PDF.js 6.4.299 y 200 archivos por raíz verificados en public/export/dist. Sustituye los paquetes intermedios del mismo día. No acredita render del nuevo paquete en navegador ni compilación nueva de APK.

Pendientes: todos los marcos Figma, teléfono/otros tamaños, TalkBack, teclado de software, edición conservada al cambiar escala con datos escritos y recorridos críticos/financieros restantes. La consulta de importes válidos/invalidación del resumen nuevo está cubierta por pruebas de componente; en Android se comprobó el estado pendiente. Este corte no cierra T214/T215/T217–T219 ni todo el frontend.
