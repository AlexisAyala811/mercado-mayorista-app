# User original de Compra: implementación y revisión Android

Plan y alcance: `specs/002-reception-weighing-and-purchase-settlement/purchase-user-plan.md`. Contexto actual de Figma en `contexto-user-compra-2026-10-16.md`. `OriginalUserIcon` recibe una variante Compra que conserva su SVG propio; no se asume identidad de bytes con MENU/Carros. Instancia 54×54, imagen 40×44.5, desplazamiento interno (7,4.75). SVG 563 bytes, SHA256 E4BEF75791985A8D2AC883E60EBBE42460968B6180486DE93A56507328864B44.

La cabecera compartida usa esa variante en pesaje y liquidación. Android 1280×800 muestra el vector completo, separado del nombre real del usuario. La banda comienza en y=115, después del estado operativo y separación de pantalla; instancia en x=48/y=126. Se conserva la posición relativa de Figma (48,20) dentro de la composición, sin ocultar la banda de sincronización. No equivale a comparar todo el marco 1440×1024.

Se reabrió del historial la recepción `0261c947-7813-4745-bf93-9d080be48b14`, borrador versión 0, sin sacos. Después se consultó la recepción pesada `b374bb89-aeba-4bdc-885d-243b5920e8be`, versión 3, dos sacos/35 kg, y se abrió su etapa de liquidación. Se volvió al menú sin ingresar precio, añadir sacos, corregir ni confirmar liquidación. La expiración de sesión durante una demora produjo GET 401; se renovó el acceso ficticio y se repitieron únicamente lecturas. Un wait inicial por role heading agotó su plazo aunque Compra sí estaba visible; se verificó mediante captura/árbol y el selector por etiqueta.

Evidencias: `tmp/android-purchase-user-weighing-observed-20261016.png` y `.json`, `tmp/android-purchase-user-settlement-observed-20261016.png` y `.json`; grabación oficial `tmp/android-purchase-user-review-20261016.ad`, 29 acciones, credenciales representadas mediante variables. Grabación publicada, no reproducida. Las primeras capturas con sufijo weighing sin observed muestran carga y no acreditan el render final.

Tipos/lint y 501 pruebas/69 suites aprobados: `tmp/purchase-user-check-20261016.log`, salida 0. Export web 20 rutas, instalación local de 268 archivos cotejados con respaldo y activos anteriores conservados: `tmp/purchase-user-web-activation-20261016.json`. PDF.js 6.4.299, 200 recursos por raíz, cotejado en public/export. La instalación no afirma carga del paquete en navegador.

Este corte verifica el activo de cabecera en sus dos llamadas nativas. Siguen abiertos T217–T219, otros tamaños, geometría restante, texto ampliado, TalkBack y teclado de software. No certifica todo el frontend ni produce efectos comerciales.
