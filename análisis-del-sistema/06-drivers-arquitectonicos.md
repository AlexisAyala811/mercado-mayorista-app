# Drivers Arquitectónicos

Los drivers arquitectónicos representan los requisitos, atributos de calidad y restricciones que influyen significativamente en las decisiones de arquitectura de la aplicación móvil de gestión comercial para mayoristas de papa.

| ID | Driver arquitectónico | Origen | ¿Por qué influye en la arquitectura? |
|---|---|---|---|
| DA01 | El sistema debe permitir continuar registrando pesajes y operaciones autorizadas cuando no exista conexión a Internet. | AC02 – Disponibilidad / RC02 – Conectividad irregular | Puede influir en la necesidad de almacenamiento local, sincronización diferida y manejo de operaciones pendientes. |
| DA02 | El sistema debe evitar la duplicación de operaciones durante los reintentos de sincronización. | AC03 – Integridad | Puede influir en el uso de identificadores únicos, validación de duplicados, transacciones e idempotencia. |
| DA03 | El sistema debe proteger la información comercial y restringir el acceso según el rol del usuario. | AC04 – Seguridad / RC07 – Seguridad por negocio | Puede influir en autenticación, autorización, control de acceso y aislamiento de los datos de cada negocio. |
| DA04 | El sistema debe registrar cada peso de saco de manera rápida durante la descarga del cargamento. | AC01 – Rendimiento | Puede influir en el procesamiento local, almacenamiento temporal y diseño de la interacción entre la aplicación móvil y el backend. |
| DA05 | El sistema debe utilizar una API REST para la comunicación entre la aplicación móvil y el backend. | RC05 – API REST | Limita las alternativas de comunicación y define la forma de intercambio de información entre cliente y servidor. |
| DA06 | La solución debe permitir modificar reglas de negocio, como flete, estiba, pagos o saldos, sin afectar innecesariamente otros módulos. | AC07 – Mantenibilidad | Puede influir en la modularidad, separación de responsabilidades y organización de la lógica de negocio. |
| DA07 | Las funciones de inteligencia artificial deben incorporarse progresivamente según la cantidad y calidad del historial disponible. | RC08 – Inteligencia artificial progresiva | Puede influir en la separación entre el procesamiento transaccional y el componente de analítica e inteligencia artificial. |
| DA08 | El sistema debe poder aumentar su capacidad cuando crezca la cantidad de usuarios u operaciones registradas. | AC06 – Escalabilidad | Puede influir en la estrategia de despliegue, escalamiento del backend y organización de los componentes del sistema. |
