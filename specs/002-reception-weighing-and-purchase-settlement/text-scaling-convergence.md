# Compra con texto ampliado

La composición de referencia de pesaje/liquidación distribuye captura y resumen en columnas con encabezado fijo. Es adecuada para ancho amplio y escala normal, pero no tiene espacio suficiente para el texto ampliado del dispositivo. Las reglas vigentes exigen accesibilidad y adaptación; no cambia el negocio, permisos ni datos.

Usar las variantes compactas existentes cuando la escala de fuente supere 1.2, incluso en una tablet amplia; mantener la referencia Figma para ancho al menos 1100 y escala hasta 1.2. No reducir ni desactivar el escalado elegido. Conservar campos, acciones, valores controlados, sacos, guardas y estado de liquidación al cambiar entre variantes. Las variantes compactas ya permiten desplazamiento del contenido y usan las mismas propiedades y callbacks.

Verificar tipos/lint/regresiones y el render Android al 200 %, incluyendo ambos pasos con recepciones existentes, sin altas ni confirmaciones comerciales. Restaurar la escala original y comprobarla mediante SDK. No acreditar teléfono, TalkBack ni teclado de software por esta prueba.

La comprobación encuentra que liquidación compacta carece de detalle cerrado y previsualización disponibles en tablet. Completar esa equivalencia: acceso al detalle inmutable mediante lista virtualizada en diálogo, importes provisionales calculados con `calculatePurchasePreview`, aviso de pendiente/error y confirmación deshabilitada mientras ese cálculo no sea válido. Reutilizar reglas monetarias aprobadas; no calcular importes alternativos ni enviar al servidor por abrir el detalle o cambiar campos. Verificar precio válido, exceso de deducciones y conservación del borrador al abrir/cerrar el detalle.
