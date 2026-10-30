# Búsqueda de logística y referencia Carros

Fecha: 11 de octubre de 2026. Alcance: DS-030 y 004.

Se recuperó el contexto completo y captura de Carros (`18:459`). Su referencia tiene barra de búsqueda, cuatro filas, navegación, seis activos y cinco instancias conectadas de User. El repositorio no contiene el componente conectado y la respuesta no aporta una ruta de implementación. Un contexto de instancia devolvió únicamente el snippet User; las siguientes consultas de contexto/mapeo encontraron el límite Starter. El campo N° no tiene semántica suficiente; se solicitó aclaración de teléfono o placa, sin asumir una respuesta.

El contexto íntegro se conserva en `tmp/figma-carros-context-2026-10-11.txt`. Los seis activos originales se descargaron sin alteración a `mercado-app/assets/figma/original/carros`, con tamaño y SHA-256 en manifest.json y `tmp/figma-carros-assets-2026-10-11.json`. Son material de referencia preparado; aún no están aplicados a una composición final y no prueban equivalencia visual. No se sustituyó el componente conectado por una aproximación.

Se implementó la búsqueda funcional independiente del campo ambiguo: nombre/teléfono del transportista y placa/transportista/descripción del vehículo, sobre las colecciones completas ya implementadas. Busca sin distinción de mayúsculas o acentos y trata el texto como subcadena literal. La pantalla distingue colecciones vacías de búsqueda sin coincidencias, muestra recuentos y permite limpiar. Buscar/limpiar conserva el formulario en edición y no registra operaciones.

Verificación: dos casos de dominio para nombres, teléfonos, placas, descripción, relación ausente, texto literal y limpieza; un caso de componente para estados sin coincidencias y edición conservada sin mutaciones. Tipos y lint aprobados; 324 pruebas en 48 suites aprobadas. La composición final, componentes conectados, significado de N°, recorrido Android, lector de pantalla y prueba HTTP completa siguen pendientes.

El inventario de diseño se reconcilió con la decisión sin inventario del 7 de octubre: DS-022 retirado con ID reservado, despacho sin disponibilidad y reportes sin margen por lotes ni alertas de stock. Esto corrige descripciones históricas, sin añadir ni retirar nuevas funciones.
