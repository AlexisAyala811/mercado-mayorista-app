# Convergencia parcial de MENU: textos y cabecera adaptable

Fecha: 7 de octubre de 2026. Fuente de diseño: contexto completo `tmp/figma-recovered-context/context-1.tsx.txt`, Figma MERCADO 1:131 y captura original `tmp/figma-menu-reference-2026-10-07.png`. Se aplicaron los skills figma-design-to-code y figma-use. No se modificó Figma. La lectura programática de MENU/User/Usuario respondió límite de llamadas Starter; no se repitió.

## Diferencias corregidas

El centrado genérico desplazaba Compra 6.9 px y Venta 2.6 px a la derecha de los valores del contexto; Usuario estaba 2.5 px arriba. Los textos amplios usan los offsets originales: Usuario 16 px desde la barra; Compra (97,17) y Venta (116,17) desde cada pestaña. El nombre sigue siendo el usuario real y conserva rol/cierre de sesión.

Al verificar a 360×800, la cabecera conservaba una altura de 75 px que comprimía el texto del usuario hasta 0 px. Separar altura de referencia (solo tablet) de altura automática compacta y evitar la reducción del texto deja una cabecera de 116.8 px y nombre de 28.8 px. El ancho del documento y su contenido siguen siendo 360 px, sin desbordamiento horizontal. Pestañas móviles mantienen centrado y controles táctiles.

## Evidencia y coordenadas

En 1440×1024, descontando el indicador funcional de sincronización de 57.600002 px y considerando el borde de 1 px del marco original:

| Texto | Rectángulo de la app sin indicador | Objetivo del contexto | Resultado |
|---|---|---|---|
| Usuario | x129 / y39 | x128+1 / y38+1 | Coincide |
| Compra | x469 / y146 | x468+1 / y145+1 | Coincide |
| Venta | x871 / y146 | x870+1 / y145+1 | Coincide |

Además, seis usos visibles de los cinco activos originales de MENU cargaron y coincidieron en posición y dimensiones con el contexto: ANOTE, libro 24×24, VER COMPRAS, CARROS y los dos placeholders 229×247. Se comprobaron archivos locales no vacíos y tamaños de manifiesto; no se editaron ni sustituyeron activos o SVG. La corrección compacta no altera los rectángulos de tablet: nueva comprobación conserva barra de 75 px y los offsets anteriores.

Artefactos: `tmp/menu-text-geometry-2026-10-07.json`, `tmp/menu-text-geometry-checks-2026-10-07.json`, `tmp/menu-compact-header-geometry-2026-10-07.json`. Capturas finales: `tmp/menu-text-convergence-2026-10-07.png` y `tmp/menu-text-convergence-compact-2026-10-07.png`. La captura compacta final sustituye la que mostraba el defecto detectado, no es evidencia del estado anterior.

TypeScript, lint y las cinco pruebas existentes de navegación/permisos del menú pasan después de los ajustes. La última suite completa anterior contiene 221 pruebas/35 suites; este corte verificó las cinco afectadas y el render real en ambos tamaños. No se añadieron tests que repitan estilos. Se restauró el viewport habitual del navegador.

## Convergencia todavía incompleta

User 1:137 sigue sin implementarse: el contexto identifica Code Connect/SDS tamaño 48 pero no da posición y la consulta adicional está limitada por cuota. No inferirla de píxeles, sustituir el componente conectado o declarar T017 cerrado. Indicador global, rol y cierre de sesión son extensiones funcionales vigentes; MÁS OPERACIONES sustituye el nombre sin significado del marco. La sección Venta, otros marcos y Android requieren aún contexto/verificación. Los controles de permisos y el alcance sin inventario permanecen vigentes; el objetivo completo de frontend sigue activo.
