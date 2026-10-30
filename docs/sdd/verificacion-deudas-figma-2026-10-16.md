# Deudas: composición conectada y consulta Android

Plan: `specs/004-accounts-cash-freight-and-stowage/deudas-convergence-plan.md`. Contexto completo/captura de Deudas 20:531 recibidos el 16 de octubre. Fuente de negocio: especificación 004. No cambia creación, pago, reverso ni saldo de cuentas.

## Implementación

`ReferenceAccountsOverview` aplica cabecera, búsqueda, filas de participante/saldo, + y navegación originales. Cuatro cuentas por página después de buscar/filtrar; no agrupa contrapartes ni elimina cuentas pagadas/anuladas. Cambiar filtros reinicia página; una colección reducida limita la página vigente. Conserva identidad, pagar/cobrar, referencia, saldo y estado. Filtros/caja quedan debajo de la composición; detalle, pagos/reversos, consultas atómicas y cola durable siguen en `AccountsContent`.

«N°» del prototipo se sustituye por Saldo según especificación; no se traslada la aclaración teléfono/placa de Carros. + ofrece compra/venta y navega a flujos existentes. No crea deuda manual ni envía movimientos; el usuario todavía registra/confirma la operación y elige crédito en ese flujo.

`mercado-app/assets/figma/original/deudas/manifest.json` conserva siete registros con huellas/dimensiones, sin URLs temporales. Búsqueda/tres iconos de navegación son idénticos a Carros; + y franja tienen exportaciones propias. User de cabecera es idéntico por SHA256 a Compra y reutiliza esa variante. El contexto raíz conecta las cinco instancias al mismo User 1:12 con parámetros 48 y los metadatos de cabecera/fila confirman 54×54 y vector 36×40.5. La consulta detallada adicional del vector de fila fue rechazada por cuota Starter: no se afirma una descarga separada ni una importación Code Connect utilizable.

## Verificación

- Tipos/lint y **505 pruebas / 69 suites**, `tmp/deudas-search-height-final-check-20261016.log`, salida 0. Los 22 casos de cuentas incluyen nueve cuentas/tres páginas, búsqueda desde última página, identidad de detalle correcta y origen sin escritura.
- Android 1280×800: cuenta existente `a2739d1a-dc81-43bf-8023-9ca55cb64bbb`, QA Cuenta Consulta 20261011, por cobrar/anulada, saldo S/0.00. Se abrió detalle: inicial S/50.00, mismo saldo/estado y origen Venta. No se introdujeron cobros ni se pulsó Confirmar importe.
- Primer render: franja 621×45 invadía saldo. Se corrigió ancho de participante conservando el SVG. Captura final `tmp/android-deudas-final-normal-20261016.png`: borde dibujado (180,383)–(800,427), 621×45; columna de saldo desde x828. Búsqueda observada (141,240),998×61. La primera captura no acredita la corrección.
- + abrió Registrar compra/Registrar venta y se canceló: `tmp/android-deudas-source-choice-20261016.png` y `.json`. Navegación a origen verificada en componente; no se abrió una nueva operación nativa.
- Escala leída 1.0, aplicada 2.0, restaurada y leída 1.0. Texto/filas en flujo y acciones alcanzables mediante desplazamiento: `tmp/android-deudas-text-200-20261016.png`, `tmp/android-deudas-text-200-actions-20261016.png` y árboles. Teclado final AOSP Latin, sin prueba de escritura ni lector.
- SDK: `tmp/android-deudas-review-20261016.ad`, 24 acciones, publicada/no reproducida; sesión cerrada en menú/escala originales. Una solicitud de captura agotó revisión automática antes de crear proceso y su único reintento permitido completó la lectura; no hubo acción duplicada en UI.

## Paquete y pendientes

Exportación de 20 rutas `tmp/web-export-deudas-final-20261016`, salida 0. Instalación de 270 archivos cotejados, respaldo/activos anteriores conservados: `tmp/deudas-final-web-activation-20261016.json`. PDF.js 6.4.299 y 200 recursos por raíz verificados en public/export/dist. Vista previa compilada preparada en localhost8087; no acredita render en navegador, que no se reabrió.

QA devuelve una cuenta: nueve cuentas/paginación son evidencia de componente; no se fabricaron cuatro filas financieras. Pendientes: marco 1440×1024, teléfono, TalkBack, teclado de software y recorridos restantes. Los vencimientos se consultan en detalle; la colección no entrega vencimiento/último movimiento por cuenta. La especificación 004 exige esos datos: completar su proyección de lectura para el listado, sin derivarlos incorrectamente de createdAt. No se declara la pantalla ni el frontend completos por este corte.
