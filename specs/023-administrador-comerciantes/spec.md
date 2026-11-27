# Especificación 023: Administrador de comerciantes y soporte

**Estado:** aprobada por el usuario el 26 de noviembre de 2026 · **Implementación:** rama `feat/023-administrador`, 26 de noviembre de 2026 ([verificación](../../docs/sdd/verificacion-administrador-comerciantes-2026-11-26.md))
**Origen:** el usuario quiere ofrecer MAÑAY a varios comerciantes: «yo voy a ser el administrador donde administraré a cada comerciante. Cada comerciante tendrá su acceso hacia la app, según sus datos y sus credenciales, y podrá permitir a sus propios colaboradores». Además quiere atender como soporte, por ejemplo cuando un comerciante olvida su contraseña o la app le falla.

## Objetivo

Agregar un tercer nivel de acceso, el **Administrador**, que da de alta a cada comerciante (un negocio con su Mayorista) y le da soporte de cuenta, **sin ver sus operaciones**. Cada Mayorista sigue administrando a sus Encargados como hoy.

| Nivel | Quién | Qué administra | Qué ve |
| --- | --- | --- | --- |
| Administrador | El dueño de MAÑAY (el usuario) | Comerciantes: alta, suspensión, reactivación y soporte de la cuenta del Mayorista | Solo datos de cuenta: nombre del negocio, usuario del Mayorista, estado, fechas de alta y último acceso, sesiones abiertas |
| Mayorista | Cada comerciante | Sus Encargados y reemplazos (ya existe) | Todas las operaciones de **su** negocio |
| Encargado | Colaborador del comerciante | Nada | Lo que permita su reemplazo vigente (ya existe) |

## Lo que ya existe y no cambia

- Aislamiento por negocio: cada consulta filtra por el negocio de la sesión (AC04).
- El Mayorista crea Encargados, les cambia la contraseña, los desactiva y les da reemplazos de hasta 24 horas (spec 001).
- `businesses.is_active` ya existe en la base.

## Funcionalidades del Administrador

### Gestión de comerciantes
1. **Listar comerciantes:** nombre del negocio, usuario del Mayorista, estado (activo o suspendido), fecha de alta y último acceso. Búsqueda por nombre y paginación.
2. **Dar de alta un comerciante:** nombre del negocio y usuario del Mayorista, con una **contraseña temporal**. Se crean el negocio y su Mayorista en una sola transacción.
3. **Suspender un comerciante:** el negocio y todos sus usuarios dejan de poder entrar, y sus sesiones abiertas se cierran al instante. No se borra ningún dato.
4. **Reactivar un comerciante suspendido.**

### Soporte de cuenta
5. **Restablecer la contraseña del Mayorista** cuando la olvida: el Administrador define una contraseña temporal y el Mayorista **debe cambiarla al entrar**, así el Administrador no conoce la definitiva.
6. **Cerrar todas las sesiones** de un comerciante, por ejemplo si perdió el celular o la app quedó en un estado raro. Al volver a entrar, el usuario empieza con una sesión limpia.
7. **Ver el estado técnico de la cuenta:** último acceso, número de sesiones abiertas e intentos de acceso fallidos recientes. Sirve para orientar al comerciante sin ver sus operaciones.

### Para el Mayorista
8. **Primer ingreso o contraseña restablecida:** pantalla obligatoria «Crea tu contraseña» antes de usar la app.
9. **«¿Olvidó su clave?»** en la pantalla de inicio dirá: Encargado → «Pide a tu Mayorista…»; Mayorista → «Contacta al soporte de MAÑAY…».

## Fuera del alcance

- El Administrador **no ve** compras, ventas, pesajes, saldos, cuentas, caja, documentos ni auditoría operativa de ningún comerciante.
- El Administrador no puede entrar «como» un comerciante (sin suplantación).
- Sin cobro, planes ni facturación a los comerciantes.
- Sin recuperación automática de contraseña por correo o SMS.
- No arregla la app del celular a distancia: los pendientes sin enviar viven cifrados en el dispositivo y el servidor no los ve. El soporte orienta (cerrar sesiones, revisar estado) y, si hace falta, el comerciante reinstala la app.

