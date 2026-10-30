# Solicitud de foco en la edición contextual

Se implementa `specs/004-accounts-cash-freight-and-stowage/contextual-reference-focus-plan.md` sobre el problema observado en `verificacion-proveedores-compra-android-2026-10-16.md`. La captura previa muestra el nombre parcialmente fuera del viewport tras elegir Editar desde la lista; no se utiliza como evidencia del código nuevo.

`catalog-workspace.tsx` solicita foco en Nombre al abrir una edición, remontando únicamente el bloque de campos controlados mediante una solicitud incremental. Volver a elegir la misma entidad lleva al borrador sin sustituir sus valores ni escribir. Cambiar de entidad conserva el aviso de descarte; la solicitud se aplica solo cuando el cambio se acepta. No se solicita foco durante carga, escritura, desactivación u otra confirmación. El alta inicial sigue permitiendo consultar la lista sin foco forzado.

Valores, reglas, permisos y llamadas de API permanecen en el workspace. Se reutiliza FormField y el adaptador existente de teclado/desplazamiento, sin otro temporizador ni una navegación distinta.

## Verificación

- TypeScript y lint aprobados en `tmp/contextual-focus-check-20261016.log`. La primera suite completa terminó con 499 casos aprobados y dos fallos: timeout de 5 segundos en un caso de alta contextual y una llamada tardía de ese caso observada en el siguiente. Se conserva el registro y su código 1.
- Repetición aislada sin cambiar límites ni aserciones: **21 casos** de referencias aprobados; registro `tmp/contextual-focus-catalog-retry-20261016.log`, código 0.
- Repetición completa, mismo código y límites: **501 pruebas / 69 suites**, registro `tmp/contextual-focus-full-retry-20261016.log`, código 0. No se agregaron pruebas que solo repliquen los estilos o la estructura de la solicitud de foco.

Estas regresiones verifican conservación de campos, cancelación/reemplazo, mutaciones y aislamiento de sesión. No prueban por sí solas el foco del sistema operativo. Faltan recorrido nativo del ajuste, teclado normal y lector de pantalla; las capturas de proveedor y el IME de pruebas anteriores no cierran esos criterios.

## Paquete web

Exportación de 20 rutas con código 0 en `tmp/web-export-contextual-focus-20261016`; registro `tmp/contextual-focus-export-20261016.log`. Entrada SHA256 `A73AD2692DEDA46FE1CE6A6B071D61F597C5F9739CB1C9E4BE764993F7183932`.

Instalación local en dist confirmada a las 13:40 de Lima: 267 archivos cotejados, respaldo `tmp/web-before-contextual-focus-20261016`, assets anteriores conservados; evidencia `tmp/contextual-focus-web-activation-20261016.json`. PDF.js 6.4.299 y sus 200 recursos por raíz verificados en public/export/dist. Esto acredita archivos instalados, sin una comprobación de carga en navegador.
