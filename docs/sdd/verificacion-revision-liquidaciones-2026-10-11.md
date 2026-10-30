# Revisión de liquidaciones y retorno al menú — 11 de octubre de 2026

## Implementación del requisito 004

La confirmación de flete/estiba ahora muestra tipo, fecha, cantidad seleccionada y total provisional de salida de caja. El dominio suma centavos mediante BigInt, sin convertir importes a Number ni inferir un saldo de caja. Antes del diálogo y antes de encolar comprueba fecha civil YYYY-MM-DD, selección no vacía y sin duplicados, existencia de registros pendientes e importes válidos. No prohíbe fechas futuras ni tarifas cero admitidas por el backend.

La fecha y las casillas quedan bloqueadas durante confirmación, envío o consulta necesaria tras éxito central. Cancelar conserva la selección. El envío duradero previo, la idempotencia y la comprobación transaccional central de elegibilidad permanecen vigentes; la revisión es provisional y no garantiza que otra operación no liquide un registro antes del envío.

## Verificación

`npm run check`: TypeScript, lint y **360 pruebas en 51 suites aprobadas** tras la redacción final. Ocho pruebas nuevas de dominio cubren suma exacta superior al entero seguro, fechas imposibles/formato, año bisiesto, tarifa cero, selección vacía/repetida/ausente/no pendiente e importe malformado. Tres recorridos nuevos de pantalla cubren total de flete/estiba, bloqueo/cancelación y fecha imposible antes del diálogo. Se mantienen las pruebas previas de cola y recuperación confirmada.

La ruta se abrió desde Menú → Más operaciones → Flete y estiba con la API local real y la base aislada existentes. La carga terminó con estados vacíos reales y botones de revisión deshabilitados: la base no contiene entradas pendientes. No se crearon costos ni se liquidaron importes para esta comprobación; el diálogo con registros pendientes se acredita mediante las pruebas simuladas, no mediante ese recorrido HTTP.

## Navegación descubierta y corregida

Tras una recarga directa de Cuentas, «Volver» emitía GO_BACK sin una pantalla anterior. Se consultó documentación oficial de Expo Router mediante Context7 y se creó `backOrHome`: usa el historial si existe; en caso contrario reemplaza por `/home`. Se aplicó al retorno principal de Cuentas, Carros/logística y Flete/estiba. El retorno interno del detalle de cuenta conserva el contexto de búsqueda.

Una prueba nueva de pantalla comprueba el reemplazo por `/home` sin llamar `back` cuando no hay historial. En el navegador se recargó Flete/estiba y se pulsó Volver: la URL final fue `http://localhost:8087/home` y el menú quedó visible. Captura: `tmp/logistics-back-home-real-2026-10-11.png`.

## Límites y próximos cortes

No se acredita todavía el diálogo de liquidación con datos pendientes mediante API real, Android, TalkBack o convergencia Figma. Tampoco se corrigieron en este corte los retornos directos de los demás módulos que todavía usan `router.back`; revisar esa navegación sin cambiar las protecciones de formularios no guardados. T413/T414 y el objetivo general permanecen abiertos.
