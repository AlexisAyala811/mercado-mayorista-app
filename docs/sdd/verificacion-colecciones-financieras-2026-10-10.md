# Colecciones financieras completas y caja exacta

Fecha: 10 de octubre de 2026. Alcance: 004, HU04/HU08/HU09 y sus consultas autorizadas.

Se retiró el corte silencioso de los servicios de cuentas, caja, transportistas, vehículos, flete, grupos y estiba. El cargador compartido consulta páginas de 100 con el token central y ensambla la colección. Su Page agregado tiene offset cero, limit igual a elementos ensamblados y total central verificado. Las rutas de paginación del historial de compras/ventas conservan sus contratos anteriores; los nuevos listAllReceptions/listAllSales se usan únicamente donde se requiere la colección completa para seleccionar una operación de estiba.

El cargador verifica páginas válidas, IDs no vacíos/no repetidos, total estable y cantidad final igual al total. Rechaza página faltante, fallo de conexión, duplicado o cambio del total; no devuelve una primera página como respuesta completa. El cargador de catálogos reutiliza esta implementación, conservando sus mensajes de catálogo y respuesta de array. Esta verificación no equivale a una instantánea transaccional central: una actualización de campos sin cambio de total puede ocurrir durante las lecturas.

El selector de estiba consulta todas las páginas de recepciones y ventas y conserva la selección de operaciones elegibles. Un fallo al leer una liquidación de compra se muestra como error de carga; anteriormente se capturaba y la operación se omitía silenciosamente. No se registran efectos al consultar y no cambian permisos ni reglas de liquidación.

Caja acumula entradas y salidas con BigInt, convirtiendo a cadenas enteras para formatMoney. Se retiró Number de los acumulados: un importe individual permitido no garantiza que la suma del historial sea un entero seguro. Se conservan los centavos de entradas, salidas y neto, sin redondeo binario.

## Verificación

- Nueve pruebas de servicios para el elemento 101 de cuentas/caja/transportistas/vehículos/flete/grupos/estiba/recepciones/ventas, segunda página y token central.
- Pruebas de segunda página fallida, total cambiante, registro repetido y colección realmente vacía.
- Componente de cuentas con 1001 movimientos de 9.000.000.000.000 centavos, una entrada de un centavo y una salida de dos: entradas S/ 90090000000000.01, salidas S/ 0.02 y neto S/ 90089999999999.99 exactos.
- Componente de estiba ante fallo de lectura de liquidación: mensaje visible y ninguna operación encolada/enviada.
- Tipos aprobados, lint sin errores ni advertencias, 306 pruebas en 44 suites aprobadas. Regresiones de pagos, reversos, liquidaciones, catálogos y capturas continúan pasando.

No se creó ni modificó ningún registro persistido. Las pruebas usan contratos simulados y componentes; no acreditan un ensayo nuevo de nueve colecciones amplias contra PostgreSQL/Android, rendimiento de listas grandes ni convergencia Figma. La meta completa permanece abierta, incluyendo filtros, recorridos táctiles, comprobantes y analítica pendiente.
