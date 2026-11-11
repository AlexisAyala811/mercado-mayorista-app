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

## Fase G — compra en una pantalla (T1183)

Rama `feat/011-stitch-compra`.

| Cambio | Detalle |
| --- | --- |
| `features/reception/screens/purchase-sheet.tsx` | En tablet (ancho de 1100 o más y texto hasta 120 %), la compra es una sola pantalla como «Registro de compra multilotes»: datos del proveedor, pestañas por lote, cuadrícula de sacos de 5 columnas en su propia zona de desplazamiento, barra de captura con bruto y tara (CL-ST17), subtotal del lote, tabla consolidada con precio por lote, flete, resumen de liquidación y «Guardar compra» |
| `purchase-flow-screen.tsx` | Mismas operaciones en cola y en el mismo orden: el primer saco crea la recepción con los datos de arriba; «Guardar compra» cierra el pesaje y liquida. En teléfono o con texto grande sigue el flujo por pasos |
| Retirado | `tablet-weighing-workspace.tsx`, `tablet-settlement-workspace.tsx` y `sack-list.ts`, reemplazados por la pantalla única |

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 695 pruebas en 99 suites |
| Pruebas nuevas | `tests/reception/purchase-sheet.test.tsx` (250 sacos con solo las filas visibles dibujadas, «Ir al saco», corrección de bruto y tara, importes por kilo y por saco, total obsoleto retirado, cuotas, flete a cargo del Mayorista, sin balanza ni carga rápida) y `tests/reception/purchase-sheet-flow.test.tsx` (orden e identidad de las cuatro operaciones, validación antes de crear, sin conexión, pesaje cerrado recuperado) |
| Emulador 1280 × 800 | Compra real de 15 sacos en dos lotes: [datos](../../img/verificacion-stitch-igual-2026-11-09/compra-datos.png), [cuadrícula](../../img/verificacion-stitch-igual-2026-11-09/compra-cuadricula.png), [corrección del saco 7](../../img/verificacion-stitch-igual-2026-11-09/compra-correccion.png), [tabla y flete](../../img/verificacion-stitch-igual-2026-11-09/compra-tabla.png), [resumen](../../img/verificacion-stitch-igual-2026-11-09/compra-resumen.png), [confirmación](../../img/verificacion-stitch-igual-2026-11-09/compra-confirmar.png) y [compra guardada por el servidor](../../img/verificacion-stitch-igual-2026-11-09/compra-guardada.png) |

Defecto corregido: Android cortaba la última palabra de «Guardar compra» en la barra inferior; la acción del paso tiene ahora ancho mínimo.

### No verificado en esta fase

- La cuadrícula con 250 sacos se probó con pruebas de componente, no en el emulador.
- Teléfono, texto al 200 % y TalkBack (T1190).
- Diferencias que se mantienen: sin «Carga rápida» ni «Quitar lote» (CL-ST12, regla de no borrar hechos); el saco se corrige, no se elimina.


## Fase H — cabecera, barra y resto de pantallas (T1184–T1189, T1191)

