# Convergencia del login con Figma

Fecha: 10 de octubre de 2026. Referencia: MERCADO, `LOGIN · Acceso`, nodo `62:79`, DS-001 y especificación 001.

El contexto completo y la captura de Figma volvieron a estar disponibles. Se recuperaron código de referencia, geometría, tipografía, colores y URLs de los dos SVG originales. No se implementó a partir de una captura aislada ni se convirtió esa captura en fondo de pantalla.

El login utiliza ahora panel lateral a altura completa y tarjeta independiente, Inter Regular/SemiBold/Bold local, fondo, radios y sombra de referencia. Se componen los controles existentes con opciones visuales acotadas; el aspecto predeterminado de otras pantallas permanece. AppScreen conserva área segura y asistencia de desplazamiento del teclado, con opción de composición a borde a borde.

La tarjeta crece si aparecen errores o recuperación de cierre. El título y descripción del panel están en flujo para corregir el solapamiento visible en el diseño de referencia; por ello no se declara igualdad literal de esa zona de texto. El botón vacío permanece deshabilitado conforme a la validación aprobada, aunque la referencia muestra un botón activo. Se mantienen contraseña protegida, validaciones, progreso, mensajes y «Reintentar cierre».

## Geometría y activos verificados

Render web 1440 × 1024: tarjeta en (760,187), 520 × 650. Campos: 432 × 56, posiciones (804,375) y (804,479). SVG superior: (255,−148), 450 × 450, dimensiones naturales 450 × 450. SVG inferior: (−185,765), 350 × 350, dimensiones naturales 350 × 350. Se usan ambos archivos originales mediante expo-image y contain, sin modificar ni reemplazar sus SVG.

Los archivos locales no vacíos, fuentes temporales y SHA-256 se registran en `mercado-app/assets/figma/original/manifest.json`. Los enlaces temporales no aparecen en el código de la pantalla. Captura y medición: `tmp/login-figma-wide-2026-10-10.png` y `tmp/login-figma-geometry-2026-10-10.json`.

En 360 × 800 se apilan identidad y tarjeta. La primera medición confirmó ausencia de desbordamiento horizontal y activos originales con dimensiones naturales correctas; detectó padding horizontal de 44 heredado de la tarjeta amplia. Se corrigió explícitamente a 24 para la composición compacta. La evidencia anterior `tmp/login-figma-compact-top-2026-10-10.png/.json` es diagnóstica y no acredita la corrección posterior.

La comprobación final confirma ancho de documento 360 sin desbordamiento horizontal; ambos campos miden 248,8 × 56. El desplazamiento permite acceder al botón y a todos los mensajes sin recorte. Evidencias finales: `tmp/login-figma-compact-final-top-2026-10-10.png`, `tmp/login-figma-compact-final-controls-2026-10-10.png` y `tmp/login-figma-compact-final-2026-10-10.json`. El viewport temporal fue restablecido y la vista local quedó disponible para revisión.

## Verificación y límites

Tipos y lint aprobados tras la composición y nuevamente tras la corrección final de padding compacto. Suite completa: 288 pruebas en 42 suites aprobadas, incluida recuperación de cierre con bloqueo del envío desde botón y teclado. La regresión específica del login se ejecutó nuevamente tras la corrección final y pasó; el render compacto final fue medido e inspeccionado. No se declara probado el nuevo aspecto del login en Android, lector de pantalla, aumento de tamaño de fuente ni las restantes pantallas Figma. El ensayo nativo de ventas quedó pendiente porque los procesos del 8 de octubre ya no estaban activos.

Se verificaron las APIs contra documentación oficial de Expo SDK 57, con Context7 y páginas versionadas https://docs.expo.dev/versions/v57.0.0/sdk/image.md y https://docs.expo.dev/versions/v57.0.0/sdk/font.md. No se actualizaron versiones de dependencias ni se publicó la aplicación.
