# Contrato de arranque técnico propuesto

**Estado:** base autorizada para arranque técnico. La tarea documental debe reflejar CL-03 en la línea base sin alterar las reglas de negocio pendientes.

## Base propuesta

- Expo y React Native para tablet Android.
- TypeScript estricto.
- Expo Router para rutas y layouts.
- Separación entre rutas, características, dominio, datos, interfaz e integraciones.

La documentación vigente de Expo consultada el 23 de septiembre de 2026 confirma que `create-expo-app` incluye Expo Router y que el directorio de rutas convierte archivos en pantallas. También confirma que los alias de TypeScript pueden mapear `@/*` a `src/*`.

## Estructura objetivo

```text
app/ or src/app/        Rutas y layouts de Expo Router
src/features/           Casos de uso y pantallas por módulo
src/domain/             Entidades, reglas y cálculos puros
src/data/               Repositorios, persistencia y sincronización
src/ui/                 Tokens, componentes y accesibilidad
src/services/           Adaptadores de plataforma e integraciones
tests/                  Dominio, interfaz, contrato y recorridos críticos
```

El directorio de rutas no contiene cálculos de pesaje, inventario, saldos ni autorización de backend.

## Condiciones previas de ejecución

1. CL-09 debe indicar una tablet Android representativa, orientación y entorno de prueba antes de validar en dispositivo.
2. Deben definirse el repositorio remoto, estrategia de ramas y política de secretos antes de la primera integración remota.
3. El primer corte implementable debe tener sus bloqueos resueltos según `plan-readiness.md`.

## Primer corte técnico permitido después de aprobación

1. Crear el proyecto base con TypeScript y Expo Router.
2. Configurar alias, chequeo estricto y estructura de directorios sin lógica comercial.
3. Crear un layout público y otro protegido vacíos, sin simular autorización real.
4. Configurar pruebas de dominio y una validación de arranque en la tablet definida.
5. Implementar el acceso solo cuando CL-05, CL-06 y CL-10 estén resueltas.

## Criterios de aceptación del arranque

- El proyecto compila con TypeScript estricto.
- Las rutas permanecen separadas de `src/domain` y `src/data`.
- No hay secretos ni credenciales en el repositorio.
- El arranque no presenta módulos comerciales que aparenten estar implementados.
- El entorno documenta cómo ejecutar la verificación en la tablet representativa.
