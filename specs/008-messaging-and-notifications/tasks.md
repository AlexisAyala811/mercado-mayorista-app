# Tareas de Mensajería y notificaciones

- [x] Contrastar HU14, RF16 y RF23 con fuente documental y evidencia de alertas existentes.
- [x] Registrar incorporación del módulo y aclaraciones de canal, destinatarios y alcance de código.
- [ ] Actualizar todos los documentos del entregable y especificaciones relacionadas.
- [ ] Actualizar diagramas afectados y sus fuentes, distinguiendo nivel general y C4.
- [ ] Actualizar propuesta Word y presentación de diez diapositivas.
- [ ] Verificar trazabilidad, imágenes, enlaces y artefactos renderizados.
- [x] Resolver CL-MN01, CL-MN02 y CL-MN03 con el usuario.
- [x] Fijar contratos y diseño de datos suficientes antes de implementar.
- [ ] Implementar corte autorizado y pruebas pertinentes.
- [ ] Converger diseño, documentación, código y recorridos en dispositivo.

## Verificación y convergencia

- [x] Reconstruir e instalar cliente Android con DocumentPicker sin borrar datos; comprobar acceso, cancelación, selección de PNG público y apertura/cancelación del selector nativo. Un intento solicitado, sin envío externo, y catorce tablas comerciales/PDF conservadas. Corregir fechas del historial a Lima; 31 pruebas focalizadas, tipos/lint y exportación de 281 archivos aprobados. `docs/sdd/verificacion-adjunto-android-2026-10-26.md`.
- [ ] Comprobar receptores WhatsApp/correo reales y formatos restantes en dispositivo, accesibilidad y convergencia visual completa; la apertura del selector no acredita entrega.

- [x] Recuperar entorno, repetir suite completa y comprobar selección real del adjunto público y descarga web íntegra, sin entrega externa. Rechazo real del selector comunicado de forma comprensible; «Descargar copia» no crea otro intento ni cambia el anterior. 590 pruebas/82 suites, tipos/lint y paquete de 281 archivos; PostgreSQL confirma un intento fallido y catorce tablas comerciales/PDF conservadas. `docs/sdd/verificacion-descarga-adjunto-web-2026-10-26.md`.

- [x] Separar el estado de Mensajería por sesión del Mayorista y limitar la limpieza a copias individuales del selector; cubrir cancelación, selección tardía y reintento de metadatos sin reabrir la compartición. 24 pruebas focalizadas, tipos/lint y exportación/activación de 281 archivos aprobados. Evidencia: `docs/sdd/verificacion-ciclo-adjuntos-2026-10-26.md`.
- [x] Repetir la suite completa y probar selección real del adjunto tras recuperar la API y la revisión de ejecución. La evidencia posterior de 590 pruebas y selección/descarga real sustituye este bloqueo histórico; los fallos originales se conservan en `docs/sdd/verificacion-ciclo-adjuntos-2026-10-26.md`.

- [x] Integrar lectura del módulo con el QA compartido: ordenar/aplicar únicamente migración 026, verificar conservación de catorce tablas comerciales/PDF, arrancar API compilada y comprobar destinatarios/historial/avisos 200 desde la pantalla. Exportación de 281 archivos instalada y revisión web a 360 sin desbordamiento; no se seleccionaron archivos ni se compartió hacia terceros. Evidencia `docs/sdd/verificacion-costos-sesion-fechas-2026-10-26.md`.

No cerrar la verificación en dispositivo sin observar el selector nativo y las aplicaciones receptoras. La migración no se ejecuta contra producción en esta revisión.
