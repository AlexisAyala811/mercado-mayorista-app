# Decisión propuesta 001: Plataforma móvil y estructura de aplicación

**Estado:** decisión registrada; pendiente de reflejo en la línea base documental.

## Contexto

El sistema se ejecutará inicialmente en tablets Android, requiere operación con conectividad irregular, usa TypeScript estricto según las reglas del proyecto y debe crecer de manera modular. La línea base aún no selecciona un framework: CL-03 sigue abierta.

La documentación actual de Expo confirma que los proyectos nuevos incluyen TypeScript y Expo Router, y que Expo Router utiliza rutas basadas en archivos, rutas tipadas y enlaces profundos. Esto permite reservar el directorio de rutas para navegación y mantener fuera de él los módulos de dominio y datos.

## Propuesta

Adoptar **Expo con React Native, TypeScript estricto y Expo Router** para la aplicación de tablet Android.

Estructura objetivo inicial:

```text
app/                    Rutas y layouts de Expo Router
src/features/           Módulos funcionales: acceso, recepción, ventas, cuentas, reportes
src/domain/             Reglas de negocio, entidades y cálculos verificables
src/data/               Repositorios, persistencia local, sincronización y adaptadores de API
src/ui/                 Sistema de diseño, componentes y pantallas reutilizables
src/services/           Integraciones externas y utilidades de plataforma
tests/                  Pruebas de dominio, interfaz y recorridos críticos
```

## Razones

- Se alinea con la prioridad del proyecto de usar Expo Skills y TypeScript.
- Permite una base compartida para Android y una posible evolución a iOS o web sin cambiar el dominio comercial.
- Expo Router ofrece navegación integrada y rutas tipadas para separar el acceso, los módulos protegidos y las pantallas de detalle.
- La separación propuesta mantiene pesaje, saldos, inventario y sincronización fuera de los componentes visuales.
- Callstack y Expo proporcionan skills especializados para rendimiento, navegación, pruebas y validación en dispositivos.

## Consecuencias

- La aplicación debe seguir las convenciones de Expo Router y mantener `app/` limitado a rutas y layouts.
- Las decisiones de almacenamiento local, sincronización, autenticación y backend necesitan especificaciones y planes propios; esta decisión no las resuelve.
- Cualquier necesidad de integración nativa no cubierta se evaluará mediante adaptadores o módulos nativos, sin contaminar el dominio.
- Las pantallas de Figma se adaptarán a navegación nativa de tablet y a los estados definidos en las especificaciones.

## Riesgos y mitigación

| Riesgo | Mitigación propuesta |
|---|---|
| Sincronización offline compleja | Resolver CL-04 y CL-06 antes de implementar persistencia y cola. |
| Permisos del Encargado sin política definitiva | Resolver CL-05 antes de crear protección de rutas y confirmación remota. |
| Lógica de pesos, lotes y saldos mezclada con pantallas | Probar reglas en `src/domain/` antes de conectarlas a la interfaz. |
| Rendimiento insuficiente en tablets objetivo | Seleccionar dispositivo representativo y medir flujos de pesaje conforme AC01 y CL-09. |

## Decisiones aún pendientes

1. Los contratos detallados de la API; la plataforma backend y PostgreSQL quedaron resueltos en la decisión 002.
2. Persistencia local, cifrado y cola de sincronización.
3. Sesión segura, gestión de credenciales y política de reemplazo.
4. Dispositivo Android representativo y entorno de pruebas.

## Validación requerida

La decisión debe quedar reflejada por la tarea documental en la línea base, sin cambiar las reglas de negocio pendientes. La implementación sigue condicionada por los bloqueos propios de cada especificación.

## Evidencia de implementación preparada

El [contrato de arranque propuesto](expo-bootstrap-contract.md) concreta la estructura, condiciones previas y criterios de aceptación sin cambiar el estado de esta decisión. La documentación de Expo consultada el 23 de septiembre de 2026 respalda el uso de Expo Router y TypeScript para esta propuesta.
