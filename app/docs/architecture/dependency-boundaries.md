# Límites de dependencias

La aplicación mantiene separadas la navegación, la interfaz, los casos de uso, el dominio, los datos y las integraciones. Esta regla permite cambiar la persistencia o la plataforma sin trasladar esas decisiones a las reglas del negocio.

## Dirección permitida

```text
src/app -> src/features -> src/domain
                 |              ^
                 v              |
               src/ui     src/data, src/services
```

- `src/app` declara rutas y layouts. Puede importar pantallas públicas de `src/features`, pero no contiene reglas de negocio.
- `src/features` organiza pantallas y casos de uso. Puede importar `src/domain`, `src/ui` y contratos públicos de datos o servicios.
- `src/domain` contiene entidades, reglas, cálculos y contratos sin depender de React Native, Expo, almacenamiento ni red.
- `src/data` implementa repositorios, persistencia y sincronización definidos por contratos del dominio o de los casos de uso.
- `src/services` adapta capacidades externas y de plataforma, como sesión segura, PDF o compartición.
- `src/ui` contiene tokens y componentes reutilizables sin conocimiento de compras, ventas, inventario o cuentas.

## Reglas de implementación

1. Las rutas exportan pantallas; no construyen consultas ni calculan resultados comerciales.
2. Los componentes de `src/ui` reciben datos y eventos mediante propiedades; no importan módulos de negocio.
3. El dominio usa TypeScript puro y representa dinero, peso y saldos con tipos y operaciones verificables cuando sus reglas SDD estén aprobadas.
4. Las dependencias de almacenamiento, red y dispositivo entran por adaptadores. Ningún caso de uso importa una implementación concreta si necesita funcionar sin conexión o ser probado de forma aislada.
5. Una excepción requiere una decisión de arquitectura registrada antes de incorporarse.

## Verificación automática

`eslint.config.js` aplica restricciones por carpeta mediante `no-restricted-imports`. El control cubre importaciones con el alias `@/` y rutas relativas que intenten saltar entre capas. `npm run lint` y `npm run check` fallan cuando una dependencia contradice estas reglas.

La restricción no sustituye la revisión arquitectónica: valida la dirección de las importaciones, mientras que la revisión comprueba que las responsabilidades también permanezcan en su capa.
