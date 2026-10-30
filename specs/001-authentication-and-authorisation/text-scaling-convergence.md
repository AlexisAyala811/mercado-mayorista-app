# Convergencia de texto ampliado: menú y Carros

La prueba Android de 15 de octubre, texto del sistema 2.0 y tablet 1280×800, muestra títulos de tarjetas MENU superpuestos con imágenes. La especificación exige controles táctiles, accesibilidad y adaptación sin recortar contenido. Es una corrección de presentación dentro del alcance aprobado, sin cambiar módulos, permisos, navegación ni reglas de negocio.

Cuando el texto supera la composición de referencia, pasar las tarjetas a flujo: título con ancho disponible y salto de línea, imagen original debajo, altura determinada por contenido y una columna. Mantener la composición original para escala de referencia. Usuario, rol y cierre deben poder ocupar varias líneas. No reducir ni desactivar el tamaño de fuente elegido por la persona para mantener el marco.

En Carros compacto, permitir varias líneas en los datos, resumen y acciones auxiliares, sin alturas rígidas que recorten texto; mantener iconos originales y objetivos táctiles. Conservar los mismos registros, formularios y borradores.

Verificar con capturas Android a escala 2.0 y volver a 1.0 al terminar. Probar navegación de módulos y conservación del estado al cambiar la configuración; TypeScript/lint y regresiones relevantes. Mantener pendientes 360×800, TalkBack y teclado de software hasta disponer de evidencia específica. El intento de orientación vertical actual no cambió las dimensiones; no equivale a una prueba de teléfono.
