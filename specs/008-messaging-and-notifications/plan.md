# Plan de Mensajería y notificaciones

## Corte aprobado

La decisión expresa del usuario en spec.md fija compartición manual a WhatsApp/correo y alcance completo. Implementar selector nativo de archivos con expo-document-picker compatible con SDK 57 y expo-sharing existente. Android es la plataforma principal; en web comprobar capacidad de compartir File sin subirlo públicamente y ofrecer descarga/preparación explícita si el navegador no admite compartir. El usuario siempre confirma el destinatario en la aplicación externa.

API: MessagingModule con identidad/rol Mayorista, listado de contrapartes del negocio, consulta de avisos basada en ReportsService y registro idempotente de metadatos de compartición en PostgreSQL. Conservar los endpoints de reportes por compatibilidad. La tabla de intentos no almacena binarios ni URI locales. Auditoría registra las transiciones junto con los metadatos; no participa en modificar dinero.

Validar con pruebas de dominio (tipo/tamaño/transiciones), servicio (negocio, rol, idempotencia y auditoría), guardas de endpoints y UI (selección/cancelación, doble pulsación, cambio de sesión, falla de selector y ausencia de destinatario). Tipos y lint de ambas aplicaciones. Ejecutar migración de prueba solo en una base aislada si está disponible; no migrar producción ni atribuir éxito de envío real sin evidencia manual.

Documentación oficial consultada: https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/ y https://docs.expo.dev/versions/v57.0.0/sdk/sharing/. Context7 confirma que shareAsync no devuelve confirmación de entrega ni cancelación.


## Estrategia de verificación

### Ciclo del adjunto y sesión — 26 de octubre de 2026

La prueba real del navegador integrado devuelve permiso denegado aun cuando `canShare` anuncia soporte. Mostrar un mensaje comprensible y ofrecer una acción explícita «Descargar copia» para archivos web ya seleccionados. La descarga no vuelve a abrir el selector, no registra otro intento, no transforma un intento fallido en compartición solicitada ni acredita entrega. Mantener el estado central conservado y permitir al usuario adjuntar la copia manualmente fuera de Mercado.

La limpieza nativa se limita a archivos individuales del directorio DocumentPicker bajo Paths.cache, conforme a la copia solicitada al selector. No borrar documentos originales, URI de proveedores ni archivos de otras áreas de la aplicación. Conservar el archivo ya entregado al selector externo mientras otra app pueda leerlo. Validar también permisos y desmontaje en el componente, no solo en su ruta. Las respuestas tardías no deben reabrir selectores, cambiar otra sesión ni invalidar credenciales nuevas por un rechazo del token anterior. Verificar cancelación conservando la selección previa, selección tardía y reintento de metadatos sin volver a compartir.

Pruebas del dominio, servicio, guardas y UI. Tipos y lint de móvil/API. Migración y flujo de base solo en una base aislada, sin alterar datos reales. Verificar ausencia de envíos reales automáticos. En Android, reconstruir el cliente de desarrollo por el nuevo módulo nativo de DocumentPicker y comprobar selección, cancelación y confirmación manual en WhatsApp/correo.

La API reutiliza ReportsService para avisos y conserva los contratos anteriores de Reportes. El servidor no descarga adjuntos locales ni llama a WhatsApp, SMTP o un servicio de email. No se implementan lectura persistente de avisos ni programación automática.