Rama `feat/011-stitch-pantallas`. Decisiones [CL-ST18 y CL-ST19](aclaraciones-convergencia-stitch-2026-11-07.md#igualdad-visual-completa--10-de-noviembre-de-2026).

| Tarea | Cambio |
| --- | --- |
| T1191 | `ui/navigation/app-header.tsx`: cabecera de Stitch con el usuario, su rol y su estado («En línea», «Sin conexión», «Revisar»), el título con su insignia de módulo y una línea debajo, y el botón «En línea · Sincronizado» que abre Pendientes de envío. En el menú, la marca al centro y «Cerrar sesión» como ícono. Se retira la franja de sincronización: su estado pasa a la cabecera (`features/sync/use-sync-status.ts`). `ui/navigation/bottom-nav.tsx`: barra de Stitch con «Atrás», «Menú principal» y «Siguiente» con sus íconos en todas las pantallas, también en el menú («MENÚ»); «Siguiente» queda deshabilitado donde no hay paso. Campos, botones e indicadores con la variante `stitch` (etiqueta pequeña en mayúsculas, control relleno sin borde, fichas de estado verde y roja) y los tamaños de letra de las maquetas |
| T1184 | `features/sales/screens/sale-sheet.tsx`: en tablet, la venta es una pantalla como «Registro de venta multilotes»: datos del comprador, pestañas por lote, sacos pesados uno a uno en cinco columnas, tabla con el precio de cada lote, flete con «separado» o «incluir en total», resumen y «Guardar venta». Cada lote se envía como una línea con sus sacos y la suma de sus pesos (CL-ST19); la API no cambia |
| T1185 | `features/history/commercial-history-list.tsx` y `features/accounts/screens/accounts-overview.tsx`: barra de búsqueda con «+ Nueva compra / venta», fichas de estado con conteos, totales en blanco, verde y rojo, y tarjetas con avatar, estado, variedad, volumen, total y abonado, saldo y «Abonar / liquidar». Deudas y Cobranzas llevan el interruptor «Deudas a productores · Cuentas por cobrar» de la maqueta |
| T1186 | `features/logistics/screens/reference-logistics-screen.tsx`: buscador redondeado, tarjetas con vehículo, placa y chofer, y botón flotante «+». El formulario se abre con «+» o «Editar», como en la maqueta |
| T1187 | `features/reports`: tarjeta de cabecera con Compras / Ventas, «Hoy», «Esta semana», «Este mes» y «Personalizado» (cada ficha consulta al tocarla) y «+ Exportar PDF / Excel», que muestra las descargas; indicadores de Stitch; evolución por día en columnas, distribución por variedad, consolidado por variedad con precio promedio y principales proveedores o compradores (`domain/shared/report-board.ts`, a partir de las filas del informe) |
| T1188 | `features/analytics/screens/price-board.tsx`: indicadores de precio de las dos variedades con más kilos y del volumen de la semana, una tarjeta de cotización por variedad con compra pactada, venta pactada y su diferencia, la evolución semanal de la variedad elegida y la variedad con mayor diferencia (`domain/analytics/price-board-summary.ts`). Sin precio sugerido ni margen: la diferencia no descuenta flete ni estiba (CL-FM20) |
| T1189 | `features/receipts/components/confirmation-card.tsx`: tarjeta «Guardado exitosamente» con el documento y su número, los cuatro datos, la línea de flete, descuentos, pago y emisión, y «Compartir comprobante», «+ Nueva venta / compra», «Enviar WhatsApp», «Enviar correo» e «Imprimir»; los tres últimos abren la hoja de compartir del sistema con el PDF |

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 702 pruebas en 101 suites |
| Pruebas nuevas o cambiadas | `tests/sales/sale-sheet.test.tsx` (suma de sacos por lote, corrección, lote repetido, lote vacío, tarjeta), `tests/ui/app-chrome.test.tsx` (cabecera con estado y marca, «Siguiente» deshabilitado), `tests/sync/sync-banner.test.tsx` (estado de la cola, nunca «Sincronizado» con error), `tests/reports/report-board.test.ts` (participación, precio promedio, ranking, «Hoy» y «Esta semana»), `tests/analytics/price-board.test.tsx` (diferencia, tendencia, volumen, sin margen ni precio sugerido), `tests/reception/purchase-confirmation.test.tsx` (tarjeta y línea de flete) |
| Emulador 1280 × 800 | [Menú Compra](../../img/verificacion-stitch-igual-2026-11-09/menu-compra.png) y [Venta](../../img/verificacion-stitch-igual-2026-11-09/menu-venta.png) con la cabecera y la barra nuevas; venta real de 6 sacos: [datos](../../img/verificacion-stitch-igual-2026-11-09/venta-datos.png), [cuadrícula](../../img/verificacion-stitch-igual-2026-11-09/venta-cuadricula.png), [tabla](../../img/verificacion-stitch-igual-2026-11-09/venta-tabla.png), [flete](../../img/verificacion-stitch-igual-2026-11-09/venta-flete.png), [resumen](../../img/verificacion-stitch-igual-2026-11-09/venta-resumen.png) y [guardado](../../img/verificacion-stitch-igual-2026-11-09/venta-guardada.png); [Ver compras](../../img/verificacion-stitch-igual-2026-11-09/ver-compras.png), [Ver ventas](../../img/verificacion-stitch-igual-2026-11-09/ver-ventas.png), [Deudas](../../img/verificacion-stitch-igual-2026-11-09/deudas.png), [Cobranzas](../../img/verificacion-stitch-igual-2026-11-09/cobranzas.png), [Carros](../../img/verificacion-stitch-igual-2026-11-09/carros.png), [Reportes](../../img/verificacion-stitch-igual-2026-11-09/reportes-compras.png) y [su tablero](../../img/verificacion-stitch-igual-2026-11-09/reportes-tablero.png), [Analítica](../../img/verificacion-stitch-igual-2026-11-09/analitica.png) |

Defectos encontrados en el emulador y corregidos:

- Android cortaba el texto de algunos botones (por ejemplo «Todas 4» quedaba en «Todas» cuando el conteo llegaba después, y «VER DETALLE» en «VER»). Los botones de Stitch llevan ahora una línea y un ancho mínimo calculado a partir del texto.
- El destino de la venta y las calidades de cada lote se mueven a la tarjeta del lote, como en la maqueta.

### Diferencias con las maquetas que se mantienen

- No se dibujan la barra de estado simulada (red, batería, hora), la balanza, las guías SUNAT ni las devoluciones (CL-ST12, CL-ST18). Donde la maqueta dice «Terminal Acopio Norte • Turno A», la cabecera muestra el rol.
- La venta no tiene «Adelanto cobrado» ni «RUC / DNI»: la API de ventas no los registra. «Carga rápida» y «Quitar lote» con sacos tampoco se dibujan; un lote solo se quita mientras está vacío.
- Analítica no tiene «Compra sugerida», «Margen bruto» ni el precio de otro mercado: se muestran precios pactados y su diferencia (CL-FM20). Las pestañas «Rendimiento por variedad» y «Márgenes» no existen; los filtros por periodo quedan debajo de la pizarra.
- Reportes conserva debajo del tablero los filtros e historial de precios, el resumen general y las alertas, que la maqueta no dibuja.
- En teléfono y con texto grande, compra y venta siguen el flujo por pasos.

### No verificado en esta fase

- T1190 queda abierta: comparación lado a lado en teléfono de 360 dp y con texto al 200 %.
- TalkBack y envío real por WhatsApp o correo, por las mismas razones que en las fases anteriores.


## T1190 — teléfono y texto al 200 % (10 de noviembre de 2026)

Las diez pantallas principales (menú, compra, venta, Ver compras, Ver ventas, Deudas, Cobranzas, Carros, Reportes y Analítica) se capturaron en un teléfono de 360 dp (`wm size 720x1600`, `wm density 320`) y en la tablet de 1280 × 800 con el texto al 200 % (`font_scale 2.0`), arriba y tras desplazar.

| Defecto | Dónde | Corrección |
| --- | --- | --- |
| La barra inferior se salía por los dos bordes y cortaba «Atrás» y «Siguiente» | Teléfono, todas las pantallas | En pantallas de menos de 600 dp, «Atrás» y un «Siguiente» sin acción quedan como flechas y «Menú principal» pasa a «Menú» |
| La tarjeta del vehículo se apretaba: placa partida, nombre del vehículo oculto, chofer cortado | Teléfono, Carros | Sin avatar en el teléfono, la placa no se parte y el chofer ocupa dos líneas |
| Las cotizaciones de Analítica y las columnas de Reportes salían por la derecha | Teléfono | Las columnas tienen base de 300 dp y se encogen |
| Los íconos se recortaban | Texto al 200 % | `ui/components/symbol.tsx` dibuja el ícono a su tamaño dividido entre la escala de texto, dentro de una caja del tamaño original: queda entero, algo más pequeño que el texto |
| El nombre del proveedor se cortaba en las tarjetas de Ver compras y Ver ventas, y las etiquetas de los indicadores se partían a mitad de palabra | Texto al 200 % | Las tarjetas y los indicadores crecen con la escala de texto y pasan a otra línea cuando no caben |

| Evidencia | Capturas |
| --- | --- |
| Teléfono de 360 dp | [Menú](../../img/verificacion-stitch-igual-2026-11-09/telefono-home.png), [compra](../../img/verificacion-stitch-igual-2026-11-09/telefono-purchase-flow.png), [venta](../../img/verificacion-stitch-igual-2026-11-09/telefono-sale-flow.png), [Ver compras](../../img/verificacion-stitch-igual-2026-11-09/telefono-purchase-history.png) y [sus totales](../../img/verificacion-stitch-igual-2026-11-09/telefono-purchase-history-2.png), [Deudas](../../img/verificacion-stitch-igual-2026-11-09/telefono-debts-2.png), [Carros](../../img/verificacion-stitch-igual-2026-11-09/telefono-logistics-2.png), [Analítica](../../img/verificacion-stitch-igual-2026-11-09/telefono-analytics-2.png) |
| Texto al 200 % | [Menú](../../img/verificacion-stitch-igual-2026-11-09/texto-200-home.png), [venta](../../img/verificacion-stitch-igual-2026-11-09/texto-200-sale-flow.png), [Ver compras](../../img/verificacion-stitch-igual-2026-11-09/texto-200-purchase-history-2.png), [Deudas](../../img/verificacion-stitch-igual-2026-11-09/texto-200-debts-2.png), [Carros](../../img/verificacion-stitch-igual-2026-11-09/texto-200-logistics.png), [Reportes](../../img/verificacion-stitch-igual-2026-11-09/texto-200-reports-2.png), [Analítica](../../img/verificacion-stitch-igual-2026-11-09/texto-200-analytics-2.png) |
| Pruebas | `npm run typecheck` y `npm run lint` sin avisos; 702 pruebas en 101 suites |

Con texto al 200 % y en el teléfono, compra y venta siguen el flujo por pasos, como se decidió en las fases G y H.

### No verificado

- TalkBack: la imagen del emulador no lo trae.
- Una tablet física: todo se verificó en el emulador.

## Pantallas sin maqueta propia (10 de noviembre de 2026)

Pendientes de envío, Comprobantes, Mensajería, Usuarios y reemplazos, Auditoría, Flete y estiba, el estado de cuenta y los detalles de compra, venta y cuenta no tienen maqueta en Stitch. Toman su estilo de los componentes compartidos, que ahora usan por defecto el de las maquetas (CL-ST18): tarjetas blancas con borde fino y sombra suave, etiquetas pequeñas en mayúsculas, campos rellenos sin borde, botones de 12 px de radio e indicadores blancos con etiqueta en mayúsculas. Reportes y el acceso conservan sus variantes.

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 702 pruebas en 101 suites |
| Emulador 1280 × 800 | [Pendientes de envío](../../img/verificacion-stitch-igual-2026-11-09/otras-sync-queue.png), [Comprobantes](../../img/verificacion-stitch-igual-2026-11-09/otras-receipts.png), [Mensajería](../../img/verificacion-stitch-igual-2026-11-09/otras-messaging.png), [Usuarios y reemplazos](../../img/verificacion-stitch-igual-2026-11-09/otras-administration.png), [Auditoría](../../img/verificacion-stitch-igual-2026-11-09/otras-audit.png), [Flete y estiba](../../img/verificacion-stitch-igual-2026-11-09/otras-cost-settlements.png), [estado de cuenta](../../img/verificacion-stitch-igual-2026-11-09/otras-buyer-statement.png) y [detalle de compra](../../img/verificacion-stitch-igual-2026-11-09/otras-detalle-compra.png) |

## Anote de compra (T1192, 10 de noviembre de 2026)

El usuario indicó que la compra no era igual a su maqueta. La hoja de compra en tablet se rehízo sobre «registro de compra multilotes, tablet 2» (CL-ST20): datos del proveedor en una fila con íconos, pestañas de lote, cuadrícula de cinco sacos por fila donde se escribe el peso bruto en la celda, tara por lote, subtotal del lote, botón «Ver cálculo consolidado», tabla por lote con su subtotal, tres totales, flete con el vehículo y quién lo asume, resumen en dos columnas y «Guardar compra».

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 703 pruebas en 101 suites |
| Emulador 1280 × 800 | Compra real de 9 sacos en dos lotes (349 kg de Canchán a S/ 1.45 y 121 kg de Peruanita a S/ 1.80, flete por sacos a S/ 2.50): [lotes](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-lotes.png), [cuadrícula](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-cuadricula.png), [corrección del saco 3 en su celda](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-correccion.png), [tabla con subtotal por lote](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-tabla.png), [resumen](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-resumen.png), [confirmación](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-confirmar.png) y [compra guardada por el servidor con S/ 701.35](../../img/verificacion-stitch-igual-2026-11-09/anote-compra-guardada.png) |

### Diferencias con la maqueta que se mantienen

- Pesos en kilos enteros: la maqueta muestra decimales, pero la API solo acepta kilos enteros.
- No se dibujan «Carga rápida (10 sacos a 50 kg)» ni el aspa para borrar un saco: la app no rellena pesos y no borra hechos.
- Una vez creada la recepción no se añaden ni se quitan lotes, y los datos del proveedor quedan bloqueados.

### No verificado

- TalkBack y una tablet física.

## Revisión pantalla por pantalla (T1193, 10 de noviembre de 2026)

Cada pantalla se compara con su maqueta en el emulador de 1280 × 800 (CL-ST21). Pantallas revisadas en esta tanda:

| Pantalla | Cambios | Evidencia |
| --- | --- | --- |
| Acceso | Rótulo «Centro de acopio», titular «de papa y tubérculos», dos tarjetas de datos, campos blancos con ícono, ojo de la contraseña, «¿Olvidó su clave?», tarjeta centrada y botón con ícono | [acceso](../../img/verificacion-stitch-igual-2026-11-09/revision-acceso.png) |
| Menú, lado Compra | Barra blanca de borde a borde, NUEVO en verde, rayo, punto y descarga en los pies, descripciones de la maqueta | [menú Compra](../../img/verificacion-stitch-igual-2026-11-09/revision-menu-compra.png) |
| Menú, lado Venta | DESPACHO en verde, «Anote», «Precios hoy» y descripciones de la maqueta | [menú Venta](../../img/verificacion-stitch-igual-2026-11-09/revision-menu-venta.png) |
| Ver compras | Ancho completo, importes con separador de miles, fichas con conteo en burbuja dentro de la barra de búsqueda | [Ver compras](../../img/verificacion-stitch-igual-2026-11-09/revision-ver-compras.png) |
| Ver ventas | Borde verde o rojo según el estado, estado con punto bajo el nombre, «Por cobrar / Deuda», volumen «6 sacos (300 kg)», abono en segunda línea, «Cobrar / liquidar»; Ver compras con «Pagado» y «Falta pagar» | [Ver ventas](../../img/verificacion-stitch-igual-2026-11-09/revision-ver-ventas.png) |
| Compra (maqueta de venta, tablet 1) | Datos en una fila; «Editar proveedores / variedades» junto a «Añadir lote»; el bloque del lote solo aparece con un lote. Aprobada por el usuario el 10 nov 2026 | [compra vacía](../../img/verificacion-stitch-igual-2026-11-09/revision-compra-vacia.png) |
| Anote de compra con lotes | «Añadir lote / variedad» visible y desactivado tras el primer saco (el servidor solo acepta las variedades elegidas al crear la recepción); la tabla muestra las variedades sin sacos con «0 sacos». Aprobado por el usuario el 10 nov 2026 | [lotes](../../img/verificacion-stitch-igual-2026-11-09/revision-anote-lotes.png), [tabla](../../img/verificacion-stitch-igual-2026-11-09/revision-anote-tabla.png) |
| Deudas | Buscador blanco con lupa, fichas «Pendientes de abono / Falta pagar», «Todos», «Abonados / Al día» con conteo en burbuja y el selector en la misma fila, etiqueta gris con punto, «(Sin abono previo)» en rojo. Aprobada por el usuario el 10 nov 2026 | [Deudas](../../img/verificacion-stitch-igual-2026-11-09/revision-deudas.png) |

| Verificación | Resultado |
| --- | --- |
| `npm run typecheck`, `npm run lint` | Sin errores ni avisos |
| `npm test -- --runInBand` | 703 pruebas en 101 suites |

Diferencia pendiente: en las maquetas de listas la cabecera es una barra blanca de borde a borde; en la app solo el menú la tiene.
