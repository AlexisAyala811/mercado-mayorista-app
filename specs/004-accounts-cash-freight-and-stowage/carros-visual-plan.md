# Convergencia Carros

Fuente: MERCADO 18:459, contexto y captura recuperados el 15 de octubre; decisión humana de teléfono/placa separados en `docs/sdd/decision-referencias-en-operaciones-2026-10-14.md`. Mantener las entidades, permisos y reglas de 004 y `build_propuesta.py`; esta presentación no crea otro modelo comercial.

## Comportamiento verificable

- Mostrar nombre del transportista, teléfono y placa con etiquetas explícitas; no volver al N° ambiguo ni inventar correlativos. Vehículos sin transportista y transportistas sin vehículo deben seguir disponibles. Una relación histórica con transportista desactivado puede mostrarse, sin habilitar su edición como si fuera activo.
- Buscar entre todas las colecciones completas por los datos existentes, sin distinguir acentos/mayúsculas; búsqueda literal, vacío real y sin coincidencias diferentes. Conservar ambos formularios al buscar, limpiar o cambiar página; no escribir por navegar.
- Cuatro registros por página reproducen la capacidad del marco. Una fila por vehículo y otra por cada transportista activo sin vehículo; no se pierde ningún registro ni se inventan asociaciones. La misma persona puede figurar en varias filas cuando tiene varios vehículos. Mantener cada identificador original para editar/desactivar su entidad correspondiente.
- Mantener formularios separados de transportista/vehículo y sus borradores. El acceso + prepara un registro nuevo con confirmación si hay cambios pendientes; Cancelar conserva ambos formularios. Editar lleva el foco al formulario correspondiente. Se conservan las guardas existentes al reemplazar un registro o salir de ruta.
- Mantener los formularios en la misma pantalla, después de la composición de consulta, para que búsqueda y borradores sigan coexistiendo. El foco de TextInput utiliza el adaptador de teclado/desplazamiento existente. No agregar un modal que obligue a descartar el formulario para buscar.
- Guardado confirmado y fallo posterior de lectura se comunican por separado; reintentar lectura no repite escritura. Fallo de desactivación conserva el diálogo y el motivo. Bloquear doble escritura y cambios durante confirmaciones; autorización central permanece vigente.

## Traducción visual

Usar Inter y los seis activos originales cotejados con el contexto actual: búsqueda, campo, atrás, inicio, adelante y +. User original 54×54, con SVG 40×44.5, ya disponible; las cuatro instancias de fila tienen 54×54 en (16,16) y la de cabecera en (48,20). No usar el PNG de referencia como interfaz ni editar paths SVG.

El marco actual 1440×1024 sitúa la banda gris en (39,202), detrás de la primera fila, no detrás de la cabecera como el contexto histórico del 11 de octubre. Búsqueda en (159,134), 1127×61. Pares de filas en y=244/396/543/800; panel izquierdo 784×119, derecho 471×120, separación 26. Mantener la reserva de + entre tercera y cuarta fila, sin agregar registros ficticios para llenar el diseño. Navegación inferior: Atrás devuelve página o ruta según contexto; Inicio al menú; Adelante solo avanza si existe otra página, con nombres accesibles explícitos.

Reutilizar el SVG de campo a su tamaño original en la composición amplia. En compacto, pasar los datos a flujo y controles nativos adaptables, conservando iconos originales y evitando obligar a desplazar horizontalmente un campo de 621 px. El panel derecho adapta el N° original a teléfono/placa separados por la decisión humana; acciones de gestión siguen disponibles con objetivos táctiles. El contenido real, los estados y el aumento de texto pueden ampliar la altura; no recortar datos ni bloquear ventas por existencias.

## Secuencia y cierre

1. Proyección de registros sin perder vehículos ni transportistas; verificar relaciones ausentes/inactivas, búsqueda y claves.
2. Composición de consulta, paginación y navegación con activos locales; conservar permisos.
3. Integrar formularios existentes, foco, descarte de registro nuevo y resultado confirmado frente a recarga fallida.
4. Tipos/lint, regresiones de recorridos y paquete; comprobar las huellas de assets exportados.
5. Comparar render real en 1440×1024, tablet y 360×800, teclado/aumento de texto/lector de pantalla. No cerrar 004 ni fidelidad por estilos, tests o exportar.
