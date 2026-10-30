# Recuperación de cierre de sesión fallido

Fecha: 8 de octubre de 2026. Referencias: HU07, RF01, especificación y plan 001.

La pantalla de acceso indicaba que se debía reintentar el cierre si fallaba retirar credenciales locales, pero no tenía una acción disponible para ello. Se añadió «Reintentar cierre» con progreso «Retirando sesión…», conservando el mensaje de fallo y el bloqueo de rutas. Tanto el botón de ingreso como el envío desde teclado quedan bloqueados mientras la retirada esté pendiente; el proveedor aplica la misma regla antes de llamar a la API.

Una revalidación durante este estado intenta retirar las credenciales, sin leer ni restaurar la copia anterior. El reintento comparte el ejecutor serial y la protección frente a respuestas tardías. Tras una retirada exitosa vuelve a habilitarse el acceso. La revocación central se sigue intentando aunque falle la retirada local. No se borra la cola ni los catálogos comerciales.

Se añadieron cinco pruebas de regresión: bloqueo del login y acceso posterior a retirada exitosa; fallo repetido sin restauración offline; progreso mientras la retirada está aplazada; rechazo central con retirada fallida sin promesa no capturada; y acción visible conectada con bloqueo de envío por botón y teclado. Resultado: 288 pruebas en 42 suites, tipos y lint sin errores.

Jest no pudo cargar dentro del sandbox por EPERM al resolver su directorio temporal; la ejecución autorizada fuera del sandbox pasó. Esta evidencia cubre componentes y proveedor, no un fallo físico inducido de SecureStore en Android. Si el dispositivo no permite ninguna escritura/retirada, no se garantiza borrado persistente tras reiniciar el proceso; el mensaje no presenta el cierre como exitoso.
