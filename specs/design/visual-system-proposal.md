# Propuesta de sistema visual v1

**Estado:** fundamentos técnicos implementados como propuesta; pendientes de convergencia y aprobación visual en Figma.

## Propósito y trazabilidad

Esta propuesta evita que las pantallas de la aplicación adopten estilos aislados. Debe alinearse con las especificaciones SDD y con la tarea documental antes de convertirse en una biblioteca aprobada.

- Alcance de producto: tablet Android para gestión comercial de papa.
- Referencia de interfaz existente: archivo Figma `MERCADO`.
- Marco de acceso creado para la especificación 001: `LOGIN · Acceso` (`62:79`).

## Inventario de la fase de descubrimiento

| Fuente | Hallazgo | Implicación |
|---|---|---|
| Repositorio | Existe la aplicación Expo en `mercado-app`, con tokens semánticos y componentes transversales. | El código constituye una línea base técnica, pero sus valores visuales requieren convergencia con Figma. |
| Figma local | Una página, 15 marcos; sin componentes, estilos locales ni sistema de tokens estructurado. | Es necesario construir fundamentos antes de reutilizar controles locales. |
| Variables locales | `Collection 1` contiene solo `Color`, con alcance `ALL_SCOPES`. | No es apta como base de un sistema visual; no se modifica hasta definir migración. |
| Bibliotecas | Material 3 y Simple Design System están suscritas. | Evaluar reutilización antes de crear cada componente; no depender de ellas hasta comprobar importación y API. |
| Diseño heredado | Las pantallas existentes usan una apariencia gris/neutra y campos sin una convención consistente. | Requieren convergencia gradual; no deben dictar tokens incompletos. |

## Alcance v1 propuesto

### Fundamentos

- Colecciones: `Primitives`, `Color`, `Spacing` y `Radius`.
- Modo inicial: `Light`; el modo oscuro se evaluará al contar con requisitos de operación nocturna o preferencia de usuario.
- Tipografía: Inter para contenido y controles; conservar Raleway o Bentham solo si la tarea de diseño confirma un uso de marca.
- Estilos: título de pantalla, encabezado de sección, cuerpo, etiqueta, ayuda y error; una elevación de tarjeta.

### Controles prioritarios

1. Botón primario y secundario.
2. Campo de texto con etiqueta, ayuda y error.
3. Tarjeta de información.
4. Estado de carga, vacío, éxito y error.
5. Barra superior y navegación para tablet.

Los controles implementados consumen tokens centralizados. No deben introducir valores visuales aislados por pantalla.

## Implementación técnica disponible

- `AppScreen`: área segura, desplazamiento, ancho máximo y espaciado adaptable.
- `ScreenHeader`: jerarquía común de contexto, título, descripción y acciones.
- `AppCard`: superficie agrupadora con encabezado opcional.
- `FormSection`: composición acotada para campos y acciones de formulario.
- `AppButton`, `FormField` y `FeedbackState`: acciones, entradas y estados semánticos iniciales.
- `LoadingState` y `EmptyState`: carga indeterminada y ausencia de resultados con anuncios accesibles y reintento opcional.

Estos componentes son infraestructura transversal. Su existencia no aprueba una pantalla funcional ni resuelve contenido, permisos o comportamiento de negocio.

## Dirección visual propuesta para validación

La pantalla de acceso sugiere un verde profundo para acciones e identidad, superficies claras y texto de alto contraste. Se propone usar esa dirección como punto de partida y validarla contra las pantallas operativas, sin convertir los valores concretos en tokens aprobados todavía.

## Prioridad visual indicada por el usuario — 6 de octubre de 2026

Los controles de elección conservan su apariencia mientras exponen al lector de pantalla su semántica: radio y estado marcado para opciones excluyentes; casilla y estado marcado para selecciones múltiples. La selección no puede depender únicamente de un color o de un símbolo visual. Esta corrección de estados no certifica la convergencia de composición, fuentes o activos con Figma.

