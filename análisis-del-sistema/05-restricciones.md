# Restricciones del Sistema

Las restricciones representan las condiciones y limitaciones que deben respetarse durante el desarrollo y funcionamiento de la aplicación móvil de gestión comercial para mayoristas de papa.

| ID | Restricción | Descripción |
|---|---|---|
| RC01 | Plataforma móvil | La primera versión del sistema debe funcionar principalmente en tablets Android. |
| RC02 | Conectividad irregular | La aplicación debe poder continuar registrando operaciones autorizadas cuando no exista conexión a Internet y sincronizarlas posteriormente. |
| RC03 | Registro manual de pesos | Durante el piloto, el peso de cada saco será ingresado manualmente por el usuario. |
| RC04 | Base de datos central | PostgreSQL será la fuente oficial de las operaciones, inventario, pagos y saldos del sistema. |
| RC05 | API REST | La comunicación entre la aplicación móvil y el backend debe realizarse mediante una API REST versionada. |
| RC06 | Control de versiones | El código fuente y la documentación del proyecto deben gestionarse mediante Git y mantenerse en un repositorio GitHub. |
| RC07 | Seguridad por negocio | Los datos de cada negocio deben mantenerse aislados y solo podrán ser consultados por usuarios autorizados. |
| RC08 | Inteligencia artificial progresiva | Las funciones predictivas de inteligencia artificial solo se habilitarán cuando exista información histórica suficiente y de calidad. |
| RC09 | Alcance del MVP | La primera versión no incluirá facturación electrónica, GPS, pasarela de pagos ni integración directa con balanzas electrónicas. |
| RC10 | Presupuesto y capacidad operativa | La arquitectura debe ajustarse a los recursos disponibles y priorizar una implementación gradual antes de incorporar infraestructura más compleja. |
