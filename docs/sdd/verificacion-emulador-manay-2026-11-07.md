# Verificación de MAÑAY en el emulador Android

**Fecha:** 7 de noviembre de 2026 · **Tareas:** [T1150 de la spec 011](../../specs/011-manay-app-design/tasks.md) y [T944 de la spec 009](../../specs/009-buyer-account-statement/tasks.md), en parte · **Rama:** `fix/011-cabeceras-telefono`

## Entorno

| Elemento | Detalle |
| --- | --- |
| Emulador | AVD `Mercado_Tablet_API36`, Android API 36, 1280 × 800 a densidad 160 |
| App | Compilación de desarrollo con Metro y la API local en el puerto 3100 |
| Datos | Base PostgreSQL 17 portable nueva, migrada, con un Mayorista de prueba, catálogo de ejemplo, compras pagadas, con deuda y anulada, y dos ventas a crédito de un mismo comprador, una con cuota vencida |
| Configuraciones | Tablet 1280 × 800 (160 dpi). Tablet 2560 × 1600 (`wm size` y `wm density 320`). Teléfono de 360 dp (720 × 1600 a 320 dpi). Texto al 200 % (`font_scale 2.0`) en la tablet de 1280 × 800 |

En cada configuración se abrieron por enlace profundo las quince rutas del Mayorista: menú, Anote, Ver compras, Carros, Flete y estiba, Deudas, Cobranzas, estado de cuenta, nueva venta, historial de ventas, Reportes, Analítica, Pendientes de envío, Administración y Datos maestros.

## Resultado por configuración

| Configuración | Resultado |
| --- | --- |
| Tablet 1280 × 800 | Sin defectos. Cabeceras, tarjetas, montos y estados se leen completos ([Cobranzas](../../img/verificacion-emulador-2026-11-07/tablet-1280-cobranzas.png), [estado de cuenta](../../img/verificacion-emulador-2026-11-07/tablet-1280-estado-de-cuenta.png)) |
| Tablet 2560 × 1600 | Sin defectos. Mismo diseño que 1280 × 800 a doble densidad, con texto y bordes nítidos ([estado de cuenta](../../img/verificacion-emulador-2026-11-07/tablet-2560-estado-de-cuenta.png)) |
| Teléfono de 360 dp | Tres defectos corregidos en esta rama (abajo). El resto de pantallas pasa a una columna sin cortes |
| Texto al 200 % | Un defecto corregido: los números de los pasos se salían del círculo. Sin texto cortado ni superpuesto en las quince rutas ([estado de cuenta](../../img/verificacion-emulador-2026-11-07/texto-200-estado-de-cuenta.png)) |

## Defectos encontrados y corregidos

| Defecto | Causa | Corrección | Evidencia |
| --- | --- | --- | --- |
| En el teléfono, el título de Cobranzas se partía a mitad de palabra («Cobranza / s») y el antetítulo de Carros también («TRA / NSPORTISTAS») | La cabecera ponía logotipo, títulos y usuario en una sola fila sin salto, y el usuario reservaba el 30 % del ancho | La cabecera de Deudas, Cobranzas y Carros admite salto de línea: los títulos ocupan al menos 180 dp y el usuario pasa debajo cuando no cabe | [Antes](../../img/verificacion-emulador-2026-11-07/telefono-360-cobranzas-antes.png), [Cobranzas después](../../img/verificacion-emulador-2026-11-07/telefono-360-cobranzas-despues.png), [Carros después](../../img/verificacion-emulador-2026-11-07/telefono-360-carros-despues.png) |
| En el teléfono, la referencia de la cuenta salía por el borde derecho de la tarjeta | El bloque del participante tenía una base de 320 dp que no se encogía | Base de 240 dp que se encoge; la referencia larga se abrevia por el medio | [Después](../../img/verificacion-emulador-2026-11-07/telefono-360-cobranzas-despues.png) |
| En el estado de cuenta del teléfono, «N.°» quedaba partido entre dos líneas | Android permite cortar entre «N.» y «°» | Unión sin corte entre «N.», «°» y el número | [Después](../../img/verificacion-emulador-2026-11-07/telefono-360-estado-de-cuenta.png) |
| Con el texto al 200 %, los números de los pasos 1–4 se salían del círculo | El círculo medía 32 × 32 fijos | El círculo crece con el texto (mínimo 32 dp) | [Antes](../../img/verificacion-emulador-2026-11-07/texto-200-pasos-antes.png), [después](../../img/verificacion-emulador-2026-11-07/texto-200-pasos-despues.png) |

Tras las correcciones: `npm run typecheck`, `npm run lint` y `npm test -- --runInBand` sin errores (653 pruebas en 93 suites). Cada pantalla corregida se volvió a capturar en el emulador.

## Observaciones sin cambio

- Con el texto al 200 %, Android 14 y posteriores escalan menos los títulos grandes que el texto normal. Es comportamiento del sistema y no corta texto.
- Reportes y la fecha de una nueva recepción toman la fecha local del dispositivo. El emulador estaba en UTC y mostró el 8 de noviembre cuando en Lima era el 7. Una tablet configurada en hora de Perú muestra la fecha correcta. Analítica ya usa la hora de Lima.

## Lo que no se pudo verificar en el emulador

| Criterio | Motivo |
| --- | --- |
| TalkBack | La imagen del emulador no trae TalkBack (`com.google.android.marvin.talkback` no está instalado) y no tiene Play Store para instalarlo |
| Envío real por WhatsApp y correo (T944) | El emulador no tiene WhatsApp ni una cuenta de correo. La hoja de compartir con el PDF ya se verificó en la [fase 4](verificacion-manay-fase4-2026-11-06.md) |
| Comparación final con Stitch | Necesita los diseños de Stitch; queda para la revisión con el usuario |

Por eso T1150 y T944 siguen abiertas, con el avance anotado.
