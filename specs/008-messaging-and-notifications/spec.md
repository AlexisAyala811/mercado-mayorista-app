# Especificación 008 Mensajería y notificaciones

## Decisión expresa del usuario del 26 de octubre de 2026

El usuario aclara que desea compartir PDF, documentos Word e imágenes con el cliente/comprador o proveedor mediante correo o WhatsApp. El mecanismo es compartición manual y el alcance incluye documentación, diagramas, PPT y aplicación. Esta decisión sustituye las alternativas abiertas y cualquier propuesta previa de chat o envío automático.

CL-MN01, CL-MN02 y CL-MN03: resueltas. No se amplía el acceso del Encargado. El Mayorista selecciona la contraparte registrada y el archivo, revisa ambos y abre el selector del dispositivo. Elige WhatsApp o su aplicación de correo y confirma allí el destinatario y el envío. El canal previsto es informativo: el selector puede ofrecer otras aplicaciones y no permite comprobar cuál eligió ni su destinatario final.

HU15: Como mayorista, quiero compartir archivos PDF, documentos Word e imágenes con un comprador o proveedor por WhatsApp o correo mediante confirmación manual, para comunicar documentos relacionados con el negocio.

RF25: seleccionar un archivo PDF, DOC, DOCX o imagen compatible y una contraparte del negocio, revisar el archivo y solicitar compartición manual. Los comprobantes existentes se reutilizan desde HU10; no se duplican sus cálculos.

RF26: conservar metadatos de preparación e intento de compartición (usuario, negocio, contraparte, nombre, tipo, tamaño, canal previsto y UUID), sin subir el contenido del archivo al servidor. Los estados son preparado, compartición solicitada o fallido. No hay estados de entrega/lectura externa confirmada. Un reintento de la misma orden no crea otro registro.

Límite técnico inicial: un adjunto por intento y hasta 20 MiB. Se aceptan PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. El límite se presenta antes de compartir; las aplicaciones externas pueden imponer sus propios límites. Se valida nombre, extensión, MIME y tamaño como metadatos; esto no equivale a análisis antivirus del contenido.

Los avisos financieros HU14 reutilizan datos de cuentas. Lectura persistente, campañas, mensajería automática, programación en segundo plano, push y chat no se incluyen en este corte. Se conserva la consulta de alertas al corte, sin alterar su política financiera. La persistencia de archivos locales pendientes en offline no se añade a la cola comercial. El historial central conserva solo metadatos y no permite volver a descargar el adjunto.

La implementación debe preservar la sesión frente a respuestas tardías y limpiar los adjuntos temporales cuando el módulo se cierra o cambia de usuario, excepto el archivo ya entregado al selector mientras otro proceso lo necesita. No enviar adjuntos automáticamente al iniciar sesión, recuperar conexión ni pulsar reintento de consulta.


## Necesidad y responsabilidad

HU14 centraliza consultas de vencimientos sin escribir dinero. HU15 añade adjuntos genéricos, manteniendo HU10 como generación y compartición de comprobantes internos. Identidad protege todos los contratos y Auditoría conserva las transiciones de metadatos.

## Criterios de aceptación

1. El Mayorista selecciona un cliente/proveedor activo de su negocio y un archivo compatible.
2. Cancelar la selección no registra una compartición ni borra la selección anterior.
3. Se valida nombre, extensión, MIME y tamaño antes de abrir un selector.
4. El botón explícito prepara un registro central idempotente y después solicita compartición. Una respuesta tardía después de salir/cambiar sesión no abre aplicaciones.
5. Cinco reintentos de registro conservan un único UUID por negocio y no reabren el selector automáticamente.
6. Si falla conservar el resultado, se puede reintentar solo ese registro.
7. El historial muestra los últimos 50 intentos con canal previsto, contraparte y estado; no permite descargar el archivo, porque no conserva binarios.
8. La API rechaza al Encargado y no filtra contrapartes o metadatos de otro negocio.
9. Los avisos muestran cuenta/cuota, vencimiento, tipo, saldo y corte; dos cuotas diferentes con fecha/importe iguales no se fusionan.
10. Una falla o cancelación no modifica compra, venta, cuenta o caja. Una descarga web permanece preparada.

## Artefactos SDD relacionados

[Plan](plan.md), [tareas](tasks.md), [checklist](checklists/requirements.md). Estado: corte autorizado en implementación, convergencia nativa pendiente hasta observar el selector y las apps receptoras.
