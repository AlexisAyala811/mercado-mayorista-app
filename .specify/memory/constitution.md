# Constitución del proyecto: Gestión comercial de papa

## Propósito

Construir una aplicación real para tablets Android que permita gestionar la operación comercial mayorista de papa con continuidad ante conectividad irregular, integridad de saldos y trazabilidad por negocio y usuario.

## Principios obligatorios

1. **Especificación antes de construcción.** Toda capacidad relevante requiere una especificación con reglas de negocio, criterios de aceptación, riesgos y trazabilidad a los requisitos del documento de propuesta.
2. **Integridad comercial primero.** Pesos y cantidades por operación, flete, estiba, pagos, cobros y saldos financieros son reglas de dominio. Una repetición de una operación no puede duplicar sus efectos. El sistema no calcula inventario ni saldo de mercadería.
3. **Seguridad y aislamiento en el servidor.** La autenticación, autorización por rol y negocio, y auditoría no dependen de ocultar botones en la interfaz.
4. **Continuidad offline.** Las operaciones autorizadas deben poder registrarse localmente durante una interrupción; la sincronización será diferida, idempotente y auditable.
5. **Diseño accesible para operación táctil.** La interfaz debe funcionar en tablet Android, con controles legibles, validaciones claras y estados de carga, vacío, éxito y error.
6. **Arquitectura modular.** Separar presentación, dominio, datos e integraciones. El núcleo transaccional no depende de los módulos de analítica o inteligencia artificial.
7. **Trazabilidad completa.** Toda creación, actualización o anulación conserva usuario, fecha, detalle y relación con la operación de origen.
8. **Verificación continua.** Una funcionalidad se considera terminada solo cuando requisito, diseño, implementación y pruebas concuerdan.

## Proceso SDD

Para cada funcionalidad: `specify` → `clarify` → `plan` → `tasks` → `implement` → `converge`.

Los documentos de propuesta, Figma y el código se revisan entre las tres tareas del proyecto. Un cambio detectado en cualquiera de ellas debe reflejarse en los artefactos SDD antes de avanzar.

## Alcance del sistema

El proyecto cubre acceso por roles, recepción y pesaje, compras, ventas y despachos como historial comercial, vehículos, flete, estiba, cuentas, caja, reportes, comprobantes, notificaciones, operación offline, auditoría y analítica progresiva. No calcula inventario, existencias restantes ni saldo de mercadería. Las fases de entrega pueden ordenar el trabajo, pero no reducen silenciosamente el alcance aprobado.

## Restricciones y drivers

- Tablets Android y conectividad irregular.
- Base central como fuente oficial de operaciones y saldos.
- Datos aislados por negocio.
- Registro manual de pesos durante el piloto.
- IA habilitada de manera progresiva según calidad y volumen de datos.
- Integraciones de facturación electrónica, GPS, pagos y balanzas requieren especificaciones futuras antes de incorporarse.

## Fuente de verdad

`build_propuesta.py` y `Propuesta_Aplicacion_Movil_Gestion_Comercial_Papa.docx` mantienen la línea base de actores, requisitos, atributos de calidad, restricciones y drivers. Esta constitución no los sustituye.

Mientras esos artefactos se reconcilian, la decisión aprobada del 7 de octubre de 2026 registrada en `docs/sdd/cambio-alcance-sin-inventario.md` prevalece sobre sus referencias anteriores a inventario o stock.

Las aclaraciones y sus estados se registran en `docs/sdd/clarificaciones-revision-agentes.md`. Las tareas de diseño y técnica no convierten una aclaración pendiente en una regla implícita.

## Mensajería y notificaciones — 26 de octubre de 2026

Mensajería y notificaciones organiza avisos financieros y compartición manual de archivos. Cuentas y caja conserva la autoridad sobre saldos y vencimientos. El Mayorista puede seleccionar un PDF, DOC/DOCX o imagen y un cliente/comprador o proveedor; después elige WhatsApp o correo y confirma destinatario y envío en la aplicación externa. El canal previsto no fuerza la aplicación final. Compartición solicitada no significa enviado, entregado ni leído. No se añade chat, envío automático, push ni acceso de mensajería al Encargado. La selección y compartición ocurren en Android mediante DocumentPicker y Sharing. La API autoriza, consulta avisos y conserva metadatos en message_share_attempts; no recibe el contenido de los archivos. Un adjunto por intento, hasta 20 MiB. PDF, DOC/DOCX, JPEG, PNG, WEBP, GIF y HEIC/HEIF. Los comprobantes PDF existentes se reutilizan desde HU10. En web, compartir requiere soporte de archivos del navegador; si falta, se prepara una descarga y no se declara compartición externa. La especificación 008 mantiene contratos, tareas y evidencia. HU15 añade adjuntos genéricos mediante RF25/RF26 sin renumerar historias anteriores.
