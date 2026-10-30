# Texto ampliado en MENU y Carros

Plan: `specs/001-authentication-and-authorisation/text-scaling-convergence.md`. Prueba real en Android el 15 de octubre, aproximadamente 20:05–20:17 de Lima; artefactos con sufijo UTC 20261016. Misma app/emulador y API de QA del recorrido de Carros anterior. No se cambiaron módulos, actores, permisos ni reglas comerciales.

## Hallazgo y corrección

El SDK leyó escala original **1.0** y aplicó `accessibility-extra-large`, valor Android **2.0**. El cambio recreó la actividad y volvió al menú con sesión vigente. La captura que inicialmente se llamó `android-carros-text-200-before-20261016.png` muestra ese **menú**, no Carros: los títulos ANOTE, VER COMPRAS y CARROS se partían y superponían a sus imágenes.

El menú ahora utiliza una columna y tarjetas en flujo cuando el texto ampliado supera la composición de referencia. Títulos con ancho disponible, imagen original después del título y altura automática explícita. Usuario y acciones permiten flujo y salto de línea; las pestañas compactas pueden crecer. La composición y orden de capas originales se conservan para escala normal.

La primera variante adaptable aún retenía altura de 279 px y la imagen quedaba parcialmente recortada. La captura y sus rectángulos mostraron el problema; declarar altura `auto` lo resolvió. En la tarjeta Carros corregida: **310 px de altura**, título termina antes de la imagen y la imagen conserva **175×175**, completamente dentro de la tarjeta. No se redujeron fuentes ni se deshabilitó el aumento para hacer caber el marco.

Carros usa disposición compacta al ampliar texto; sus datos admiten varias líneas, el resumen admite crecimiento y los bloques compactos sustituyen explícitamente las dimensiones/flexión de la variante amplia. Se eliminó la restricción de una línea para nombre, descripción, teléfono y placa en compacto. Se verificó entrada desde la tarjeta ampliada, datos reales y controles Editar/Desactivar, + y navegación inferior mediante desplazamiento. No se pulsó ninguna mutación de logística.

## Evidencia y restauración

- `tmp/text-scaling-native-evidence-20261016.json`: comprobación de escala, superposición anterior y geometría corregida a partir de los árboles capturados, huellas de capturas, controles observados de al menos 44×44 y ausencia de escrituras comerciales en el log de esta instancia API.
- Captura anterior: `tmp/android-carros-text-200-before-20261016.png`. Captura corregida de la tarjeta: `tmp/android-menu-text-200-height-auto-20261016.png`.
- Carros al 200 %: `tmp/android-carros-text-200-after-20261016.png` y `tmp/android-carros-text-200-actions-20261016.png`.
- Se restauró **1.0** mediante la categoría original leída y el SDK volvió a consultarlo: `tmp/android-text-size-restored-20261016.json`. Menú restaurado observado en `tmp/android-menu-text-restored-20261016.png`.
- Código final: TypeScript, lint y **501 pruebas / 69 suites**, registro `tmp/text-scaling-paint-order-check-20261016.log`, código 0. No se agregaron pruebas que solo repliquen estilos; la comprobación del recorte se apoyó en render nativo y medidas observadas.
- Documentación vigente consultada con Context7: [comandos oficiales del SDK](https://github.com/callstack/agent-device/blob/main/website/docs/docs/commands.md). Se usaron lectura/escritura `text-size` y gestos del SDK existente, sin comandos directos para operar la UI.

La orientación vertical fue solicitada pero el SDK respondió sin confirmación y el render mantuvo **1280×800**. No equivale a teléfono ni se intentó usar un navegador alternativo. El comando de viewport documentado es de web; no se utilizó como sustituto de Android. Permanecen pendientes 360×800, TalkBack, teclado de software, otros módulos con texto ampliado y convergencia con el marco Figma 1440×1024. Este recorrido no cierra T413/T414 ni el objetivo completo.

## Paquete final

Exportación de 20 rutas con código 0 en `tmp/web-export-text-scaling-final-20261016`; registro `tmp/text-scaling-final-export-20261016.log`. Entrada SHA256 `D452CCCB23C0626CD696F30080FEF32EBF5D63C448E3D55F0C74755A8DE5D77A`.

Instalación local en dist a las 20:18 de Lima: 267 archivos cotejados, respaldo `tmp/web-before-text-scaling-final-20261016`, assets previos conservados y evidencia `tmp/text-scaling-final-web-activation-20261016.json`. PDF.js 6.4.299 y 200 recursos por raíz verificados en public/export/dist. La versión intermedia se conserva como evidencia; el paquete final incluye el orden de capas original para escala normal. No se afirma carga de este paquete en navegador, cuya restricción continúa vigente.