## Decisiones de diseño propuestas

| Tema | Propuesta | Por qué |
| --- | --- | --- |
| Rol | Nuevo valor `admin` en `user_role` | Las rutas de operaciones declaran sus roles con `@Roles(...)`; al no incluir `admin`, `RolesGuard` le responde `403` sin cambiar ninguna de ellas |
| Dónde vive el Administrador | En un negocio reservado de tipo «plataforma», que nunca aparece en la lista de comerciantes | `users.business_id` es obligatorio y todo el código depende de él; evita una migración riesgosa |
| Rutas nuevas | `/api/v1/admin/merchants…` solo con `@Roles(UserRole.Admin)` | Separadas de las del negocio |
| Contraseña temporal | Columna `users.must_change_password`; mientras esté activa, la sesión solo permite cambiar la contraseña | El Administrador no conoce la contraseña definitiva |
| Suspensión | `businesses.is_active = false` y revocación de sus sesiones en la misma transacción; el login revisa el negocio | Efecto inmediato, sin borrar datos (regla «no se borran hechos») |
| Auditoría | Cada acción del Administrador queda auditada con motivo | Trazabilidad del soporte |
| Primer Administrador | Script `bootstrap:admin`, que crea el negocio «plataforma» y el Administrador una sola vez | Igual que hoy `bootstrap:wholesaler` |
| Migraciones | Solo agregar: valor de enum, columna `must_change_password` (por defecto `false`) y columna `businesses.kind` (por defecto `merchant`) | Compatibles con la versión anterior; el negocio actual queda como comerciante |
| Módulo | Identidad y acceso (módulo 1) | Es administración de cuentas y sesiones |
| App | Menú propio del Administrador, «Comerciantes», en el mismo APK | Sin una segunda aplicación que desplegar |

## Aclaraciones

- **CL-23-01 · Alcance del Administrador.** Respondido el 26 nov 2026: administra cuentas y da soporte; **no ve las operaciones** de los comerciantes.
- **CL-23-02 · Dónde administra.** Aprobado el 26 nov 2026: en la misma app, con un menú propio.
- **CL-23-03 · Contraseña inicial.** Aprobado el 26 nov 2026: temporal, con cambio obligatorio en el primer ingreso.
- **CL-23-04 · Cuándo se implementa.** Aprobado el 26 nov 2026: después de la exposición del Sprint 2, porque toca el inicio de sesión y los permisos que se muestran ese día.
- **CL-23-05 · Un Mayorista por comerciante.** Aprobado el 26 nov 2026: uno por negocio, como hoy.

## Criterios de aceptación

1. El Administrador da de alta un comerciante y su Mayorista entra con la contraseña temporal; la app lo obliga a cambiarla antes de seguir.
2. Con un comerciante suspendido, su Mayorista y sus Encargados reciben `401` al entrar y sus sesiones abiertas dejan de servir al instante; al reactivarlo vuelven a entrar.
3. El Administrador recibe `403` en todas las rutas de operaciones (compras, ventas, cuentas, reportes, documentos, auditoría del negocio), comprobado con pruebas e2e y con la colección de Postman.
4. Un Mayorista o un Encargado reciben `403` en `/api/v1/admin/…`.
5. Restablecer la contraseña y cerrar sesiones quedan en la auditoría con quién, cuándo y motivo.
6. El negocio «plataforma» no aparece en la lista de comerciantes ni puede recibir operaciones.
7. Las migraciones solo agregan; los datos y el comerciante actual siguen funcionando igual.
8. Pruebas unitarias y e2e en verde, OpenAPI con resumen para cada ruta nueva y documentación actualizada: actores, matriz de autorización, decisiones (ADR-07) y C4.

## Documentos afectados

`docs/01-analisis-de-sistema/01-actores.md` (nuevo actor y matriz), `03-requisitos-funcionales.md` (requisitos nuevos), `07-decisiones-arquitectonicas.md` (ADR-07), `docs/02-arquitectura-software/componentes-arquitectonicos.md` y el C4 de niveles 1 a 3.
