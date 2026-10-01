# Atributos de Calidad

Los atributos de calidad describen las condiciones que debe cumplir la aplicación móvil de gestión comercial para garantizar un funcionamiento adecuado durante las operaciones del mayorista.

| ID | Atributo de calidad | Escenario de calidad |
|---|---|---|
| AC01 | Rendimiento | Durante el registro de pesos, la aplicación debe guardar cada peso localmente en menos de 1 segundo y las consultas principales deben responder en menos de 3 segundos en condiciones normales de uso. |
| AC02 | Disponibilidad | Ante una interrupción temporal de Internet, la aplicación debe permitir continuar registrando las operaciones autorizadas y sincronizarlas cuando se recupere la conexión. |
| AC03 | Integridad | Si una operación de sincronización se reintenta varias veces, el sistema debe conservar un único registro confirmado y evitar duplicaciones en inventario, pagos o saldos. |
| AC04 | Seguridad | El sistema debe impedir el acceso no autorizado a la información del negocio y aplicar permisos según el rol del usuario. |
| AC05 | Usabilidad | La aplicación debe permitir que el mayorista o encargado registre un cargamento mediante una interfaz sencilla, clara y adecuada para el uso táctil en tablet. |
| AC06 | Escalabilidad | La arquitectura debe permitir aumentar la capacidad del sistema cuando crezca la cantidad de usuarios, operaciones o negocios registrados. |
| AC07 | Mantenibilidad | Los cambios en reglas de negocio, como cálculo de flete, estiba o saldos, deben poder realizarse sin afectar innecesariamente otros módulos del sistema. |
| AC08 | Recuperación | Ante una falla o pérdida de la base de datos central, el sistema debe contar con mecanismos de respaldo y restauración que permitan recuperar la información operativa. |