# Auditoría de dependencias

**Fecha:** 30 de septiembre de 2026  
**Estado:** riesgo conocido; seguimiento requerido.

## Resultado

- Expo Doctor: 21 de 21 comprobaciones aprobadas.
- `npm audit`: 17 vulnerabilidades moderadas, 0 altas y 0 críticas.
- Dependencias directas señaladas: `expo`, `expo-router`, `expo-sharing`, `expo-splash-screen` y los plugins de configuración del visor PDF.
- Causa principal: dependencias transitivas de configuración, CLI, Router y herramientas nativas de Expo.

## Decisión

No ejecutar `npm audit fix --force`. La corrección propuesta por npm reemplaza paquetes por versiones mayores incompatibles, incluida una degradación a Expo 46, mientras el proyecto usa SDK 57 y sus versiones fueron validadas por Expo Doctor.

El proyecto mantiene las versiones compatibles recomendadas por Expo:

- `expo` `~57.0.26`
- `expo-router` `~57.0.24`
- `expo-linking` `~57.0.11`
- `expo-glass-effect` `~57.0.4`
- `@expo/ui` `~57.0.21`
- `expo-secure-store` `~57.0.4`
- `expo-dev-client` `~57.0.19`
- `react-native-pdf` `^7.0.5`
- `react-native-blob-util` `^0.25.1`

El visor PDF usa un cliente de desarrollo nativo y plugins compatibles con Expo SDK 57. Expo Doctor aprobó esta configuración; Expo Go no incluye esos módulos nativos.

## Seguimiento

1. Repetir Expo Doctor y `npm audit` al actualizar SDK o dependencias.
2. Aplicar parches compatibles mediante `npx expo install --fix`.
3. Revisar avisos de Expo para `query-string`, `decode-uri-component`, `uuid` y herramientas de configuración.
4. No introducir uso directo de las dependencias transitivas señaladas.
