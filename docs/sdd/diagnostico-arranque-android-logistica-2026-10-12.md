# Arranque Android para logística — 12 de octubre de 2026

Se intentó verificar Atrás de Logística con agent-device 0.21.22 y el AVD existente Mercado_Tablet_API36. El daemon de la prueba anterior (24080/57824) estaba ausente. Se creó un estado de SDK nuevo; el descubrimiento automático falló aunque generó procesos activos. El servidor requiere `daemonServerMode: http`, además de la preferencia de transporte. Se verificaron PID 32936, puerto HTTP 53398 y propiedad del listener, y se conectó el cliente explícitamente con autenticación mantenida y token sin imprimir.

## Evidencia actual

- SDK `devices.list`: AVD Mercado_Tablet_API36 disponible, inicialmente apagado.
- SDK `devices.boot`: procesos emulator.exe y qemu headless confirmados activos; terminó con «Android device failed to finish booting». No se reinició por un timeout de observación.
- Android metadata: emulator-5554 conectado. Metro nativo propio iniciado en 8081, API de pruebas existente en 3000, reverse local 8081 configurado. La comprobación inicial de sys.boot_completed no devolvió 1; no se presentó como arranque completo.
- SDK `apps.open`: sesión `mercado-logistics-20261012` abierta para com.mercado.gestion, 1280×800, con advertencia de captura inicial insuficiente.
- SDK snapshot posterior: diálogo «Mercado isn't responding», controles Close app/Wait. La pulsación semántica de Wait fue bloqueada por el SDK: ANR y recuperación automática fallida. No se afirma que Wait se ejecutó.
- Captura posterior inspeccionada: `tmp/android-logistics-anr-2026-10-12.png`, muestra el launcher Development Build y «System UI isn't responding». El frontend comercial todavía no cargó; no se inició sesión ni se modificaron datos comerciales en Android.

## Límites y siguiente acción

Atrás nativo de Logística continúa sin verificar. La evidencia apunta a un arranque inestable del emulador/sistema, pero no prueba la causa raíz ni un defecto del frontend. No se usó un segundo motor de captura ni adb para operar la interfaz. Se conservaron los estados/logs de SDK y los procesos cuyo cierre oficial no pudo confirmar; no se forzaron locks ni PIDs. Antes de continuar, revisar estado real del dispositivo y sesión, recuperar el entorno de forma controlada y conectar Metro mediante los controles observados del launcher. La meta general sigue activa, con otros módulos y convergencia visual pendientes.