El frontend debe reproducir con alta fidelidad las interfaces del archivo MERCADO. La propuesta verde anterior no autoriza rediseñar las pantallas operativas. Para cada marco se deben conservar composición, colores, tipografía, espaciado, formas y activos originales; la adaptación móvil conserva esa identidad y las reglas funcionales aprobadas. La aprobación de reglas de negocio no equivale a aprobar divergencias visuales.

El contexto detallado obtenido de COMPRA (`1:346`, 1440 × 1024) identifica fondo blanco, campos `#D9D9D9`, paneles `#F4F4F4`, cabecera/pie `#F6F6F6`, contornos negros y radio de 10 px en campos/paneles. Se implementa inicialmente una paleta acotada a la ruta de compra, reutilizando componentes existentes. Este corte cubre superficies y controles; no constituye todavía una reproducción completa de la composición, tipografía ni iconos.

Criterios de cierre visual: comparar capturas a las dimensiones del marco, revisar posiciones y geometría de cada control/activo, y comprobar estados reales y tamaños móviles sin ocultar campos ni alterar permisos. Registrar diferencias por pantalla y resolverlas antes de cerrar la convergencia. El límite del conector Starter impide recuperar nuevos contextos detallados; no se deben sustituir los activos de Figma por aproximaciones.

## Evidencia de convergencia disponible al 30 de septiembre de 2026

Se inspeccionó el archivo `MERCADO` mediante el conector de Figma. El marco `MENU` (`1:131`) confirma una barra de cuenta, acceso por tarjetas y agrupación de las operaciones principales. El marco `LOGIN` (`62:79`) confirma una composición de identidad y formulario en dos áreas para tablet. La aplicación conserva esas relaciones, pero adapta el menú a los trece módulos autorizados y cambia a una sola columna en anchos compactos, de acuerdo con los requisitos actuales.

La verificación ejecutada en Expo Web cubrió el acceso, la persistencia de sesión, la entrada al menú, la presencia de todos los módulos del mayorista y la adaptación a un ancho compacto. Durante esta prueba se corrigieron dos diferencias observables: la cola cifrada ya no intenta abrir un archivo nativo en web y la cabecera de cuenta apila el cierre de sesión para evitar que el nombre se fragmente.

No se declara todavía una convergencia visual completa. El plan Starter de Figma agotó el límite de llamadas al solicitar el contexto detallado de `LOGIN`, `COMPRA`, `VER COMPRAS`, `Carros`, `Deudas` y los marcos de comprobante. Sus metadatos y jerarquías están identificados, pero la comparación de medidas, estados y contenido debe retomarse cuando el conector permita nuevas lecturas.

## Brechas y decisiones pendientes

1. El usuario resolvió la dirección visual: reproducir cada interfaz original de MERCADO. La propuesta verde no es una identidad aprobada para todas las pantallas. Restan obtener y aplicar los valores exactos de cada marco.
2. Decidir la estrategia de modo oscuro para la operación de madrugada.
3. Confirmar que los controles de Material 3 pueden importarse y parametrizarse en este archivo. La búsqueda y evaluación adicional quedó bloqueada por el límite del plan de Figma.
4. Definir la migración o retiro de `Collection 1/Color`; no debe coexistir como un token ambiguo con las nuevas colecciones.

## Criterio para pasar a construcción

La fase técnica de fundamentos puede avanzar con componentes neutrales y accesibles. La aprobación visual y la construcción de la biblioteca en Figma requieren restablecer su acceso de contexto, validar activos reutilizables y reconciliar los tokens actuales.

## Ajuste de acceso compacto verificado

En 360 × 800, mantener Usuario, Contraseña y la acción principal en la primera vista sin errores desplegados, conservar ayuda y aviso por rol en contenido desplazable y evitar márgenes de formulario acumulados. Usar título compacto de 26/32 px, espaciado de tokens y centrar el bloque. La composición amplia conserva el diseño de dos paneles. Evidencia de navegador: `docs/sdd/frontend-web-verification.md`; la validación nativa con teclado permanece pendiente.
