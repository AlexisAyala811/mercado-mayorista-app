# Verificación de la igualdad con Stitch

**Fecha:** 9 de noviembre de 2026 · **Tareas:** [T1180–T1190 de la spec 011](../../specs/011-manay-app-design/tasks.md) · **Decisiones:** [CL-ST11–CL-ST17](aclaraciones-convergencia-stitch-2026-11-07.md#igualdad-con-stitch--9-de-noviembre-de-2026) · **Referencia:** las 16 pantallas de Stitch del usuario (`code.html` y `screen.png` de cada una)

Cada pantalla se rehízo con la disposición, los colores y los íconos de su maqueta y se capturó en el emulador `Mercado_Tablet_API36` a 1280 × 800 con datos de ejemplo. Lo que la app no tiene (balanza, SUNAT, devoluciones, otra marca) sigue fuera (CL-ST12).

## Fase F — colores, menú y acceso (T1180–T1182)

Rama `feat/011-stitch-igual`.

| Tarea | Cambio |
| --- | --- |
| T1180 | `ui/tokens.ts`: fondo `#F8F9FF` de las maquetas, familias de acento (ámbar, celeste, índigo, rosa, turquesa, morado, esmeralda y gris) con los tonos 50, 100, 200, 700 y 800 de Tailwind que usa Stitch, y la tarjeta de borde de 2 px con sombra suave. El esmeralda usa el tono 700 en lugar del 500 de la maqueta, que no alcanza contraste AA |
| T1181 | `features/home`: interruptor Compra / Venta con seis tarjetas por lado (número, insignia, ícono a color, título en mayúsculas, descripción y línea al pie) y la fila «Más opciones» con Pendientes de envío, Flete y estiba, Comprobantes, Mensajería, Usuarios y reemplazos y Auditoría (CL-ST15). Las insignias y las líneas al pie salen de la API («3 hoy», «1 pendiente», «Hoy S/ 780.00», «Por pagar S/ 420.00»); sin dato, la tarjeta muestra un texto propio y nunca un valor viejo. Reportes abre en ventas desde el lado Venta |
| T1182 | `features/auth`: tarjeta de acceso de la maqueta con «Selección rápida de operador» y «Mantener estación activa». La lista sale de quienes ya entraron en esa tablet (`services/storage/recent-operators-storage.ts`, almacenamiento seguro del dispositivo, solo usuario y rol, hasta cuatro); tocar un operador llena el usuario y la contraseña se escribe siempre (CL-ST16). Desmarcar «Mantener estación activa» quita al operador de la lista |

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 688 pruebas en 99 suites |
| Pruebas nuevas o cambiadas | `tests/ui/contrast.test.ts` (cada acento sobre su tinte, su insignia y blanco), `tests/auth/manay-menu.test.tsx` (seis tarjetas por lado, «Más opciones», rutas, Encargado, sin balanza ni SUNAT), `tests/home/menu-facts.test.tsx` (insignias y líneas al pie), `tests/auth/recent-operators.test.tsx` (lista local, solo usuario y rol, selección que no llena la contraseña, «Mantener estación activa») |
| Emulador, menú | [Lado Compra](../../img/verificacion-stitch-igual-2026-11-09/menu-compra.png) con las seis tarjetas a la vista, como la maqueta «Menú principal»; [lado Venta](../../img/verificacion-stitch-igual-2026-11-09/menu-venta.png); [«Más opciones»](../../img/verificacion-stitch-igual-2026-11-09/menu-mas-opciones.png) |
| Emulador, acceso | Tras un primer ingreso, [la selección rápida muestra al operador](../../img/verificacion-stitch-igual-2026-11-09/acceso-operadores.png); al tocarlo se llena el usuario, la contraseña queda vacía y el ingreso se completó escribiéndola |

### Diferencias con la maqueta que se mantienen

- Cabecera MAÑAY con «Cerrar sesión» en lugar de la barra oscura simulada y la terminal «Acopio Norte» (CL-ST14).
- El acceso no dibuja «Báscula #1», «Variedad activa», «Balanza conectada» ni el identificador de terminal (CL-ST12); la insignia dice «Acceso seguro».
- Las tarjetas de Carros, Analítica y Reportes llevan un texto fijo al pie: la app no tiene «camiones en plataforma» ni «imprimir turno».
- Los textos miden entre 13 y 18 px (la maqueta usa 11 a 16 px) para que se lean en la tablet a pleno sol.
